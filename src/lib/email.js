/**
 * Notifikasi email otomatis untuk defect report baru, lewat EmailJS.
 *
 * SETUP (sekali saja, di dashboard EmailJS, bukan di kode ini):
 *  1. Buat akun di https://www.emailjs.com dengan email pengirim
 *     (contoh: @gmail.com)
 *  2. Email Services → Add New Service → Gmail → hubungkan akun Gmail
 *     tadi lewat login Google → catat SERVICE_ID
 *  3. Email Templates → Create New Template. Isi "To email" dengan
 *     {{to_email}}, lalu isi body dengan variabel:
 *     {{unit_no}}, {{model}}, {{problem}}, {{link}}, {{image_url}} → catat TEMPLATE_ID
 *     ({{image_url}} dipakai di tag <img src="{{image_url}}"> pada template)
 *  4. Account → General → catat PUBLIC KEY
 *  5. Isi tiga nilai itu di file .env:
 *     VITE_EMAILJS_SERVICE_ID=...
 *     VITE_EMAILJS_TEMPLATE_ID=...
 *     VITE_EMAILJS_PUBLIC_KEY=...
 *
 * Paket gratis EmailJS: 200 email/bulan, 2 email service.
 */
import emailjs from '@emailjs/browser'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const APP_LINK = 'https://johntitortech.github.io/defect-report/'

async function getNotificationEmails() {
  const snap = await getDocs(collection(db, 'notificationEmails'))
  return snap.docs.map(d => d.data().email).filter(Boolean)
}

/**
 * Kirim notifikasi defect baru ke seluruh email di daftar notificationEmails.
 * Dipanggil setelah createReport() berhasil. Gagal kirim TIDAK membatalkan
 * pembuatan laporan — hanya dicatat ke console supaya tidak mengganggu user.
 */
export async function sendNewDefectEmail(report) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS belum dikonfigurasi (lihat src/lib/email.js). Notifikasi dilewati.')
    return
  }

  let recipients = []
  try {
    recipients = await getNotificationEmails()
  } catch (err) {
    console.error('Gagal mengambil daftar notificationEmails:', err)
    return
  }
  if (recipients.length === 0) return

  const params = {
    unit_no:   report.unitNo || '-',
    model:     report.model  || '-',
    problem:   report.problem || '-',
    link:      APP_LINK,
    // Foto defect (kalau ada). Pakai detail dulu, lalu position sebagai cadangan.
    image_url: report.detailImageUrl || report.positionImageUrl || '',
  }

  await Promise.allSettled(
    recipients.map(to_email =>
      emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        { ...params, to_email },
        { publicKey: PUBLIC_KEY }
      ).catch(err => console.error(`Gagal kirim email ke ${to_email}:`, err))
    )
  )
}
