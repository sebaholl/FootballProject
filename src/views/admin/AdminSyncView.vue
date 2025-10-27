<script setup>
import { ref } from 'vue'
import { db } from '@/firebase'
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { useApi } from '@/composables/useApi'

// ====== KONFIG (.env) ======
const seasonId   = Number(import.meta.env.VITE_SEASON_ID || 0)
const LEAGUE_ID  = Number(import.meta.env.VITE_LEAGUE_ID || 0)
const PER_PAGE   = Number(import.meta.env.VITE_PER_PAGE || 200)
const SYNC_ROUNDS = (import.meta.env.VITE_SYNC_ROUNDS || '1,2,3,4,5,6,7')
  .split(',')
  .map(n => Number(n.trim()))
  .filter(Boolean)

// API aliasy
const { getTeamSchedule, getStandingsBySeason, getTeamsBySeason } = useApi()

const loading = ref(false)
const msg = ref('')

// zapsat timestamp poslední synchronizace
async function writeLastSync(area) {
  const baseCol = collection(db, 'meta_lastSync')
  const b = writeBatch(db)
  b.set(doc(baseCol, area), { area, ts: serverTimestamp() }, { merge: true })
  await b.commit()
}

// =============== STANDINGS (v3 + details.type) ===============
async function syncStandings() {
  if (!seasonId) { msg.value = '❌ Chybí VITE_SEASON_ID v .env'; return }
  loading.value = true
  msg.value = ''
  try {
    const res = await getStandingsBySeason(seasonId, {
      include: 'participant;details.type',
    })

    const raw =
      res?.data?.[0]?.standings?.data ||
      res?.data?.[0]?.standings ||
      res?.data ||
      []

    if (!Array.isArray(raw) || raw.length === 0) {
      msg.value = '⚠️ API nevrátilo žádná standings data'
      return
    }

    const batch = writeBatch(db)
    const baseCol = collection(db, 'sync', 'standings', 'table')
    let written = 0

    raw.forEach((row) => {
      const teamId =
        row?.participant_id ??
        row?.participant?.id ??
        row?.team_id ??
        row?.team?.id ??
        null
      if (!teamId) return

      const detailsArr = Array.isArray(row?.details)
        ? row.details
        : (row?.details?.data || [])

      const findStat = (code) =>
        detailsArr.find((d) => d?.type?.code === code)?.value ?? null

      const played = findStat('overall-games-played')
      const won    = findStat('overall-won')
      const draw   = findStat('overall-draw')
      const lost   = findStat('overall-lost')
      const gf     = findStat('overall-goals-for')
      const ga     = findStat('overall-goals-against')
      const pts    = row?.points ?? findStat('total-points')

      const payload = {
        team_id: teamId,
        position: row?.position ?? null,
        points: pts ?? null,
        played: played ?? null,
        won: won ?? null,
        draw: draw ?? null,
        lost: lost ?? null,
        goals_for: gf ?? null,
        goals_against: ga ?? null,
        goal_diff: (gf ?? 0) - (ga ?? 0),
        updatedAt: serverTimestamp(),
      }

      batch.set(doc(baseCol, String(teamId)), payload, { merge: true })
      written++
    })

    await batch.commit()
    await writeLastSync('standings')
    msg.value = `✅ Standings hotovo: ${written} řádků (včetně statistik)`
  } catch (e) {
    console.error('[Sync standings error]', e)
    msg.value = e?.message || '❌ Chyba synchronizace standings'
  } finally {
    loading.value = false
  }
}

