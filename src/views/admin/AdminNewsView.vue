<!-- src/views/admin/AdminNewsView.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useNews } from '../../composables/useNews'

const { list, create, update, remove } = useNews()
const items = ref([])
const form = ref({ id:null, title:'', body:'', imageUrl:'', publishedAt:'' })
const loading = ref(false)
const err = ref('')

const titleMax = 120
const bodyMax = 10000

const titleLen = computed(()=> form.value.title.length)
const bodyLen = computed(()=> form.value.body.length)
const canSubmit = computed(()=>{
  return !loading.value
    && form.value.title.trim().length >= 1 && form.value.title.trim().length <= titleMax
    && form.value.body.trim().length >= 1 && form.value.body.trim().length <= bodyMax
    && (form.value.imageUrl.trim()==='' || isValidUrl(form.value.imageUrl))
})

function isValidUrl(u){
  try{ const x = new URL(u); return ['http:','https:'].includes(x.protocol) }catch{ return false }
}

function toTimestampOrNull(dt){
  // 'YYYY-MM-DDTHH:mm' → Timestamp (server side overwrites on create, but for update we want to keep)
  return dt ? new Date(dt) : null
}
function fromTimestamp(ts){
  if(!ts) return ''
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)
  const pad = n=> String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function load() {
  loading.value = true; err.value = ''
  try { items.value = await list() } catch(e){ err.value = e?.message || 'Loading error' }
  finally { loading.value = false }
}

function edit(it){
  form.value = {
    id: it.id,
    title: it.title || '',
    body: it.body || '',
    imageUrl: it.imageUrl || '',
    publishedAt: fromTimestamp(it.publishedAt || it.createdAt)
  }
}
function reset(){
  form.value = { id:null, title:'', body:'', imageUrl:'', publishedAt:'' }
}

async function submit(){
  if(!canSubmit.value) return
  loading.value = true; err.value = ''
  try{
    const payload = {
      title: form.value.title,
      body: form.value.body,
      imageUrl: form.value.imageUrl || null,
      publishedAt: form.value.publishedAt ? toTimestampOrNull(form.value.publishedAt) : null
    }
    if(form.value.id) await update(form.value.id, payload)
    else await create(payload)
    reset(); await load()
  }catch(e){ err.value = e?.message || 'Save error' }
  finally{ loading.value = false }
}

async function del(id){
  if(!confirm('Really delete?')) return
  loading.value = true; err.value = ''
  try{ await remove(id); await load() }catch(e){ err.value = e?.message || 'Delete error' }
  finally{ loading.value = false }
}

onMounted(load)
</script>

<template>
  <section style="padding:24px; max-width:900px; margin:0 auto">
    <h2 style="margin-bottom:8px">Admin – News</h2>
    <p v-if="err" style="color:#c00">{{ err }}</p>

    <form @submit.prevent="submit" style="display:grid; gap:12px; margin:12px 0; border:1px solid #eee; padding:16px; border-radius:12px">
      <div>
        <label>Title ({{ titleLen }}/{{ titleMax }})</label>
        <input v-model="form.title" placeholder="Title" required />
      </div>

      <div>
        <label>Body ({{ bodyLen }}/{{ bodyMax }})</label>
        <textarea v-model="form.body" placeholder="Body (can be longer)" rows="8" required></textarea>
      </div>

      <div>
          <label>Image URL (optional)</label>
          <input v-model="form.imageUrl" placeholder="https://..." />
            <small
            v-if="form.imageUrl && !isValidUrl(form.imageUrl)"
            style="color:#c00"
            >
            Invalid URL
            </small>
            <div
              v-if="form.imageUrl && isValidUrl(form.imageUrl)"
              style="margin-top:8px"
              >
              <img
              :src="form.imageUrl"
              alt="Preview"
              style="max-width:240px; border-radius:8px; border:1px solid #eee"
              />
            </div>
        </div>


      <div>
        <label>Publish date (optional)</label>
        <input type="datetime-local" v-model="form.publishedAt" />
      </div>

      <div style="display:flex; gap:8px">
        <button :disabled="!canSubmit" type="submit">{{ form.id ? 'Save changes' : 'Create' }}</button>
        <button :disabled="loading" type="button" @click="reset">Cancel</button>
      </div>
    </form>

    <h3>List</h3>
    <div style="display:grid; gap:12px; margin-top:8px">
      <article v-for="it in items" :key="it.id" style="border:1px solid #eee; padding:12px; border-radius:12px; display:flex; gap:12px; align-items:flex-start">
        <img v-if="it.imageUrl" :src="it.imageUrl" alt="" style="width:96px; height:96px; object-fit:cover; border-radius:8px; border:1px solid #eee" />
        <div style="flex:1">
          <strong style="display:block; font-size:1.05rem">{{ it.title }}</strong>
          <small style="opacity:.7">Published: {{ (it.publishedAt?.toDate?.() || it.createdAt?.toDate?.() || new Date()).toLocaleString() }}</small>
          <p style="margin:6px 0 0">{{ (it.body || '').slice(0,160) }}{{ (it.body||'').length>160 ? '…' : '' }}</p>
          <div style="display:flex; gap:8px; margin-top:8px">
            <button :disabled="loading" @click="edit(it)">Edit</button>
            <button :disabled="loading" @click="del(it.id)">Delete</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
label{ display:block; margin-bottom:4px; font-weight:600 }
input, textarea{ width:100%; padding:10px; border:1px solid #ddd; border-radius:10px }
button{ padding:8px 12px; border:1px solid #ddd; border-radius:10px; cursor:pointer; background:#fafafa }
button[disabled]{ opacity:.6; cursor:not-allowed }
</style>
