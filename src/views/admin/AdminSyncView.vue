<script setup>
import { ref } from 'vue'
import { db } from '@/firebase'
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { useApi } from '@/composables/useApi'

const seasonId = Number(import.meta.env.VITE_SEASON_ID)
const { getStandingsBySeason, getTeamsBySeason, getFixturesBySeason } = useApi()

const loading = ref(false)
const msg = ref('')

// zapsat timestamp poslední synchronizace
async function writeLastSync(area) {
  // ⚠ kolekce musí být bez lomítka uprostřed
  const baseCol = collection(db, 'meta_lastSync')
  const b = writeBatch(db)
  b.set(doc(baseCol, area), { area, ts: serverTimestamp() }, { merge: true })
  await b.commit()
}

// =============== STANDINGS ===============
async function syncStandings() {
  loading.value = true
  msg.value = ''
  try {
    const { data } = await getStandingsBySeason(seasonId)
    const table =
      data?.data?.[0]?.standings?.data ||
      data?.data?.[0]?.standings?.[0]?.data ||
      []

    const batch = writeBatch(db)
    const baseCol = collection(db, 'sync/standings/table')

    table.forEach((row) => {
      const teamId = row?.team_id || row?.team?.id
      if (!teamId) return
      const payload = {
        team_id: teamId,
        position: row.position ?? null,
        points: row.points ?? null,
        played: row.overall?.games_played ?? row.played ?? null,
        won: row.overall?.won ?? null,
        draw: row.overall?.draw ?? null,
        lost: row.overall?.lost ?? null,
        goals_for: row.overall?.goals_scored ?? row.goals_for ?? null,
        goals_against: row.overall?.goals_against ?? row.goals_against ?? null,
        updatedAt: serverTimestamp(),
      }
      batch.set(doc(baseCol, String(teamId)), payload, { merge: true })
    })

    await batch.commit()
    await writeLastSync('standings')
    msg.value = `Standings hotovo: ${table.length} řádků`
  } catch (e) {
    console.error(e)
    msg.value = e?.message || 'Chyba synchronizace standings'
  } finally {
    loading.value = false
  }
}

// =============== TEAMS (se stránkováním) ===============
async function syncTeams() {
  loading.value = true
  msg.value = ''
  try {
    let page = 1
    let total = 0

    while (true) {
      const { data } = await getTeamsBySeason(seasonId, page)
      const items = data?.data || []
      if (!items.length) break

      const batch = writeBatch(db)
      const baseCol = collection(db, 'sync/teams/list')

      items.forEach((t) => {
        const payload = {
          id: t.id,
          name: t.name ?? null,
          short_code: t.short_code ?? null,
          logo: t.image_path ?? null,
          country: t?.country?.name ?? null,
          venue: t?.venue?.name ?? null,
          updatedAt: serverTimestamp(),
        }
        batch.set(doc(baseCol, String(t.id)), payload, { merge: true })
      })

      await batch.commit()
      total += items.length
      page++
    }

    await writeLastSync('teams')
    msg.value = `Teams hotovo: ${total} týmů`
  } catch (e) {
    console.error(e)
    msg.value = e?.message || 'Chyba synchronizace teams'
  } finally {
    loading.value = false
  }
}

// =============== FIXTURES (se stránkováním) ===============
async function syncFixtures() {
  loading.value = true
  msg.value = ''
  try {
    let page = 1
    let total = 0

    while (true) {
      const { data } = await getFixturesBySeason(seasonId, page)
      const items = data?.data || []
      if (!items.length) break

      const batch = writeBatch(db)
      const baseCol = collection(db, 'sync/fixtures/list')

      items.forEach((f) => {
        let homeId = null, awayId = null
        const parts = f?.participants || f?.participants?.data || []
        parts.forEach((p) => {
          const loc = p?.meta?.location || p?.meta?.data?.location
          if (loc === 'home') homeId = p?.id || p?.participant_id
          if (loc === 'away') awayId = p?.id || p?.participant_id
        })

        const payload = {
          id: f.id,
          date: f.starting_at ?? f.start_at ?? null,
          round: f?.round?.name ?? null,
          home_id: homeId,
          away_id: awayId,
          scores: f?.scores ?? null,
          status: f?.state ?? f?.status ?? null,
          updatedAt: serverTimestamp(),
        }
        batch.set(doc(baseCol, String(f.id)), payload, { merge: true })
      })

      await batch.commit()
      total += items.length
      page++
    }

    await writeLastSync('fixtures')
    msg.value = `Fixtures hotovo: ${total} zápasů`
  } catch (e) {
    console.error(e)
    msg.value = e?.message || 'Chyba synchronizace fixtures'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2>Admin → Sync</h2>
    <p>Sezóna: {{ seasonId }}</p>

    <div style="display:flex; gap:12px; flex-wrap:wrap; margin:12px 0">
      <button :disabled="loading" @click="syncStandings">Sync STANDINGS → Firestore</button>
      <button :disabled="loading" @click="syncTeams">Sync TEAMS → Firestore</button>
      <button :disabled="loading" @click="syncFixtures">Sync FIXTURES → Firestore</button>
    </div>

    <p>{{ msg }}</p>
  </div>
</template>
