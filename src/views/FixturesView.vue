<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '@/firebase'
import { collection, query, orderBy, getDocs, where, documentId } from 'firebase/firestore'

const fixtures = ref([])
const teamMap  = ref(new Map())
const loading  = ref(true)
const err      = ref('')
const selectedRound = ref('') // '' = všechna, jinak "1".."7"

onMounted(load)

function toDate(d) {
  if (!d) return null
  if (typeof d === 'string') return new Date(d)
  if (typeof d?.toDate === 'function') return d.toDate()
  if (typeof d?.seconds === 'number') return new Date(d.seconds * 1000)
  return new Date(d)
}
function niceDate(d) {
  const dt = toDate(d); if (!dt) return ''
  return dt.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short', year:'2-digit' })
}
function niceTime(d) {
  const dt = toDate(d); if (!dt) return ''
  return dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
}
function scoresArray(fix) {
  return Array.isArray(fix?.scores) ? fix.scores : (fix?.scores?.data ?? [])
}

/* ---- FINÁLNÍ SKÓRE (robustní) ----
   1) pokud je scores objekt {ft_home, ft_away} apod., použijeme ho
   2) pokud je scores pole, projdeme je a vezmeme poslední známou hodnotu
*/
function finalGoals(fix) {
  // objektové skóre
  if (fix?.scores && !Array.isArray(fix.scores)) {
    const rawH = fix.scores.ft_home ?? fix.scores.home ?? fix.scores.HT_home ?? null
    const rawA = fix.scores.ft_away ?? fix.scores.away ?? fix.scores.HT_away ?? null
    const h = Number.isFinite(Number(rawH)) ? Number(rawH) : null
    const a = Number.isFinite(Number(rawA)) ? Number(rawA) : null
    return { h, a }
  }
  // pole záznamů
  const arr = scoresArray(fix)
  let h = null, a = null
  for (const s of arr) {
    const sc = s?.score
    const g  = Number(sc?.goals)
    const p  = sc?.participant // 'home' | 'away'
    if (Number.isFinite(g)) {
      if (p === 'home') h = g
      if (p === 'away') a = g
    }
  }
  return { h, a }
}

function isFinished(fix) {
  const s = String(fix?.status || '').toLowerCase()
  if (['finished','ft','fulltime'].includes(s)) return true
  const { h, a } = finalGoals(fix)
  return (h !== null && a !== null) || (toDate(fix.date) < new Date())
}

function winnerSide(fix) {
  const { h, a } = finalGoals(fix)
  if (h === null || a === null) return null
  return h > a ? 'home' : (a > h ? 'away' : 'draw')
}

function nameFromMap(id) { return teamMap.value.get(String(id))?.name || String(id) }
function logoFromMap(id) { return teamMap.value.get(String(id))?.logo || null }

async function load() {
  loading.value = true; err.value = ''
  try {
    // fixtures
    const qFx = query(collection(db, 'sync','fixtures','list'), orderBy('date','asc'))
    const snapFx = await getDocs(qFx)
    const fx = snapFx.docs.map(d => ({ id:d.id, ...d.data() }))
    fixtures.value = fx

    // map týmů (pouze ty, které v zápasech reálně jsou)
    const ids = [...new Set(fx.flatMap(f => [String(f.home_id||''), String(f.away_id||'')]).filter(Boolean))]
    const map = new Map()
    for (let i=0; i<ids.length; i+=10) {
      const chunk = ids.slice(i, i+10)
      const qT = query(collection(db,'sync','teams','list'), where(documentId(), 'in', chunk))
      const snapT = await getDocs(qT)
      snapT.forEach(d => {
        const t = d.data()
        map.set(String(d.id), { name: t?.name ?? String(d.id), logo: t?.logo ?? null })
      })
    }
    teamMap.value = map
  } catch (e) {
    console.error(e); err.value = e?.message || 'Chyba načítání zápasů'
  } finally {
    loading.value = false
  }
}

const listSorted = computed(() => {
  const arr = [...fixtures.value]
  arr.sort((a,b) => (toDate(a.date)??0) - (toDate(b.date)??0))
  return arr
})
const filtered = computed(() => {
  if (!selectedRound.value) return listSorted.value
  return listSorted.value.filter(f => String(f.round ?? '').includes(selectedRound.value))
})
</script>