// =============== TEAMS (jen pro danou sezónu, pagination) ===============
async function syncTeams() {
  if (!seasonId) { msg.value = '❌ Chybí VITE_SEASON_ID v .env'; return }
  loading.value = true
  msg.value = ''
  try {
    let page = 1
    let total = 0

    while (true) {
      const res = await getTeamsBySeason(seasonId, { page, per_page: PER_PAGE })
      const items = res?.data || []
      if (!items.length) break

      const batch = writeBatch(db)
      const baseCol = collection(db, 'sync', 'teams', 'list')

      items.forEach((t) => {
        batch.set(doc(baseCol, String(t.id)), {
          id: t.id,
          name: t?.name ?? null,
          short_code: t?.short_code ?? null,
          logo: t?.image_path ?? null,
          country: t?.country?.name ?? null,
          venue: t?.venue?.name ?? null,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      })

      await batch.commit()
      total += items.length
      if (items.length < PER_PAGE) break
      page++
    }

    await writeLastSync('teams')
    msg.value = `✅ Teams hotovo: ${total} týmů`
  } catch (e) {
    console.error('[Sync teams error]', e)
    msg.value = e?.message || '❌ Chyba synchronizace teams'
  } finally {
    loading.value = false
  }
}

// =============== FIXTURES (ze schedules endpointu: rounds[].fixtures[]) ===============
async function syncFixtures() {
  if (!seasonId) {
    msg.value = '❌ Chybí VITE_SEASON_ID v .env'
    return
  }

  loading.value = true
  msg.value = ''

  // ⬇️ správná extrakce: stage.rounds[].fixtures[]
  const extractFixturesFromSchedule = (res) => {
    const out = []
    const stages = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : [])
    stages.forEach(st => {
      const rounds = Array.isArray(st?.rounds) ? st.rounds : (st?.rounds?.data || [])
      rounds.forEach(r => {
        const fx = Array.isArray(r?.fixtures) ? r.fixtures : (r?.fixtures?.data || [])
        fx.forEach(f => out.push({ ...f, __round_name: r?.name }))
      })
    })
    return out
  }

  try {
    const baseCol = collection(db, 'sync', 'fixtures', 'list')

    // 1) načteme už nasyncované týmy
    const teamsSnap = await getDocs(collection(db, 'sync', 'teams', 'list'))
    if (teamsSnap.empty) {
      msg.value = '⚠️ Žádné týmy v DB — spusť nejdřív Sync TEAMS'
      loading.value = false
      return
    }

    const teams = teamsSnap.docs.map(d => ({ id: Number(d.id), ...d.data() }))
    const roundsFilter = new Set((Array.isArray(SYNC_ROUNDS) ? SYNC_ROUNDS : []).map(Number).filter(Boolean))
    const leagueId = Number(import.meta.env.VITE_LEAGUE_ID || 0)

    const all = []

    // 2) projdeme týmy a vytáhneme jejich rozpis
    for (const t of teams) {
      console.log(`📡 Tahám zápasy pro tým ${t.name || ''} (${t.id})`)
      let res
      try {
        // schedules (season-scoped) – endpoint je bez include
        res = await getTeamSchedule(t.id, seasonId)
      } catch (e) {
        console.warn(`⚠️ Schedule selhal pro tým ${t.id}`, e?.response?.data || e?.message || e)
        continue
      }

      const fixtures = extractFixturesFromSchedule(res)

      fixtures.forEach(f => {
        // filtruj na správnou ligu/sezónu (pokud jsou na položce k dispozici)
        if (leagueId && f.league_id && Number(f.league_id) !== leagueId) return
        if (seasonId && f.season_id && Number(f.season_id) !== seasonId) return

        // filtr kol (1–7 apod.) — pokud je definován
        if (roundsFilter.size) {
          const rNum = Number(f.__round_name)
          if (!roundsFilter.has(rNum)) return
        }

        all.push(f)
      })
    }

    // 3) deduplikace podle fixture.id
    const byId = new Map()
    all.forEach(f => { if (f?.id && !byId.has(f.id)) byId.set(f.id, f) })
    const unique = [...byId.values()]
    console.log(`🧮 Celkem unikátních zápasů: ${unique.length}`)

    // 4) zápis do Firestore
    let written = 0
    let batch = writeBatch(db)

    const commitIfNeeded = async () => {
      if (written > 0 && written % 450 === 0) {
        await batch.commit()
        batch = writeBatch(db)
      }
    }

    for (const f of unique) {
      const parts = Array.isArray(f?.participants) ? f.participants : (f?.participants?.data || [])
      let home = null, away = null
      for (const p of parts) {
        const loc = p?.meta?.location || p?.meta?.data?.location
        if (loc === 'home') home = p
        if (loc === 'away') away = p
      }

      const start = f?.starting_at || f?.start_at || null

      batch.set(doc(baseCol, String(f.id)), {
        id: f.id,
        league_id: f?.league_id ?? null,
        season_id: f?.season_id ?? null,
        round_id: f?.round_id ?? null,
        round: f?.__round_name ?? null,
        name: f?.name ?? null,
        date: start ? Timestamp.fromDate(new Date(start)) : null,
        home_id: home?.id ?? null,
        home_name: home?.name ?? null,
        away_id: away?.id ?? null,
        away_name: away?.name ?? null,
        status: (f?.state?.name || f?.state || 'scheduled')?.toString().toLowerCase(),
        scores: f?.scores ?? null,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      written++
      await commitIfNeeded()
    }

    await batch.commit()
    await writeLastSync('fixtures')

    msg.value = `✅ Fixtures hotovo: ${written} zápasů (nalezeno ${all.length}, deduplikováno podle id)`
    console.log(`✅ Fixtures sync done: ${written} zápasů`)
  } catch (e) {
    console.error('[Sync fixtures error]', e)
    msg.value = e?.message || '❌ Chyba synchronizace fixtures'
  } finally {
    loading.value = false
  }
}






</script>

<template>
  <div style="padding:16px;">
    <h2>Admin → Sync</h2>
    <p>
      Sezóna: {{ seasonId }}
      · Liga: {{ LEAGUE_ID }}
      · Kola: {{ SYNC_ROUNDS.join(', ') }}
      · PER_PAGE: {{ PER_PAGE }}
    </p>

    <div style="display:flex; gap:12px; flex-wrap:wrap; margin:12px 0">
      <button :disabled="loading" @click="syncStandings">Sync STANDINGS → Firestore</button>
      <button :disabled="loading" @click="syncTeams">Sync TEAMS → Firestore</button>
      <button :disabled="loading" @click="syncFixtures">Sync FIXTURES (1–7) → Firestore</button>


    </div>

    <p>{{ msg }}</p>
  </div>
</template>
