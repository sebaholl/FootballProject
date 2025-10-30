<script setup>
import { ref, onMounted } from 'vue'
import { db } from '@/firebase'
import {
  collection, query, orderBy, getDocs,
  where, documentId
} from 'firebase/firestore'

const rows = ref([])
const teamMap = ref(new Map()) // id -> { name, logo }
const loading = ref(true)
const err = ref('')

onMounted(load)

async function load() {
  loading.value = true
  err.value = ''
  try {
    // 1️⃣ Načti standings z Firestore
    const qStand = query(
      collection(db, 'sync', 'standings', 'table'),
      orderBy('position', 'asc')
    )
    const snapStand = await getDocs(qStand)
    const list = snapStand.docs.map(d => ({ id: d.id, ...d.data() }))
    rows.value = list

    // Pokud nic nenašlo, vypiš varování
    if (!list.length) {
      console.warn('No standings found.')
      loading.value = false
      return
    }

    // 2️⃣ Načti týmy, které se v tabulce reálně nacházejí
    const ids = list.map(r => String(r.team_id)).filter(Boolean)
    const map = new Map()
    const chunkSize = 10
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      const qTeams = query(
        collection(db, 'sync', 'teams', 'list'),
        where(documentId(), 'in', chunk)
      )
      const snapTeams = await getDocs(qTeams)
      snapTeams.forEach(docu => {
        const t = docu.data()
        map.set(String(docu.id), {
          name: t?.name ?? String(docu.id),
          logo: t?.logo ?? null,
        })
      })
    }
    teamMap.value = map
  } catch (e) {
    console.error(e)
    err.value = e?.message || 'Failed to load standings data'
  } finally {
    loading.value = false
  }
}

// 🏷️ Helper functions pro týmové údaje
function teamName(id) {
  return teamMap.value.get(String(id))?.name || id
}
function teamLogo(id) {
  return teamMap.value.get(String(id))?.logo || null
}

function rowHighlight(pos) {
  if (!pos) return ''
  if (pos <= 4) return 'zone-cl'       // Champions League
  if (pos <= 6) return 'zone-el'       // Europa League
  if (pos >= 18) return 'zone-rel'     // Relegation zone
  return ''
}
</script>


<template>
  <section class="standings-wrap">
    <h2>Standings</h2>

    <p v-if="loading">Loading…</p>
    <p v-else-if="err" class="error">{{ err }}</p>

    <table v-else class="standings-table">
      <thead>
        <tr>
          <th>Position</th>
          <th>Team</th>
          <th>M</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>Pts</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="r in rows"
          :key="r.id"
          :class="rowHighlight(r.position)"
        >
          <td>{{ r.position ?? '—' }}</td>
          <td class="team-cell">
            <img
              v-if="teamLogo(r.team_id)"
              :src="teamLogo(r.team_id)"
              alt=""
              class="team-logo"
            />
            <span>{{ teamName(r.team_id) }}</span>
          </td>
          <td>{{ r.played ?? '—' }}</td>
          <td>{{ r.won ?? '—' }}</td>
          <td>{{ r.draw ?? '—' }}</td>
          <td>{{ r.lost ?? '—' }}</td>
          <td>{{ r.goals_for ?? '—' }}</td>
          <td>{{ r.goals_against ?? '—' }}</td>
          <td class="points">{{ r.points ?? '—' }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && !err && rows.length === 0" class="no-data">
      No data – Open Admin → Sync and run "Sync STANDINGS" and "Sync TEAMS".
    </p>
  </section>
</template>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&display=swap');

.standings-wrap {
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  font-family: "Roboto Condensed", sans-serif;
}

h2 {
  margin-bottom: 16px;
  font-weight: 700;
  font-size: 1.4rem;
  color: #111;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  border-radius: 8px;
  overflow: hidden;
}

/* headers */
th {
  padding: 10px 8px;
  border-bottom: 2px solid #ddd;
  color: #111;
  font-weight: 700;
  background: #f9fafb;
  text-align: center;
}

/* default cell style */
td {
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
  text-align: center;
  color: #111;
  transition: background 0.2s ease, transform 0.15s ease;
}

/* left align for first two columns */
th:first-child,
td:first-child,
th:nth-child(2),
td:nth-child(2) {
  text-align: left;
}

/* alternating row colors */
tbody tr:nth-child(odd) {
  background: #f9fafb;
}
tbody tr:nth-child(even) {
  background: #fff;
}

/* hover highlight */
tbody tr:hover {
  background: #eef6ff;
  transform: translateY(-1px);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.05);
}

/* logo & team cell */
.team-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.team-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* points highlight */
.points {
  font-weight: 700;
  color: #111827;
}

/* highlight zones */
.zone-cl {
  background: #ecfdf5 !important; /* green tint */
  border-left: 4px solid #10b981;
}
.zone-el {
  background: #fefce8 !important; /* yellow tint */
  border-left: 4px solid #f59e0b;
}
.zone-rel {
  background: #fef2f2 !important; /* red tint */
  border-left: 4px solid #dc2626;
}

/* subtle hover on zones too */
.zone-cl:hover {
  background: #d1fae5 !important;
}
.zone-el:hover {
  background: #fef3c7 !important;
}
.zone-rel:hover {
  background: #fee2e2 !important;
}

/* messages */
.error {
  color: #c00;
  font-weight: 700;
}
.no-data {
  margin-top: 12px;
  color: #555;
  opacity: 0.8;
}
</style>
