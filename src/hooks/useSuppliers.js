/**
 * CRUD hook for the `suppliers` Firestore collection (master data).
 * Each document: { name: string, createdAt: Timestamp }
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'suppliers'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('useSuppliers:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  const addSupplier = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addDoc(collection(db, COL), { name: trimmed, createdAt: serverTimestamp() })
  }, [])

  const removeSupplier = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id))
  }, [])

  return { suppliers, loading, addSupplier, removeSupplier }
}
