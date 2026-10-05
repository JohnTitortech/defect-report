/**
 * SupplierManager — dialog untuk MASTER/QC mengelola daftar nama supplier
 * (master data koleksi `suppliers`). Nama di sini yang dipilih QC saat
 * membuat laporan baru, dan yang harus cocok persis dengan field
 * `supplierName` di USER_ROLES akun supplier bersangkutan.
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, Factory } from 'lucide-react'
import { useSuppliers } from '../hooks/useSuppliers'
import toast from 'react-hot-toast'

export default function SupplierManager({ onClose }) {
  const { suppliers, loading, addSupplier, removeSupplier } = useSuppliers()
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const name = input.trim()
    if (!name) return
    if (suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Supplier sudah ada di daftar')
      return
    }
    setSaving(true)
    try {
      await addSupplier(name)
      setInput('')
      toast.success(`${name} ditambahkan`)
    } catch {
      toast.error('Gagal menambahkan supplier')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      await removeSupplier(item.id)
      toast.success(`${item.name} dihapus`)
    } catch {
      toast.error('Gagal menghapus supplier')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">

        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">Manage Suppliers</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-steel-400">
            Nama di sini harus sama persis dengan field <code>supplierName</code> di akun
            login supplier bersangkutan (diatur manual di Firestore &rarr; USER_ROLES).
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              className="field-input flex-1"
              placeholder="Nama Supplier"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !input.trim()}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {loading && <p className="text-sm text-steel-400 text-center py-4">Loading…</p>}
            {!loading && suppliers.length === 0 && (
              <p className="text-sm text-steel-400 text-center py-4">Belum ada supplier.</p>
            )}
            {suppliers.map(s => (
              <div key={s.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-steel-50 dark:bg-steel-800
                           border border-steel-200 dark:border-steel-700 group">
                <span className="text-sm text-steel-800 dark:text-steel-200">{s.name}</span>
                <button type="button" onClick={() => handleDelete(s)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
