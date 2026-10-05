import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Factory, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSupplierReports } from '../hooks/useSupplierReports'
import SupplierReportModal from '../components/SupplierReportModal'
import SupplierManager from '../components/SupplierManager'

function StatusBadge({ report }) {
  const done = report.rootCause && report.countermeasure
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
      ${done
        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
      {done ? 'Selesai' : 'Menunggu Supplier'}
    </span>
  )
}

export default function SupplierPage() {
  const { user, logOut } = useAuth()
  const { reports, loading, createReport, updateRootCause, updateReport } = useSupplierReports()
  const [selected, setSelected] = useState(null) // report sedang dibuka, atau 'new'
  const [showSupplierMgr, setShowSupplierMgr] = useState(false)

  if (!user) return null

  const isInternal = user.role === 'MASTER' || user.role === 'QC' || user.role === 'ASSY'
  const canCreate = user.role === 'MASTER' || user.role === 'QC'

  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950">
      <header className="sticky top-0 z-30 bg-white dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            {isInternal && (
              <Link to="/" className="icon-btn" title="Kembali ke Dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            <div>
              <p className="text-sm font-bold text-steel-900 dark:text-steel-100 leading-none">Supplier Reports</p>
              {user.role === 'SUPPLIER' && (
                <p className="text-[10px] text-steel-400 leading-none mt-0.5">{user.supplierName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(user.role === 'MASTER' || user.role === 'QC') && (
              <button onClick={() => setShowSupplierMgr(true)} className="icon-btn" title="Manage Suppliers">
                <Factory className="w-4 h-4" />
              </button>
            )}
            {canCreate && (
              <button onClick={() => setSelected('new')} className="btn-primary flex items-center gap-1.5 text-sm">
                <Plus className="w-4 h-4" />
                New Report
              </button>
            )}
            <button onClick={logOut} className="icon-btn" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-steel-400" />
          </div>
        )}

        {!loading && reports.length === 0 && (
          <p className="text-center text-steel-400 text-sm py-12">
            Belum ada laporan supplier.
          </p>
        )}

        {!loading && reports.length > 0 && (
          <div className="bg-white dark:bg-steel-900 rounded-xl border border-steel-200 dark:border-steel-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 dark:bg-steel-800 text-steel-500 dark:text-steel-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Frame Number</th>
                  <th className="text-left px-4 py-2">Model</th>
                  <th className="text-left px-4 py-2">Supplier</th>
                  <th className="text-left px-4 py-2">Problem</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-t border-steel-100 dark:border-steel-800 hover:bg-steel-50 dark:hover:bg-steel-800/60 cursor-pointer">
                    <td className="px-4 py-2.5 font-mono text-xs">{r.unitNo}</td>
                    <td className="px-4 py-2.5">{r.model}</td>
                    <td className="px-4 py-2.5">{r.supplierName}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate">{r.problem}</td>
                    <td className="px-4 py-2.5"><StatusBadge report={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selected && (
        <SupplierReportModal
          report={selected === 'new' ? null : selected}
          onClose={() => setSelected(null)}
          onCreate={createReport}
          onSaveRootCause={updateRootCause}
          onSaveFull={updateReport}
        />
      )}

      {showSupplierMgr && (
        <SupplierManager onClose={() => setShowSupplierMgr(false)} />
      )}
    </div>
  )
}
