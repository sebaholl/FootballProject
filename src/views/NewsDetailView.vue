<!-- src/views/NewsDetailView.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNews } from '../composables/useNews'

const { get } = useNews()
const route = useRoute()
const post = ref(null)
const loading = ref(true)
const err = ref('')

onMounted(async () => {
  try { post.value = await get(route.params.id) } catch(e){ err.value = e?.message || 'Loading error' }
  finally { loading.value = false }
})
</script>

<template>
  <section style="padding:24px; max-width:900px; margin:0 auto">
    <p v-if="loading">Loading…</p>
    <p v-else-if="err" style="color:#c00">{{ err }}</p>

    <article v-else-if="post" style="display:grid; gap:12px">
      <h1 style="margin:0">{{ post.title }}</h1>
      <small style="opacity:.7">
        {{ (post.publishedAt?.toDate?.() || post.createdAt?.toDate?.() || new Date()).toLocaleString() }}
      </small>
      <img v-if="post.imageUrl" :src="post.imageUrl" alt="" style="max-width:100%; height:auto; border-radius:12px; border:1px solid #eee" />
      <p style="white-space:pre-line; line-height:1.6; font-size:1.05rem">{{ post.body }}</p>
    </article>

    <p v-else>Post not found.</p>
  </section>
</template>


