import { ref, onMounted } from 'vue'
import { auth, db } from '@/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const userRef = ref(null)
const roleRef = ref(null)
const readyRef = ref(false)

export function useAuth() {
  onMounted(() => {
    onAuthStateChanged(auth, async (u) => {
      userRef.value = u
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        roleRef.value = snap.exists() ? snap.data().role : null
      } else {
        roleRef.value = null
      }
      readyRef.value = true
    })
  })

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const logout = () => signOut(auth)

  return { user: userRef, role: roleRef, ready: readyRef, login, logout }
}

