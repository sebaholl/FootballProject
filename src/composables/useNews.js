// src/composables/useNews.js
import { db } from '../firebase'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, getDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore'

const colRef = () => collection(db, 'news')

export function useNews() {
  const list = async () => {
    const q = query(colRef(), orderBy('publishedAt', 'desc'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const get = async (id) => {
    const s = await getDoc(doc(db, 'news', id))
    return s.exists() ? { id: s.id, ...s.data() } : null
  }

  const create = (payload) => {
    const clean = {
      title: (payload.title || '').trim().slice(0, 120),
      body: (payload.body || '').trim().slice(0, 10000), // also here
      imageUrl: payload.imageUrl ? payload.imageUrl.trim() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: payload.publishedAt || serverTimestamp()
    }
    return addDoc(colRef(), clean)
  }

  const update = (id, payload) => {
    const clean = {
      title: (payload.title || '').trim().slice(0, 120),
      body: (payload.body || '').trim().slice(0, 10000), // reduce too store less data, so firebase wont hit limits
      imageUrl: payload.imageUrl ? payload.imageUrl.trim() : null,
      updatedAt: serverTimestamp(),
      ...(payload.publishedAt ? { publishedAt: payload.publishedAt } : {})
    }
    return updateDoc(doc(db, 'news', id), clean)
  }

  const remove = (id) => deleteDoc(doc(db, 'news', id))

  return { list, get, create, update, remove }
}


