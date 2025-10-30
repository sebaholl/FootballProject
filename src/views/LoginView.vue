<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)
const route = useRoute()
const router = useRouter()

const submit = async () => {
  err.value = ''
  loading.value = true
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    const redirect = route.query.redirect || '/admin'
    router.push(redirect)
  } catch (e) {
    err.value = (e && e.message) ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section style="max-width:420px;margin:40px auto;padding:24px;border:1px solid #eee;border-radius:12px; margin-bottom: 200px;">
    <h2>Login</h2>
    <form @submit.prevent="submit" style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button :disabled="loading" type="submit">Login</button>
      <p v-if="err" style="color:#c00">{{ err }}</p>
    </form>
  </section>
</template>


