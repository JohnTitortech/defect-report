/**
 * CRUD hook for the `supplierReports` Firestore collection.
 *
 * Skemanya SAMA PERSIS dengan koleksi `reports` (lihat lib/db.js), hanya
 * ditambah satu field: `supplierName`. Field mana yang boleh diubah siapa
 * ditegakkan oleh firestore.rules (bukan oleh hook ini) — lihat blok
 * `match /supplierReports/{doc}` di firestore.rules.
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
import { normalizeCountermeasureFields } from '../lib/db'
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
      setReports(snap.docs.map(d => ({ id: d.id, ...normalizeCountermeasureFields(d.data()) })))
      setLoading(false)
    }, err => {
      console.error('useSupplierReports:', err)
      setLoading(false)
    })
    return unsub
  }, [user])

  // Dipakai QC/MASTER untuk membuat laporan baru. `data` adalah seluruh form
  // (sama persis dengan form laporan internal, ditambah supplierName).
  const createReport = useCallback(async (data) => {
    const id = toast.loading('Menyimpan…')
    try {
      await addDoc(collection(db, COL), {
        date:             data.date             || '',
        unitNo:           data.unitNo           || '', // ditampilkan sebagai "Part Number"
        model:            data.model            || '',
        inspectionType:   data.inspectionType   || '',
        lot:              data.lot              || '',
        part:             data.part             || '',
        problem:          data.problem          || '',
        pic:              data.pic              || '',
        picPenjawab:      data.picPenjawab      || '',
        qty:              data.qty              ?? 1,
        responsible:      data.responsible      || [],
        cause:            data.cause            || '',
        temporary:        data.temporary        || '',
        fix:              data.fix              || '',
        progress:         data.progress         ?? 0,
        progressTimestamps: data.progressTimestamps || {},
        verification:     data.verification     ?? 0,
        layoutType:       data.layoutType       || null,
        positionImageUrl: data.positionImageUrl || null,
        detailImageUrl:   data.detailImageUrl   || null,
        temporaryLayoutType:       data.temporaryLayoutType       || null,
        temporaryPositionImageUrl: data.temporaryPositionImageUrl || null,
        temporaryDetailImageUrl:   data.temporaryDetailImageUrl   || null,
        fixLayoutType:             data.fixLayoutType             || null,
        fixPositionImageUrl:       data.fixPositionImageUrl       || null,
        fixDetailImageUrl:         data.fixDetailImageUrl         || null,
        supplierName:     data.supplierName     || '',
        createdAt:        serverTimestamp(),
        updatedAt:        serverTimestamp(),
        createdBy:        user?.email || '',
      })
      toast.success('Laporan dibuat', { id })
    } catch (err) {
      toast.error('Gagal membuat laporan', { id })
      console.error(err)
    }
  }, [user])

  // Dipakai QC/MASTER (edit bebas semua field) MAUPUN Supplier (edit field
  // yang diizinkan saja). Dua-duanya kirim seluruh form; firestore.rules
  // yang menolak kalau Supplier mencoba mengubah field yang dikunci.
  const updateReport = useCallback(async (reportId, data) => {
    const id = toast.loading('Menyimpan…')
    try {
      await updateDoc(doc(db, COL, reportId), { ...data, updatedAt: serverTimestamp() })
      toast.success('Tersimpan', { id })
    } catch (err) {
      toast.error('Gagal menyimpan — mungkin ada field yang tidak diizinkan diubah', { id })
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

  return { reports, loading, createReport, updateReport, removeReport }
}
