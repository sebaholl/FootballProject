<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { db } from '@/firebase'
import { collection, doc, getDoc, getDocs, query, where, limit } from 'firebase/firestore'

const route  = useRoute()
const teamId = String(route.params.id)

const team     = ref(null)
const fixtures = ref([])
const loading  = ref(true)
const err      = ref('')

// ---------- helpers ----------
function toDate(d){
  if (!d) return null
  if (typeof d === 'string') return new Date(d)
  if (typeof d?.toDate === 'function') return d.toDate()
  if (typeof d?.seconds === 'number') return new Date(d.seconds * 1000)
  return new Date(d)
}
function fmtDate(d){
  const dt = toDate(d); if (!dt) return ''
  return dt.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short', year:'2-digit' })
}
function fmtTime(d){
  const dt = toDate(d); if (!dt) return ''
  return dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
}
function scoresArray(f){ return Array.isArray(f?.scores) ? f.scores : (f?.scores?.data ?? []) }
function finalGoals(f) {
  if (f?.scores && !Array.isArray(f.scores)) {
    const rawH = f.scores.ft_home ?? f.scores.home ?? null
    const rawA = f.scores.ft_away ?? f.scores.away ?? null

    const h = Number.isFinite(Number(rawH)) ? Number(rawH) : null
    const a = Number.isFinite(Number(rawA)) ? Number(rawA) : null

    return { h, a }
  }

  // fallback for array structure
  const arr = scoresArray(f)
  let h = null, a = null
  for (const s of arr) {
    const g = Number(s?.score?.goals)
    const p = s?.score?.participant
    if (Number.isFinite(g)) {
      if (p === 'home') h = g
      if (p === 'away') a = g
    }
  }
  return { h, a }
}

function isFinished(f){
  const s = String(f?.status || '').toLowerCase()
  if (['finished','ft','fulltime'].includes(s)) return true
  const { h, a } = finalGoals(f)
  return (h !== null && a !== null) || (toDate(f.date) < new Date())
}
function vsLabel(f, id){
  return String(f.home_id) === String(id) ? 'vs' : 'at'
}
function opponentName(f, id){
  return String(f.home_id) === String(id) ? (f.away_name ?? f.away_id) : (f.home_name ?? f.home_id)
}
function resultForTeam(f, id){
  const { h, a } = finalGoals(f)
  if (h === null || a === null) return null
  const home = String(f.home_id) === String(id)
  const my = home ? h : a
  const op = home ? a : h
  if (my > op) return 'W'
  if (my < op) return 'L'
  return 'D'
}

// ---------- load ----------
onMounted(load)

