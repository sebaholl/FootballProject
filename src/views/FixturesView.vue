<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '@/firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'

const fixtures = ref([])
const loading = ref(true)
const err = ref('')
const selectedRound = ref('') // 👈 přidaný výběr kola

// Pomocná: Firestore Timestamp | ISO string -> Date
function toDate(d) {
  if (!d) return null
  if (typeof d === 'string' || d instanceof String) return new Date(d)
  if (typeof d?.toDate === 'function') return d.toDate()
  if (typeof d?.seconds === 'number') return new Date(d.seconds * 1000)
  return new Date(d)
}

// Načtení dat z Firestore
async function load() {
  loading.value = true
  err.value = ''
  try {
    const q = query(
      collection(db, 'sync', 'fixtures', 'list'),
      orderBy('date', 'asc')
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    fixtures.value = list
  } catch (e) {
    console.error(e)
    err.value = e?.message || 'Chyba načítání zápasů'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Normalizace statusu
function normStatus(s) {
  return String(s || 'scheduled').toLowerCase()
}

// Filtrace podle statusu
const upcoming = computed(() =>
  fixtures.value.filter((f) => {
    const st = normStatus(f.status)
    return !['finished', 'ft', 'postponed', 'cancelled'].includes(st)
  })
)

const finished = computed(() =>
  fixtures.value.filter((f) => {
    const st = normStatus(f.status)
    return ['finished', 'ft'].includes(st)
  })
)

// ✅ Filtrované zápasy podle vybraného kola
const filteredUpcoming = computed(() => {
  if (!selectedRound.value) return upcoming.value
  return upcoming.value.filter((f) => f.round?.includes(selectedRound.value))
})

const filteredFinished = computed(() => {
  if (!selectedRound.value) return finished.value
  return finished.value.filter((f) => f.round?.includes(selectedRound.value))
})
</script>

<template>
  <section style="padding:24px">
    <h2>Zápasy (Fixtures)</h2>

    <p v-if="loading">Načítám…</p>
    <p v-else-if="err" style="color:#c00">{{ err }}</p>

    <div v-else>
      <!-- 👇 Přidaný výběr kola -->
      <div style="margin-bottom: 20px;">
        <label for="round">Vyber kolo: </label>
        <select id="round" v-model="selectedRound">
          <option value="">Všechna kola</option>
          <option v-for="n in 7" :key="n" :value="n">Kolo {{ n }}</option>
        </select>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px">
        <div>
          <h3>Nadcházející</h3>
          <ul>
            <li
              v-for="f in filteredUpcoming"
              :key="f.id"
              style="padding:8px 0; border-bottom:1px solid #eee"
            >
              <strong>{{ toDate(f.date)?.toLocaleString() }}</strong><br />
              {{ f.home_name ?? f.home_id }} vs {{ f.away_name ?? f.away_id }}
              ({{ f.status || 'scheduled' }})<br />
              <small>{{ f.round }}</small>
            </li>
          </ul>
        </div>

        <div>
          <h3>Odehrané</h3>
          <ul>
            <li
              v-for="f in filteredFinished"
              :key="f.id"
              style="padding:8px 0; border-bottom:1px solid #eee"
            >
              <strong>{{ toDate(f.date)?.toLocaleString() }}</strong><br />
              {{ f.home_name ?? f.home_id }} vs {{ f.away_name ?? f.away_id }} —
              <span v-if="f.scores">
                {{ f.scores?.ft_home ?? f.scores?.home ?? '–' }}
                :
                {{ f.scores?.ft_away ?? f.scores?.away ?? '–' }}
              </span>
              <span v-else>bez skóre</span><br />
              <small>{{ f.round }}</small>
            </li>
          </ul>
        </div>
      </div>

      <p
        v-if="!loading && !err && fixtures.length === 0"
        style="margin-top:12px"
      >
        Žádná data – spusť Sync Fixtures v adminu.
      </p>
    </div>
  </section>
</template>


