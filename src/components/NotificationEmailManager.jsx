/**
 * NotificationEmailManager — dialog untuk MASTER mengelola daftar email
 * yang menerima notifikasi otomatis setiap ada defect report baru.
 * Hanya bisa diakses oleh role MASTER.
 */
import React, { useState } from 'react'
import { X, Plus, Trash2, Mail } from 'lucide-react'
import { useNotificationEmails } from '../hooks/useNotificationEmails'
import toast from 'react-hot-toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function NotificationEmailManager({ onClose }) {
  const { emails, loading, addEmail, removeEmail } = useNotificationEmails()
  const [input,  setInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const email = input.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) {
      toast.error('Format email tidak valid')
      return
    }
    if (emails.some(e => e.email === email)) {
      toast.error('Email sudah ada di daftar')
      return
    }
    setSaving(true)
    try {
      await addEmail(email)
      setInput('')
      toast.success(`${email} ditambahkan`)
    } catch {
      toast.error('Gagal menambahkan email')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      await removeEmail(item.id)
      toast.success(`${item.email} dihapus`)
    } catch {
      toast.error('Gagal menghapus email')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-sm border border-steel-200 dark:border-steel-700 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">Notification Emails</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-steel-400">
            Email di daftar ini otomatis menerima notifikasi setiap ada defect report baru.
          </p>

          {/* Add input */}
          <div className="flex gap-2">
            <input
              type="email"
              className="field-input flex-1"
              placeholder="nama@gmail.com"
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

          {/* List */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {loading && (
              <p className="text-sm text-steel-400 text-center py-4">Loading…</p>
            )}
            {!loading && emails.length === 0 && (
              <p className="text-sm text-steel-400 text-center py-4">Belum ada email. Tambahkan di atas.</p>
            )}
            {emails.map(e => (
              <div
                key={e.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-steel-50 dark:bg-steel-800
                           border border-steel-200 dark:border-steel-700 group"
              >
                <span className="text-sm text-steel-800 dark:text-steel-200">{e.email}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600"
                  title="Hapus email"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-steel-400">
            {emails.length} email terdaftar · Hover untuk hapus
          </p>
        </div>
      </div>
    </div>
  )
}
