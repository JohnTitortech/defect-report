/**
 * SupplierReportModal — satu komponen untuk tiga mode, tergantung role:
 *   - MASTER/QC: bisa isi semua field (mode create atau edit bebas).
 *   - SUPPLIER : hanya field Root Cause & Countermeasure yang bisa diedit;
 *                field lain tampil read-only.
 *   - ASSY     : semua field read-only (view only, tidak ada tombol simpan).
 */
import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSuppliers } from '../hooks/useSuppliers'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SupplierReportModal({ report, onClose, onCreate, onSaveRootCause, onSaveFull }) {
  const { user } = useAuth()
  const { suppliers } = useSuppliers()
  const isNew = !report
  const canEditAll = user?.role === 'MASTER' || user?.role === 'QC'
  const canEditOwn  = user?.role === 'SUPPLIER' && report?.supplierName === user.supplierName
  const readOnly    = !canEditAll && !canEditOwn

  const [form, setForm] = useState({
    unitNo: '', model: '', date: todayStr(), problem: '',
    picCheck: user?.displayName || user?.email || '',
    supplierName: '', rootCause: '', countermeasure: '',
  })

  useEffect(() => {
    if (report) {
      setForm({
        unitNo: report.unitNo || '',
        model: report.model || '',
        date: report.date || '',
        problem: report.problem || '',
        picCheck: report.picCheck || '',
        supplierName: report.supplierName || '',
        rootCause: report.rootCause || '',
        countermeasure: report.countermeasure || '',
      })
    }
  }, [report])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (isNew) {
      if (!form.unitNo || !form.problem || !form.supplierName) return
      await onCreate(form)
    } else if (canEditOwn) {
      await onSaveRootCause(report.id, { rootCause: form.rootCause, countermeasure: form.countermeasure })
    } else if (canEditAll) {
      await onSaveFull(report.id, form)
    }
    onClose()
  }

  const lockedField = canEditOwn // Supplier: field dasar dikunci

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-lg border border-steel-200 dark:border-steel-700 animate-slide-up max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700 sticky top-0 bg-white dark:bg-steel-900">
          <h2 className="font-semibold text-steel-900 dark:text-steel-100">
            {isNew ? 'Laporan Supplier Baru' : (readOnly ? 'Detail Laporan' : 'Edit Laporan')}
          </h2>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Frame Number</label>
              <input className="field-input w-full" value={form.unitNo} onChange={set('unitNo')}
                disabled={!isNew && (lockedField || readOnly)} />
            </div>
            <div>
              <label className="field-label">Model</label>
              <input className="field-input w-full" value={form.model} onChange={set('model')}
                disabled={!isNew && (lockedField || readOnly)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Tanggal</label>
              <input type="date" className="field-input w-full" value={form.date} onChange={set('date')}
                disabled={!isNew && (lockedField || readOnly)} />
            </div>
            <div>
              <label className="field-label">Supplier</label>
              {isNew ? (
                <select className="field-input w-full" value={form.supplierName} onChange={set('supplierName')}>
                  <option value="">Pilih supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              ) : (
                <input className="field-input w-full" value={form.supplierName} disabled />
              )}
            </div>
          </div>

          <div>
            <label className="field-label">Problem</label>
            <textarea className="field-input w-full" rows={2} value={form.problem} onChange={set('problem')}
              disabled={!isNew && (lockedField || readOnly)} />
          </div>

          <div>
            <label className="field-label">PIC Check</label>
            <input className="field-input w-full" value={form.picCheck} onChange={set('picCheck')}
              disabled={!isNew && (lockedField || readOnly)} />
          </div>

          <div className="pt-3 border-t border-steel-200 dark:border-steel-700 space-y-4">
            <div>
              <label className="field-label text-accent">Root Cause {canEditOwn && '(bisa diisi)'}</label>
              <textarea className="field-input w-full" rows={3} value={form.rootCause} onChange={set('rootCause')}
                disabled={isNew || (!canEditAll && !canEditOwn)}
                placeholder={isNew ? 'Diisi setelah laporan dibuat' : ''} />
            </div>
            <div>
              <label className="field-label text-accent">Countermeasure {canEditOwn && '(bisa diisi)'}</label>
              <textarea className="field-input w-full" rows={3} value={form.countermeasure} onChange={set('countermeasure')}
                disabled={isNew || (!canEditAll && !canEditOwn)}
                placeholder={isNew ? 'Diisi setelah laporan dibuat' : ''} />
            </div>
          </div>

          {!readOnly && (
            <button type="button" onClick={handleSave} className="btn-primary w-full flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Simpan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
