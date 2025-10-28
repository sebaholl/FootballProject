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
    // 1) Načti standings z SPRÁVNÉ cesty po segmentech
    const qStand = query(
      collection(db, 'sync', 'standings', 'table'),
      orderBy('position', 'asc')
    )
    const snapStand = await getDocs(qStand)
    const list = snapStand.docs.map(d => ({ id: d.id, ...d.data() }))
    rows.value = list

    // Když nic nenašlo, ukaž hint do konzole
    if (!list.length) {
      console.warn('[Standings] 0 řádků. Zkontroluj ve Firestore cestu sync/standings/table a spusť v adminu "Sync STANDINGS".')
      loading.value = false
      return
    }

    // 2) Načti jen týmy, které skutečně potřebujeme (chunks po 10 ID)
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
    err.value = e?.message || 'Chyba načítání tabulky'
  } finally {
    loading.value = false
  }
}

function teamName(id) {
  return teamMap.value.get(String(id))?.name || id
}
function teamLogo(id) {
  return teamMap.value.get(String(id))?.logo || null
}
</script>

<template>
  <section style="padding:24px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2>Standings</h2>

    <p v-if="loading">Načítám…</p>
    <p v-else-if="err" style="color:#c00">{{ err }}</p>

    <table v-else style="width:100%; border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd">Poz.</th>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd">Tým</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">Z</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">V</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">R</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">P</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">GF</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">GA</th>
          <th style="text-align:right; padding:8px; border-bottom:1px solid #ddd">Body</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td style="padding:8px; border-bottom:1px solid #eee">{{ r.position ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px">
            <img v-if="teamLogo(r.team_id)" :src="teamLogo(r.team_id)" alt="" style="width:20px;height:20px;object-fit:contain" />
            <span>{{ teamName(r.team_id) }}</span>
          </td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.played ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.won ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.draw ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.lost ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.goals_for ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.goals_against ?? '—' }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right; font-weight:700">{{ r.points ?? '—' }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && !err && rows.length === 0" style="margin-top:12px">
      Žádná data – otevři Admin → Sync a spusť „Sync STANDINGS“ a „Sync TEAMS“.
    </p>
  </section>
</template>
