import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

type Challenge = { id: string; title: string; description: string | null; points: number; ends_at: string | null }
type Row = { user_id: string; points: number; reason: string | null; created_at: string }
const API = import.meta.env.VITE_API_URL as string | undefined
const level = (p: number) => Math.floor(p / 100) + 1

export default function App() {
  const [uid, setUid] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ch, setCh] = useState<Challenge[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'ch' | 'lb' | 'me'>('ch')
  const [msg, setMsg] = useState('')

  async function load() {
    const [c, p] = await Promise.all([
      supabase.from('ilg_challenges').select('id,title,description,points,ends_at').eq('is_active', true),
      supabase.from('ilg_points_ledger').select('user_id,points,reason,created_at'),
    ])
    if (c.error || p.error) setErr((c.error || p.error)!.message); else { setCh(c.data as Challenge[]); setRows(p.data as Row[]) }
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUid(data.session?.user.id ?? null); setToken(data.session?.access_token ?? null) })
    load()
  }, [])

  const board = useMemo(() => {
    const m = new Map<string, number>()
    rows.forEach(r => m.set(r.user_id, (m.get(r.user_id) ?? 0) + r.points))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  }, [rows])
  const mine = rows.filter(r => r.user_id === uid)
  const total = mine.reduce((s, r) => s + r.points, 0)

  async function complete(id: string) {
    if (!API || !token) return
    const reasons: Record<number, string> = { 401: 'انتهت الجلسة، سجّل الدخول مجددًا', 404: 'التحدي غير متاح', 409: 'أنجزت هذا التحدي من قبل', 410: 'انتهى هذا التحدي', 429: 'محاولات كثيرة، انتظر قليلًا' }
    try {
      const r = await fetch(`${API}/challenges/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      setMsg(r.ok ? 'تم تسجيل الإنجاز' : reasons[r.status] ?? 'تعذر تسجيل الإنجاز')
    } catch { setMsg('تعذر الاتصال بالخادم') }
    load()
  }

  const tabs = [['ch', 'التحديات'], ['lb', 'المتصدرون'], ['me', 'إنجازاتي']] as const
  return (
    <div className="min-h-screen max-w-3xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">iLogia <span className="text-gold">Arena</span></h1>
        {uid ? <span className="card !p-2 text-sm">المستوى {level(total)} • {total} نقطة</span>
          : <a className="btn-gold" href="https://app.ilogia-eg.com">تسجيل الدخول</a>}
      </header>
      <nav className="flex gap-2">{tabs.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-sm ${tab === k ? 'bg-navy text-white' : 'bg-white border border-navy/10'}`}>{l}</button>))}</nav>
      {err && <p className="card text-red-700">{err}</p>}
      {msg && <p className="card text-green-800">{msg}</p>}
      {tab === 'ch' && <div className="grid gap-3 sm:grid-cols-2">
        {ch.length === 0 && <p className="text-navy/50">لا توجد تحديات نشطة حاليًا.</p>}
        {ch.map(c => (
          <div key={c.id} className="card flex flex-col gap-2">
            <h3 className="font-bold">{c.title}</h3>
            <p className="text-sm text-navy/70 flex-1">{c.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-gold font-bold">+{c.points}</span>
              <button className="btn" disabled={!uid || !API} onClick={() => complete(c.id)}>إنجاز</button>
            </div>
          </div>))}
        {!API && <p className="text-xs text-navy/50 sm:col-span-2">تسجيل الإنجاز سيُفعّل بعد ربط api.ilogia-eg.com؛ النقاط تُمنح من السيرفر فقط.</p>}
      </div>}
      {tab === 'lb' && <ol className="card divide-y divide-navy/10">
        {board.length === 0 && <li className="py-2 text-navy/50">لا توجد نقاط بعد.</li>}
        {board.map(([id, p], i) => (
          <li key={id} className={`flex justify-between py-2 ${id === uid ? 'font-bold text-gold' : ''}`}>
            <span>{i + 1}. {id === uid ? 'أنت' : 'طالب ' + id.slice(0, 4)}</span><span>{p}</span></li>))}
      </ol>}
      {tab === 'me' && <ul className="card divide-y divide-navy/10">
        {!uid && <li className="py-2 text-navy/50">سجّل الدخول لعرض إنجازاتك.</li>}
        {mine.map((r, i) => <li key={i} className="flex justify-between py-2"><span>{r.reason ?? 'نقاط'}</span><span>+{r.points}</span></li>)}
      </ul>}
    </div>
  )
}
