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

// =============== FIXTURES (získáme pro každý tým ze seznamu týmů) ===============
async function syncFixtures() {
  if (!seasonId) { msg.value = '❌ Chybí VITE_SEASON_ID v .env'; return }
  loading.value = true
  msg.value = ''

  try {
    let allFixtures = []

    // vezmeme všechny týmy z Firestore (abychom věděli, pro koho tahat)
    const teamsSnap = await getDocs(collection(db, 'sync', 'teams', 'list'))
    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    for (const team of teams) {
      console.log(`📡 Tahám zápasy pro tým ${team.name} (${team.id})`)
      const res = await getTeamSchedule(team.id, seasonId)
      const data = res?.data || res // SportMonks může vracet buď {data:[]} nebo []

      // 💡 Tady je klíčová část – rozbalíme fixtures z každého schedule
      const fixtures = []
      data.forEach(sch => {
        if (Array.isArray(sch.fixtures)) {
          fixtures.push(...sch.fixtures)
        }
      })

      if (fixtures.length) {
        allFixtures.push(...fixtures)
      }
    }

    if (!allFixtures.length) {
      msg.value = '⚠️ API nevrátilo žádné fixtures'
      console.log('[Fixtures debug]', allFixtures)
      return
    }

    // odstraníme duplikáty podle ID
    const uniqueFixtures = Object.values(Object.fromEntries(allFixtures.map(f => [f.id, f])))

    const batch = writeBatch(db)
    const baseCol = collection(db, 'sync', 'fixtures', 'list')

    uniqueFixtures.forEach(f => {
      batch.set(doc(baseCol, String(f.id)), {
        id: f.id,
        name: f?.name ?? null,
        date: f?.starting_at ? Timestamp.fromDate(new Date(f.starting_at)) : null,
        venue_id: f?.venue_id ?? null,
        round_id: f?.round_id ?? null,
        league_id: f?.league_id ?? null,
        status: f?.state_id ?? null,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    await batch.commit()
    await writeLastSync('fixtures')
    msg.value = `✅ Fixtures hotovo: ${uniqueFixtures.length} zápasů (nalezeno ${allFixtures.length}, deduplikováno podle id)`
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
