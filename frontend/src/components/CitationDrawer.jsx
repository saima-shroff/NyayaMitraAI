import { useEffect, useState } from 'react'
import api, { errorMessage } from '../services/api'

export default function CitationDrawer({ sectionNumber, onClose }) {
  const [section, setSection] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!sectionNumber) return
    setSection(null)
    setError('')
    setSaved(false)
    setNotes('')
    api.get(`/api/bns/sections/${sectionNumber}`).then((r) => setSection(r.data)).catch((e) => setError(errorMessage(e)))
  }, [sectionNumber])

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!sectionNumber) return null

  const save = async () => {
    try {
      await api.post('/api/bookmarks', { section_number: section.section_number, notes })
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-navy-900 p-5">
          <div>
            <span className="badge">BNS Section {sectionNumber}</span>
            <h2 className="mt-2 font-serif text-xl font-bold text-white">{section?.title || 'Loading...'}</h2>
            {section && <p className="mt-1 text-xs text-slate-400">{section.chapter}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-slate-400 hover:text-white">×</button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {section && (
            <>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Official text</h3>
                <p className="whitespace-pre-line rounded-lg border-l-4 border-gold-500 bg-slate-50 p-4 font-serif text-[15px] leading-relaxed">
                  {section.text}
                </p>
              </section>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Punishment</h3>
                <p className="text-sm">{section.punishment}</p>
              </section>
              {section.ipc_equivalent && (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Corresponding IPC provision</h3>
                  <p className="text-sm">{section.ipc_equivalent}</p>
                </section>
              )}
              <p className="text-xs text-slate-400">Verify against the official gazette before relying on this text.</p>
            </>
          )}
        </div>

        {section && (
          <div className="border-t border-slate-200 p-4">
            {saved ? (
              <p className="text-sm font-medium text-green-700">Saved to your bookmarks.</p>
            ) : (
              <div className="flex gap-2">
                <input className="input" placeholder="Optional research note" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button className="btn-gold shrink-0" onClick={save}>Bookmark</button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
