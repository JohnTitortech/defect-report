/**
 * CRUD hook for the `notificationEmails` Firestore collection.
 * Each document: { email: string, createdAt: Timestamp }
 * These are the addresses that receive an email when a new defect report is created.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'notificationEmails'

export function useNotificationEmails() {
  const [emails,  setEmails]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setEmails(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('useNotificationEmails:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  const addEmail = useCallback(async (email) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    await addDoc(collection(db, COL), { email: trimmed, createdAt: serverTimestamp() })
  }, [])

  const removeEmail = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id))
  }, [])

  return { emails, loading, addEmail, removeEmail }
}
