<script setup>
import { ref, onMounted } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const rows = ref([])
const teamMap = ref(new Map()) // id -> { name, logo }
const loading = ref(true)
const err = ref('')

onMounted(load)

async function load() {
  loading.value = true
  err.value = ''
  try {
    // 1) načti standings
    const snap = await getDocs(collection(db, 'sync/standings/table'))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

    // 2) načti teams a udělej mapu id -> {name, logo}
    const ts = await getDocs(collection(db, 'sync/teams/list'))
    const map = new Map()
    ts.forEach((docu) => {
      const t = docu.data()
      map.set(String(t.id || docu.id), { name: t.name, logo: t.logo })
    })
    teamMap.value = map

    rows.value = list
  } catch (e) {
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
  <section style="padding:24px">
    <h2>Tabulka LaLiga</h2>

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
          <td style="padding:8px; border-bottom:1px solid #eee">{{ r.position }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px">
            <img v-if="teamLogo(r.team_id)" :src="teamLogo(r.team_id)" alt="" style="width:20px;height:20px;object-fit:contain" />
            <span>{{ teamName(r.team_id) }}</span>
          </td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.played }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.won }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.draw }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.lost }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.goals_for }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.goals_against }}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right">{{ r.points }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && !err && rows.length === 0" style="margin-top:12px">Zatím nemáme žádná data – spusť Sync v adminu.</p>
  </section>
</template>

