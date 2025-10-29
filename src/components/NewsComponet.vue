<!-- src/views/NewsListView.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useNews } from '../composables/useNews'
import { useRouter } from 'vue-router'

const { list } = useNews()
const items = ref([])
const loading = ref(true)
const err = ref('')
const router = useRouter()

function open(id){ router.push({ name:'newsDetail', params:{ id } }) }

onMounted(async () => {
  try { items.value = await list() } catch(e){ err.value = e?.message || 'Loading error' }
  finally { loading.value = false }
})
</script>

<template>
  <section style="padding:24px; max-width:1000px; margin:0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="margin-bottom:12px">News</h2>
    <p v-if="err" style="color:#c00">{{ err }}</p>

    <!-- Skeleton -->
    <div v-if="loading" style="display:grid; gap:12px">
      <div v-for="i in 3" :key="i" style="border:1px solid #eee; padding:12px; border-radius:12px">
        <div style="height:16px; background:#f3f3f3; border-radius:6px; width:40%"></div>
        <div style="height:12px; background:#f3f3f3; border-radius:6px; width:70%; margin-top:8px"></div>
        <div style="height:12px; background:#f3f3f3; border-radius:6px; width:60%; margin-top:6px"></div>
      </div>
    </div>

    <div v-else style="display:grid; gap:16px">
      <article
        v-for="it in items"
        :key="it.id"
        style="border:1px solid #eee; padding:12px; border-radius:12px; cursor:pointer; display:grid; grid-template-columns:120px 1fr; gap:12px; align-items:center"
        @click="open(it.id)"
      >
        <img v-if="it.imageUrl" :src="it.imageUrl" alt="" style="width:120px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #eee" />
        <div>
          <h3 style="margin:0 0 4px">{{ it.title }}</h3>
          <small style="opacity:.7; display:block; margin-bottom:4px">
            {{ (it.publishedAt?.toDate?.() || it.createdAt?.toDate?.() || new Date()).toLocaleDateString() }}
          </small>
          <p style="margin:0">{{ (it.body || '').slice(0,200) }}{{ (it.body||'').length>200 ? '…' : '' }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
