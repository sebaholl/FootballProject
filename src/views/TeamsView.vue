<script setup>
import { ref, onMounted } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const teams = ref([])
const loading = ref(true)
const err = ref('')
const router = useRouter()

onMounted(async () => {
  try {
    const snap = await getDocs(collection(db, 'sync/teams/list'))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a,b) => (a.name || '').localeCompare(b.name || ''))
    teams.value = list
  } catch (e) {
    err.value = e?.message || 'Chyba načítání týmů'
  } finally {
    loading.value = false
  }
})

function openTeam(id) {
  router.push({ name: 'team', params: { id } })
}
</script>

<template>
  <section style="padding:24px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2>Teams</h2>
    <p v-if="loading">Načítám…</p>
    <p v-else-if="err" style="color:#c00">{{ err }}</p>

    <div v-else style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:16px">
      <button
        v-for="t in teams"
        :key="t.id"
        @click="openTeam(t.id)"
        style="display:flex; flex-direction:column; gap:8px; align-items:center; padding:12px; border:1px solid #eee; border-radius:12px; background:#fff; cursor:pointer"
      >
        <img v-if="t.logo" :src="t.logo" alt="" style="width:56px; height:56px; object-fit:contain" />
        <div style="font-weight:600">{{ t.name }}</div>
      </button>
    </div>

    <p v-if="!loading && !err && teams.length === 0" style="margin-top:12px">Žádná data – spusť Sync Teams v adminu.</p>
  </section>
</template>