async function load(){
  loading.value = true
  err.value = ''
  try {
    const tDoc = await getDoc(doc(collection(db, 'sync', 'teams', 'list'), teamId))
    team.value = tDoc.exists() ? tDoc.data() : { id: teamId, name: 'Team ' + teamId }

    // 1) prefer team_ids (bez orderBy → bez indexu)
    let fx = []
    try {
      const q1 = query(
        collection(db, 'sync', 'fixtures', 'list'),
        where('team_ids', 'array-contains', Number(teamId)),
        limit(40)
      )
      const s1 = await getDocs(q1)
      fx = s1.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch {
      // ignnore error
    }

    // 2) fallback: home/away
    if (!fx.length) {
      const qH = query(collection(db, 'sync', 'fixtures', 'list'), where('home_id', '==', Number(teamId)), limit(40))
      const qA = query(collection(db, 'sync', 'fixtures', 'list'), where('away_id', '==', Number(teamId)), limit(40))
      const [sH, sA] = await Promise.all([getDocs(qH), getDocs(qA)])
      fx = [...sH.docs, ...sA.docs].map(d => ({ id: d.id, ...d.data() }))
    }

    fx.sort((a,b) => (toDate(b.date) ?? 0) - (toDate(a.date) ?? 0))
    fixtures.value = fx.slice(0, 30)
  } catch (e) {
    console.error(e)
    err.value = e?.message || 'Failed to load team data'
  } finally {
    loading.value = false
  }
}

const form = computed(() => {
  const out = []
  for (const f of fixtures.value) {
    if (!isFinished(f)) continue
    const r = resultForTeam(f, teamId)
    if (r) out.push(r)
    if (out.length >= 5) break
  }
  return out
})
</script>

<template>
  <section class="wrap">
    <RouterLink to="/fixtures" class="back">← Back</RouterLink>

    <div class="header">
      <img v-if="team?.logo" :src="team.logo" class="crest" alt="" />
      <h1 class="title">{{ team?.name || ('Team '+teamId) }}</h1>
    </div>

    <!-- Recent form -->
    <div class="block">
      <h2 class="block-title">Recent form</h2>
      <div class="form">
        <template v-for="(r, i) in form" :key="i">
          <span class="pill" :class="{
            w: r==='W',
            d: r==='D',
            l: r==='L'
          }">{{ r }}</span>
        </template>
        <span v-if="!form.length" class="muted">No finished matches yet.</span>
      </div>
    </div>

    <!-- Last matches -->
    <div class="card">
      <div class="card-head">Last matches</div>

      <div v-if="loading" class="card-body muted">Loading…</div>
      <div v-else-if="err" class="card-body error">{{ err }}</div>

      <ul v-else class="list">
        <li v-for="f in fixtures" :key="f.id" class="row">
          <div class="cell when">{{ fmtDate(f.date) }} • {{ fmtTime(f.date) }}</div>
          <div class="cell vs" :class="{home: String(f.home_id)===teamId}">
            {{ vsLabel(f, teamId) }}
          </div>
          <div class="cell opp">
            {{ opponentName(f, teamId) }}
          </div>
          <div class="cell score">
            <template v-if="isFinished(f)">
              {{ finalGoals(f).h ?? '–' }} : {{ finalGoals(f).a ?? '–' }}
            </template>
            <template v-else>
              <span class="muted">{{ fmtTime(f.date) }}</span>
            </template>
          </div>
          <div class="cell res">
            <span v-if="isFinished(f)" class="pill tiny"
              :class="{
                w: resultForTeam(f, teamId)==='W',
                d: resultForTeam(f, teamId)==='D',
                l: resultForTeam(f, teamId)==='L'
              }">
              {{ resultForTeam(f, teamId) }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
/* layout */
.wrap{max-width:960px;margin:0 auto;padding:24px 16px;color:#0f172a}
.back{display:inline-block;margin-bottom:16px;text-decoration:none;color:#e11d48;font-weight:600}
.back:hover{color:#be123c}

.header{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.crest{width:64px;height:64px;object-fit:contain}
.title{margin:0;font-size:32px;line-height:1.1;font-weight:800}

/* blocks */
.block{margin:24px 0 16px}
.block-title{margin:0 0 8px;font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.02em}

/* form pills */
.form{display:flex;gap:8px;align-items:center;min-height:40px}
.pill{display:inline-grid;place-items:center;border-radius:999px;color:#fff;font-weight:800}
.pill.w{background:#059669}
.pill.d{background:#64748b}
.pill.l{background:#e11d48}
.pill{width:32px;height:32px;font-size:12px}
.pill.tiny{width:24px;height:24px;font-size:11px}

/* card/list */
.card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.05);overflow:hidden}
.card-head{padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:700}
.card-body{padding:14px}

.list{list-style:none;margin:0;padding:0}
.row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #f1f5f9}
.row:last-child{border-bottom:0}

.cell{font-size:14px}
.when{width:210px;color:#475569}
.vs{width:40px;text-transform:uppercase;font-weight:700;color:#64748b}
.vs.home{color:#065f46}
.opp{flex:1;font-weight:600}
.score{width:68px;text-align:center;font-weight:800}
.res{width:40px;text-align:center}

.muted{color:#64748b}
.error{color:#b91c1c;font-weight:700}
</style>
