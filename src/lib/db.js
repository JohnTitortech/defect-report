/**
 * Firestore CRUD operations for the reports collection.
 */
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'reports'

// ── Create ────────────────────────────────────────────────────────────────────
export async function createReport(data) {
  return addDoc(collection(db, COL), {
    date:             data.date             || '',
    unitNo:           data.unitNo           || '',
    model:            data.model            || '',
    inspectionType:   data.inspectionType   || '',
    lot:              data.lot              || '',
    problem:          data.problem          || '',
    pic:              data.pic              || '',
    picPenjawab:      data.picPenjawab      || '',
    qty:              data.qty              ?? 1,
    responsible:      data.responsible      || [],
    cause:            data.cause            || '',
    // "Temporary" / "Fix" — nama tampilan baru untuk yang dulunya
    // Countermeasure (Before)/(After). Field Firestore JUGA diganti nama
    // (temporary/fix), TAPI laporan lama yang masih pakai nama field lama
    // (countermeasureBefore/countermeasureAfter) tidak disentuh/dihapus —
    // lihat fetchReports() di bawah untuk kompatibilitas baca data lama.
    temporary:        data.temporary        || '',
    fix:              data.fix              || '',
    progress:         data.progress         ?? 0,
    progressTimestamps: data.progressTimestamps || {},
    verification:     data.verification     ?? 0,
    layoutType:       data.layoutType       || 'single',
    positionImageUrl: data.positionImageUrl || null,
    detailImageUrl:   data.detailImageUrl   || null,
    temporaryLayoutType:       data.temporaryLayoutType       || null,
    temporaryPositionImageUrl: data.temporaryPositionImageUrl || null,
    temporaryDetailImageUrl:   data.temporaryDetailImageUrl   || null,
    fixLayoutType:             data.fixLayoutType             || null,
    fixPositionImageUrl:       data.fixPositionImageUrl       || null,
    fixDetailImageUrl:         data.fixDetailImageUrl         || null,
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  })
}

// ── Read ──────────────────────────────────────────────────────────────────────
// Laporan lama (dibuat sebelum rename Countermeasure Before/After →
// Temporary/Fix) masih tersimpan dengan nama field lama di Firestore.
// Di sini kita "terjemahkan" ke nama field baru saat dibaca, supaya seluruh
// kode lain (Dashboard, ReportModal, pdfExport) cukup pakai report.temporary
// / report.fix saja — tidak perlu tahu field mana yang dipakai dokumen itu.
// Field lama TIDAK dihapus dari objek yang dikembalikan, jadi apa pun yang
// kebetulan masih merujuknya tidak akan rusak.
export function normalizeCountermeasureFields(data) {
  return {
    ...data,
    temporary: data.temporary ?? data.countermeasureBefore ?? data.countermeasure ?? '',
    fix:       data.fix       ?? data.countermeasureAfter  ?? '',
    temporaryLayoutType:       data.temporaryLayoutType       ?? data.cmBeforeLayoutType       ?? null,
    temporaryPositionImageUrl: data.temporaryPositionImageUrl ?? data.cmBeforePositionImageUrl ?? null,
    temporaryDetailImageUrl:   data.temporaryDetailImageUrl   ?? data.cmBeforeDetailImageUrl   ?? null,
    fixLayoutType:             data.fixLayoutType             ?? data.cmAfterLayoutType        ?? null,
    fixPositionImageUrl:       data.fixPositionImageUrl       ?? data.cmAfterPositionImageUrl  ?? null,
    fixDetailImageUrl:         data.fixDetailImageUrl         ?? data.cmAfterDetailImageUrl    ?? null,
  }
}

export async function fetchReports() {
  const q   = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...normalizeCountermeasureFields(d.data()) }))
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateReport(id, data) {
  return updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteReport(id) {
  return deleteDoc(doc(db, COL, id))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function tsToDate(ts) {
  if (!ts) return null
  if (ts instanceof Timestamp) return ts.toDate()
  if (ts?.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

export function formatDate(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Whole-day difference between two timestamps (fromTs -> toTs), rounded down.
// Returns null if either timestamp is missing, so the caller can render a blank cell.
export function diffDays(fromTs, toTs) {
  const from = tsToDate(fromTs)
  const to   = tsToDate(toTs)
  if (!from || !to) return null
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}
