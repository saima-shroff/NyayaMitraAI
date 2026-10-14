import { useEffect, useState } from 'react'
import api, { errorMessage } from '../services/api'
import SectionCard from '../components/SectionCard'
import CitationDrawer from '../components/CitationDrawer'

export default function SectionBrowser() {
  const [q, setQ] = useState('')
  const [chapter, setChapter] = useState('')
  const [chapters, setChapters] = useState([])
  const [sections, setSections] = useState([])
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(null)

  useEffect(() => { api.get('/api/bns/chapters').then((r) => setChapters(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get('/api/bns/sections', { params: { q: q || undefined, chapter: chapter || undefined } })
        .then((r) => { setSections(r.data); setError('') })
        .catch((e) => setError(errorMessage(e)))
    }, 250)
    return () => clearTimeout(t)
  }, [q, chapter])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="font-serif text-2xl font-bold text-navy-900">BNS Section Explorer</h1>
      <p className="mb-5 text-sm text-slate-500">Browse by chapter or search by keyword, title or section number.</p>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Search e.g. theft, 303, hurt, IPC 302..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:w-80" value={chapter} onChange={(e) => setChapter(e.target.value)}>
          <option value="">All chapters</option>
          {chapters.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => <SectionCard key={s.section_number} section={s} onOpen={setDrawer} />)}
      </div>
      {sections.length === 0 && !error && <p className="py-10 text-center text-sm text-slate-500">No sections match your search.</p>}
      <CitationDrawer sectionNumber={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}
