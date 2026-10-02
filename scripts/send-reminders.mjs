/**
 * Reminder harian untuk defect report yang progress/verification-nya
 * belum penuh dan sudah lewat hari kerja berikutnya sejak tanggal acuan.
 *
 * Dijalankan oleh GitHub Actions (lihat .github/workflows/reminders.yml)
 * setiap hari jam 00:30 UTC (= 07:30 WIB), BUKAN dari browser pengguna.
 *
 * Aturan:
 *  - Progress belum 4 → acuan tanggal = field `date` (tanggal problem
 *    ditemukan, yang diinput manual di form — BUKAN createdAt/tanggal input
 *    ke sistem). Formatnya string "YYYY-MM-DD".
 *  - Progress sudah 4 tapi verification belum 1 → acuan tanggal =
 *    progressTimestamps['4'] (tanggal progress mencapai 4).
 *  - "Due date" = hari kerja berikutnya setelah tanggal acuan
 *    (Sabtu & Minggu dilewati). Mulai due date itu, email dikirim BERULANG
 *    setiap hari kerja (Sabtu & Minggu tetap dilewati) selama tahap itu
 *    belum selesai, dengan jumlah hari delay yang terus bertambah di pesan
 *    (contoh: dibuat 2/10 → dikirim 3/10 "> 1 hari", 4/10 "> 2 hari", dst).
 *  - Flag *ReminderLastSentDate dipakai hanya untuk mencegah dua email
 *    terkirim di tanggal yang sama kalau workflow kebetulan dijalankan
 *    dua kali dalam satu hari (misalnya re-run manual).
 *
 * Kredensial dibaca dari environment variable (diisi oleh GitHub Actions
 * dari Secrets), TIDAK pernah ditulis langsung di file ini.
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Config dari environment ──────────────────────────────────────────────────
const {
  FIREBASE_SERVICE_ACCOUNT, // isi: seluruh JSON service account Firebase
  EMAILJS_SERVICE_ID,
  EMAILJS_REMINDER_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY,
  APP_LINK = 'https://johntitortech.github.io/defect-report/',
} = process.env

for (const [k, v] of Object.entries({
  FIREBASE_SERVICE_ACCOUNT, EMAILJS_SERVICE_ID, EMAILJS_REMINDER_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY,
})) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1) }
}

const app = initializeApp({
  credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)),
})
const db = getFirestore(app)

// ── Helper tanggal (semua dihitung di zona Asia/Jakarta) ────────────────────
const JAKARTA_TZ = 'Asia/Jakarta'

function toJakartaDateOnly(date) {
  // Ambil Y-M-D menurut waktu Jakarta, lalu buat Date baru jam 00:00 UTC
  // supaya perbandingan antar tanggal tidak terpengaruh jam/menit.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {})
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`)
}

function addDays(dateOnly, n) {
  const d = new Date(dateOnly)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

// 0 = Minggu, 6 = Sabtu (berdasarkan tanggal kalender, bukan Date.getDay()
// yang bisa salah zona — di sini dateOnly sudah dibuat dari string Y-M-D jam 00:00 UTC)
function isWeekend(dateOnly) {
  const day = dateOnly.getUTCDay()
  return day === 0 || day === 6
}

function nextBusinessDay(dateOnly) {
  let d = addDays(dateOnly, 1)
  while (isWeekend(d)) d = addDays(d, 1)
  return d
}

function sameDate(a, b) {
  return a.getTime() === b.getTime()
}

// Selisih hari kalender (bukan hari kerja) antara dua tanggal, dibulatkan
// ke bawah. Dipakai untuk angka "> N hari" di pesan, sama seperti kolom
// Delay di Dashboard.
function calendarDaysBetween(dateOnlyA, dateOnlyB) {
  const ms = dateOnlyB.getTime() - dateOnlyA.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function jakartaDateKey(dateOnly) {
  return dateOnly.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

function tsToDateOnly(ts) {
  if (!ts) return null
  const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
  return toJakartaDateOnly(date)
}

// Field `date` di dokumen report adalah string "YYYY-MM-DD" yang diinput
// manual di form (tanggal problem ditemukan), bukan Firestore Timestamp.
// Sudah berupa tanggal kalender apa adanya, tidak perlu konversi zona waktu.
function dateStringToDateOnly(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  return new Date(`${dateStr}T00:00:00Z`)
}

// ── EmailJS REST API (server-side, pakai private key sebagai accessToken) ──
async function sendReminderEmail({ to_email, unit_no, model, problem, stage, days }) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_REMINDER_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email, unit_no, model, problem,
        stage: stage === 'progress' ? 'Progress' : 'Verification',
        days: String(days),
        link: APP_LINK,
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`EmailJS ${res.status}: ${await res.text()}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const today = toJakartaDateOnly(new Date())

  const recipientsSnap = await db.collection('notificationEmails').get()
  const recipients = recipientsSnap.docs.map(d => d.data().email).filter(Boolean)
  if (recipients.length === 0) {
    console.log('Tidak ada notificationEmails terdaftar, tidak ada yang dikirim.')
    return
  }

  const reportsSnap = await db.collection('reports').get()
  let sentCount = 0

  for (const docSnap of reportsSnap.docs) {
    const report = docSnap.data()
    const progress = report.progress ?? 0
    const verification = report.verification ?? 0

    // ── Tahap Progress ──
    if (progress < 4) {
      const baseDate = dateStringToDateOnly(report.date)
      const dueDate  = baseDate && nextBusinessDay(baseDate)
      const alreadySentToday = report.progressReminderLastSentDate === jakartaDateKey(today)
      const isDueOrLater = dueDate && today.getTime() >= dueDate.getTime() && !isWeekend(today)

      if (isDueOrLater && !alreadySentToday) {
        const days = calendarDaysBetween(baseDate, today)
        await Promise.allSettled(
          recipients.map(to_email => sendReminderEmail({
            to_email,
            unit_no: report.unitNo || '-',
            model: report.model || '-',
            problem: report.problem || '-',
            stage: 'progress',
            days,
          }))
        )
        await docSnap.ref.update({ progressReminderLastSentDate: jakartaDateKey(today) })
        sentCount++
        console.log(`Reminder progress terkirim (> ${days} hari): ${report.unitNo}`)
      }
    }

    // ── Tahap Verification (hanya relevan kalau progress sudah 4) ──
    if (progress >= 4 && verification < 1) {
      const baseDate = tsToDateOnly(report.progressTimestamps?.['4'])
      const dueDate  = baseDate && nextBusinessDay(baseDate)
      const alreadySentToday = report.verificationReminderLastSentDate === jakartaDateKey(today)
      const isDueOrLater = dueDate && today.getTime() >= dueDate.getTime() && !isWeekend(today)

      if (isDueOrLater && !alreadySentToday) {
        const days = calendarDaysBetween(baseDate, today)
        await Promise.allSettled(
          recipients.map(to_email => sendReminderEmail({
            to_email,
            unit_no: report.unitNo || '-',
            model: report.model || '-',
            problem: report.problem || '-',
            stage: 'verification',
            days,
          }))
        )
        await docSnap.ref.update({ verificationReminderLastSentDate: jakartaDateKey(today) })
        sentCount++
        console.log(`Reminder verification terkirim (> ${days} hari): ${report.unitNo}`)
      }
    }
  }

  console.log(`Selesai. ${sentCount} reminder terkirim dari ${reportsSnap.size} laporan.`)
}

main().catch(err => {
  console.error('Reminder job gagal:', err)
  process.exit(1)
})
