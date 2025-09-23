<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const fixtures = ref([])
const loading = ref(true)
const err = ref('')

onMounted(load)

async function load() {
  loading.value = true
  err.value = ''
  try {
    const snap = await getDocs(collection(db, 'sync/fixtures/list'))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    // seřadíme podle data
    list.sort((a, b) => new Date(a.date) - new Date(b.date))
    fixtures.value = list
  } catch (e) {
    err.value = e?.message || 'Chyba načítání zápasů'
  } finally {
    loading.value = false
  }
}

const upcoming = computed(() => fixtures.value.filter(f => !['finished','FT','postponed','cancelled'].includes(String(f.status).toLowerCase())))
const finished = computed(() => fixtures.value.filter(f => ['finished','ft'].includes(String(f.status).toLowerCase())))
</script>

<template>
  <section style="padding:24px">
    <h2>Zápasy (Fixtures)</h2>
    <p v-if="loading">Načítám…</p>
    <p v-else-if="err" style="color:#c00">{{ err }}</p>

    <div v-else style="display:grid; grid-template-columns: 1fr 1fr; gap:24px">
      <div>
        <h3>Nadcházející</h3>
        <ul>
          <li v-for="f in upcoming" :key="f.id" style="padding:8px 0; border-bottom:1px solid #eee">
            <strong>{{ new Date(f.date).toLocaleString() }}</strong><br />
            {{ f.home_id }} vs {{ f.away_id }} ({{ f.status || 'scheduled' }})
          </li>
        </ul>
      </div>
      <div>
        <h3>Odehrané</h3>
        <ul>
          <li v-for="f in finished" :key="f.id" style="padding:8px 0; border-bottom:1px solid #eee">
            <strong>{{ new Date(f.date).toLocaleString() }}</strong><br />
            {{ f.home_id }} vs {{ f.away_id }} —
            <span v-if="f.scores">{{ f.scores?.ft_home ?? f.scores?.home }} : {{ f.scores?.ft_away ?? f.scores?.away }}</span>
            <span v-else>bez skóre</span>
          </li>
        </ul>
      </div>
    </div>

    <p v-if="!loading && !err && fixtures.length === 0" style="margin-top:12px">Žádná data – spusť Sync Fixtures v adminu.</p>
  </section>
</template>
