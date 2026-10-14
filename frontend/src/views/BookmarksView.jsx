import { useEffect, useState } from 'react'
import api, { errorMessage } from '../services/api'
import CitationDrawer from '../components/CitationDrawer'

function BookmarkItem({ b, onOpen, onDelete, onSaved }) {
  const [notes, setNotes] = useState(b.notes || '')
  const [status, setStatus] = useState('')
  const dirty = notes !== (b.notes || '')

  const save = async () => {
    try {
      await api.put(`/api/bookmarks/${b.id}`, { notes })
      setStatus('Saved')
      onSaved(b.id, notes)
    } catch (e) {
      setStatus(errorMessage(e))
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <button className="text-left" onClick={() => onOpen(b.section_number)}>
          <span className="badge">BNS {b.section_number}</span>
          <h3 className="mt-2 text-sm font-semibold text-navy-900 hover:underline">{b.section_title}</h3>
        </button>
        <button className="text-sm text-slate-400 hover:text-red-600" onClick={() => onDelete(b.id)}>Remove</button>
      </div>
      <textarea
        className="input mt-3 min-h-[80px]"
        placeholder="Add your research notes..."
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setStatus('') }}
      />
      <div className="mt-2 flex items-center gap-3">
        <button className="btn-ghost" disabled={!dirty} onClick={save}>Save note</button>
        <span className="text-xs text-slate-500">{status}</span>
      </div>
    </div>
  )
}

export default function BookmarksView() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [drawer, setDrawer] = useState(null)

  useEffect(() => {
    api.get('/api/bookmarks').then((r) => setItems(r.data)).catch((e) => setError(errorMessage(e))).finally(() => setLoaded(true))
  }, [])

  const remove = async (id) => {
    try {
      await api.delete(`/api/bookmarks/${id}`)
      setItems((l) => l.filter((x) => x.id !== id))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const noteSaved = (id, notes) => setItems((l) => l.map((x) => (x.id === id ? { ...x, notes } : x)))

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="font-serif text-2xl font-bold text-navy-900">Your Bookmarks</h1>
      <p className="mb-5 text-sm text-slate-500">A personal vault of saved sections and research notes.</p>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => <BookmarkItem key={b.id} b={b} onOpen={setDrawer} onDelete={remove} onSaved={noteSaved} />)}
      </div>
      {loaded && items.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-500">
          Nothing saved yet. Open any section in the Explorer or from a chat answer and choose Bookmark.
        </p>
      )}
      <CitationDrawer sectionNumber={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}