<template>
  <section class="wrap" style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <header class="head">
      <h2>Fixtures</h2>

      <!-- hezčí pill-picker pro 1–7 -->
      <div class="round-picker" role="group" aria-label="Výběr kola">
        <button class="pill" :class="{active: selectedRound === ''}" @click="selectedRound=''">All</button>
        <button v-for="n in 7" :key="n" class="pill" :class="{active: selectedRound === String(n)}" @click="selectedRound = String(n)">
          {{ n }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="muted">Loading...</div>
    <div v-else-if="err" class="err">{{ err }}</div>

    <transition-group name="fade" tag="ul" class="list" v-else>
      <li v-for="f in filtered" :key="f.id" class="card" :class="isFinished(f) ? 'done' : 'upcoming'">
        <div class="meta">
          <span class="badge league">La Liga</span>
          <span v-if="f.round" class="badge round">Round {{ String(f.round).replace(/\D/g,'') || f.round }}</span>
          <span class="date">{{ niceDate(f.date) }}</span>
        </div>

        <div class="row">
          <!-- HOME -->
          <div class="team home" :class="{ win: winnerSide(f)==='home' }">
            <img v-if="logoFromMap(f.home_id)" :src="logoFromMap(f.home_id)" class="crest" alt="" />
            <span class="name">{{ nameFromMap(f.home_id) }}</span>
          </div>

          <!-- SCORE / KICKOFF -->
          <div class="score">
            <template v-if="isFinished(f)">
              <span class="num">{{ finalGoals(f).h ?? '–' }}</span>
              <span class="dash">:</span>
              <span class="num">{{ finalGoals(f).a ?? '–' }}</span>
            </template>
            <template v-else>
              <span class="kickoff">{{ niceTime(f.date) }}</span>
            </template>
          </div>

          <!-- AWAY -->
          <div class="team away" :class="{ win: winnerSide(f)==='away' }">
            <span class="name">{{ nameFromMap(f.away_id) }}</span>
            <img v-if="logoFromMap(f.away_id)" :src="logoFromMap(f.away_id)" class="crest" alt="" />
          </div>
        </div>

        <div class="foot">
          <span class="state" :class="isFinished(f) ? 's-done' : 's-up'">{{ isFinished(f) ? 'Full time' : 'Upcoming' }}</span>
        </div>
      </li>
    </transition-group>

    <p v-if="!loading && !err && !filtered.length" class="muted">Nic k zobrazení – změň filtr kola nebo spusť sync.</p>
  </section>
</template>

<style scoped>
/* základ */
.wrap { padding:24px; color:#ff0030; } /* temná čitelná */
.head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
h2 { margin:0; font-weight:800; }

/* pills */
.round-picker { display:flex; gap:8px; align-items:center; }
.pill {
  border:1px solid #e2e8f0; background:#fff; color:#0f172a;
  padding:8px 12px; border-radius:999px; font-weight:700; cursor:pointer;
  transition: all .18s ease; box-shadow: 0 1px 0 rgba(0,0,0,.03);
}
.pill:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,.07); }
.pill.active { background: #111827; color:#fff; border-color:#111827; }

/* list + anima */
.list { list-style:none; margin:0; padding:0; display:grid; gap:14px; }
.fade-enter-active, .fade-leave-active { transition: all .18s ease; }
.fade-enter-from, .fade-leave-to { opacity:0; transform: translateY(6px); }

/* karty */
.card {
  border:1px solid #e5e7eb; background:#fff; border-radius:16px; padding:14px 16px;
  box-shadow: 0 4px 22px rgba(0,0,0,.04);
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,.08); }
.card.upcoming { background: linear-gradient(0deg,#f4f7ff 0,#fff 46%); }
.card.done     { background: linear-gradient(0deg,#ecfdf5 0,#fff 46%); }



.meta { display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap; }
.badge { font-size:.75rem; padding:4px 8px; border-radius:999px; font-weight:800; letter-spacing:.2px; }
.badge.league { border:1px solid #ddd6fe; background:#f5f3ff; color:#111827; }
.badge.round  { border:1px solid #bfdbfe; background:#eff6ff; color:#111827; }
.date { margin-left:auto; font-weight:700; opacity:.8; color:#111827; }

.row { display:grid; grid-template-columns: 1fr auto 1fr; gap:18px; align-items:center; }

.team { display:flex; align-items:center; gap:10px; font-weight:800; color:#111827; }
.team.away { justify-content:flex-end; }
.team.win .name { color:#0b6b3a; } /* jemné zvýraznění vítěze */
.crest { width:26px; height:26px; object-fit:contain; filter: drop-shadow(0 1px 1px rgba(0,0,0,.05)); }

/* skóre */
.score {
  min-width:110px; display:inline-flex; justify-content:center; align-items:center; gap:10px;
  padding:10px 16px; border-radius:14px; background:#fff; border:1px solid #e5e7eb;
  box-shadow: 0 4px 10px rgba(0,0,0,.06); font-variant-numeric: tabular-nums; color:#0f172a;
}
.num { font-weight:900; font-size:1.05rem; }
.dash { opacity:.55; font-weight:900; }
.kickoff { font-weight:900; color:#111827; }

/* footer */
.foot { margin-top:10px; display:flex; align-items:center; }
.state { margin-left:auto; font-size:.75rem; font-weight:900; letter-spacing:.3px; color:#111827; }
.s-up { color:#1f2937; }
.s-done { color:#065f46; }

.muted { opacity:.75; color:#111827; }
.err { color:#c00; font-weight:800; }

/* EVEN AND ODD*/
.list li:nth-child(even) {
  background-color: #47739e; /* light gray (Tailwind's gray-50) */
}

.list li:nth-child(odd) {
  background-color: #000000; /* white */
}

.list li:hover {
  background-color: #f3f4f6; /* a bit darker on hover */
}

@media (max-width: 860px) {
  .row { grid-template-columns: 1fr; gap:10px; }
  .team.away { justify-content:flex-start; }
}
</style>
