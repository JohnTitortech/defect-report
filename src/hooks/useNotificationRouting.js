/**
 * CRUD hook for the `notificationRouting` Firestore collection.
 *
 * Satu dokumen per Inspection Type (doc id = nama inspection type apa adanya,
 * misalnya "Final Inspection"). Setiap dokumen punya tiga daftar email:
 *   { newDefect: [...], progressOverdue: [...], verificationOverdue: [...] }
 *
 * - newDefect          → penerima saat laporan baru dibuat dengan inspection
 *                        type ini.
 * - progressOverdue    → penerima reminder saat progress telat (belum 4)
 *                        untuk inspection type ini.
 * - verificationOverdue→ penerima reminder saat verification telat (progress
 *                        sudah 4, verification belum 1) untuk inspection
 *                        type ini.
 *
 * Inspection type yang belum punya dokumen di sini TIDAK mengirim email
 * apa pun untuk kategori tersebut (aman secara default, tidak mengirim
 * ke sembarang alamat).
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, doc, setDoc, onSnapshot, getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COL = 'notificationRouting'
const EMPTY = { newDefect: [], progressOverdue: [], verificationOverdue: [] }

export function useNotificationRouting() {
  const [routing, setRouting] = useState({}) // { [inspectionType]: { newDefect, progressOverdue, verificationOverdue } }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COL), snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = { ...EMPTY, ...d.data() } })
      setRouting(map)
      setLoading(false)
    }, err => {
      console.error('useNotificationRouting:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  // Simpan seluruh tiga daftar sekaligus untuk satu inspection type.
  const saveRouting = useCallback(async (inspectionType, lists) => {
    if (!inspectionType) return
    await setDoc(doc(db, COL, inspectionType), { ...EMPTY, ...lists })
  }, [])

  return { routing, loading, saveRouting }
}

// Dipakai juga di luar React (kalau perlu one-off read, di luar hook).
export async function getRoutingFor(inspectionType) {
  if (!inspectionType) return EMPTY
  const snap = await getDoc(doc(db, COL, inspectionType))
  return snap.exists() ? { ...EMPTY, ...snap.data() } : EMPTY
}
