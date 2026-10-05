/**
 * NotificationEmailManager — dialog untuk MASTER/QC mengatur SIAPA menerima
 * notifikasi email, per Inspection Type dan per jenis kejadian:
 *   - Defect Baru (saat laporan dibuat)
 *   - Progress Telat
 *   - Verification Telat
 *
 * Satu Inspection Type dipilih dulu dari dropdown, lalu tiga daftar emailnya
 * diatur terpisah. Inspection Type yang belum diatur sama sekali tidak
 * mengirim email apa pun (aman secara default).
 */
import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Mail } from 'lucide-react'
import { useInspectionTypes } from '../hooks/useInspectionTypes'
import { useNotificationRouting } from '../hooks/useNotificationRouting'
import toast from 'react-hot-toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SECTIONS = [
  { key: 'newDefect',           label: 'Defect Baru' },
  { key: 'progressOverdue',     label: 'Progress Telat' },
  { key: 'verificationOverdue', label: 'Verification Telat' },
]

function EmailListEditor({ label, emails, onChange }) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const email = input.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) { toast.error('Format email tidak valid'); return }
    if (emails.includes(email)) { toast.error('Email sudah ada'); return }
    onChange([...emails, email])
    setInput('')
  }

  const handleRemove = (email) => onChange(emails.filter(e => e !== email))

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          className="field-input flex-1 text-sm"
          placeholder="nama@gmail.com"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <button type="button" onClick={handleAdd} className="btn-primary px-3 shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {emails.length === 0 ? (
        <p className="text-xs text-steel-400 italic">Belum ada penerima — tidak ada email dikirim.</p>
      ) : (
        <div className="space-y-1">
          {emails.map(email => (
            <div key={email}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-steel-50 dark:bg-steel-800
                         border border-steel-200 dark:border-steel-700 group">
              <span className="text-sm text-steel-800 dark:text-steel-200">{email}</span>
              <button type="button" onClick={() => handleRemove(email)}
                className="opacity-0 group-hover:opacity-100 transition-opacity icon-btn text-red-500 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NotificationEmailManager({ onClose }) {
  const { inspectionTypes, loading: typesLoading } = useInspectionTypes()
  const { routing, loading: routingLoading, saveRouting } = useNotificationRouting()
  const [selectedType, setSelectedType] = useState('')
  const [draft, setDraft] = useState({ newDefect: [], progressOverdue: [], verificationOverdue: [] })
  const [saving, setSaving] = useState(false)

  // Pilih inspection type pertama secara default begitu daftarnya siap.
  useEffect(() => {
    if (!selectedType && inspectionTypes.length > 0) {
      setSelectedType(inspectionTypes[0].name)
    }
  }, [inspectionTypes, selectedType])

  // Muat ulang draft setiap ganti inspection type / data routing berubah.
  useEffect(() => {
    if (!selectedType) return
    setDraft(routing[selectedType] || { newDefect: [], progressOverdue: [], verificationOverdue: [] })
  }, [selectedType, routing])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveRouting(selectedType, draft)
      toast.success(`Aturan email untuk "${selectedType}" disimpan`)
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const loading = typesLoading || routingLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-lg border border-steel-200 dark:border-steel-700 animate-slide-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 dark:border-steel-700 sticky top-0 bg-white dark:bg-steel-900">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-steel-900 dark:text-steel-100">Notification Routing</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-steel-400">
            Atur siapa menerima email, tergantung Inspection Type laporan dan jenis kejadiannya.
            Inspection Type yang belum diatur di sini tidak mengirim email sama sekali.
          </p>

          {loading && <p className="text-sm text-steel-400 text-center py-6">Loading…</p>}

          {!loading && inspectionTypes.length === 0 && (
            <p className="text-sm text-steel-400 text-center py-6">
              Belum ada Inspection Type. Tambahkan dulu lewat "Manage Inspection Type".
            </p>
          )}

          {!loading && inspectionTypes.length > 0 && (
            <>
              {/* Pilih Inspection Type */}
              <div>
                <label className="text-xs font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide">
                  Inspection Type
                </label>
                <select
                  className="field-input w-full mt-1"
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                >
                  {inspectionTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-5 pt-2 border-t border-steel-200 dark:border-steel-700">
                {SECTIONS.map(({ key, label }) => (
                  <EmailListEditor
                    key={key}
                    label={label}
                    emails={draft[key] || []}
                    onChange={(emails) => setDraft(d => ({ ...d, [key]: emails }))}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : `Simpan untuk "${selectedType}"`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
