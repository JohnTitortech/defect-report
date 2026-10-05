/**
 * CRUD hook for the `supplierReports` Firestore collection.
 *
 * Skema dokumen:
 *   unitNo, model, date, problem, picCheck, supplierName  → diisi QC/MASTER
 *   rootCause, countermeasure                             → diisi Supplier
 *   createdAt, createdBy, updatedAt
 *
 * Kalau user yang login role-nya SUPPLIER, query otomatis difilter hanya
 * dokumen dengan supplierName == user.supplierName (filter di client ini
 * untuk UX; isolasi SEBENARNYA dari supplier lain ditegakkan oleh
 * firestore.rules, bukan oleh filter ini).
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

const COL = 'supplierReports'

export function useSupplierReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const base = collection(db, COL)
    const q = user.role === 'SUPPLIER'
      ? query(base, where('supplierName', '==', user.supplierName), orderBy('createdAt', 'desc'))
      : query(base, orderBy('createdAt', 'desc'))

    const unsub = onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('useSupplierReports:', err)
      setLoading(false)
    })
    return unsub
  }, [user])

  // Dipakai QC/MASTER untuk membuat laporan baru.
  const createReport = useCallback(async (data) => {
    const id = toast.loading('Menyimpan…')
    try {
      await addDoc(collection(db, COL), {
        unitNo:         data.unitNo || '',
        model:          data.model || '',
        date:           data.date || '',
        problem:        data.problem || '',
        picCheck:       data.picCheck || '',
        supplierName:   data.supplierName || '',
        rootCause:      '',
        countermeasure: '',
        createdAt:      serverTimestamp(),
        createdBy:      user?.email || '',
      })
      toast.success('Laporan dibuat', { id })
    } catch (err) {
      toast.error('Gagal membuat laporan', { id })
      console.error(err)
    }
  }, [user])

  // Dipakai Supplier untuk mengisi root cause & countermeasure.
  const updateRootCause = useCallback(async (reportId, { rootCause, countermeasure }) => {
    const id = toast.loading('Menyimpan…')
    try {
      await updateDoc(doc(db, COL, reportId), {
        rootCause: rootCause || '',
        countermeasure: countermeasure || '',
        updatedAt: serverTimestamp(),
      })
      toast.success('Tersimpan', { id })
    } catch (err) {
      toast.error('Gagal menyimpan', { id })
      console.error(err)
    }
  }, [])

  // Dipakai QC/MASTER untuk edit bebas (termasuk semua field).
  const updateReport = useCallback(async (reportId, data) => {
    const id = toast.loading('Menyimpan…')
    try {
      await updateDoc(doc(db, COL, reportId), { ...data, updatedAt: serverTimestamp() })
      toast.success('Tersimpan', { id })
    } catch (err) {
      toast.error('Gagal menyimpan', { id })
      console.error(err)
    }
  }, [])

  const removeReport = useCallback(async (reportId) => {
    const id = toast.loading('Menghapus…')
    try {
      await deleteDoc(doc(db, COL, reportId))
      toast.success('Laporan dihapus', { id })
    } catch (err) {
      toast.error('Gagal menghapus', { id })
      console.error(err)
    }
  }, [])

  return { reports, loading, createReport, updateRootCause, updateReport, removeReport }
}
