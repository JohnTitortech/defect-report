import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Mengembalikan { role, supplierName }.
 * supplierName hanya terisi untuk akun dengan role 'SUPPLIER' — dokumen
 * USER_ROLES/{email} untuk akun itu harus punya field `supplierName` yang
 * cocok PERSIS dengan salah satu entri di koleksi `suppliers`.
 */
export async function getUserRole(email) {
  const snap = await getDoc(
    doc(db, 'USER_ROLES', email)
  )

  if (!snap.exists()) {
    return { role: null, supplierName: null }
  }

  const data = snap.data()
  return { role: data.role || null, supplierName: data.supplierName || null }
}
