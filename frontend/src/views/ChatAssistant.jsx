import { useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../services/api'
import ChatBubble from '../components/ChatBubble'
import CitationDrawer from '../components/CitationDrawer'

const SUGGESTIONS = [
  'What is the punishment for murder?',
  'What is the difference between theft and robbery?',
  'Someone stole my phone. Which section applies?',
  'What counts as criminal breach of trust?',
  'Is online defamation a crime?',
  'When can I use the right of private defence?',
]

export default function ChatAssistant() {
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(null)
  const endRef = useRef(null)

  const loadSessions = () => api.get('/api/chat/sessions').then((r) => setSessions(r.data)).catch(() => {})

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const openSession = async (id) => {
    setActiveId(id)
    setError('')
    try {
      const { data } = await api.get(`/api/chat/sessions/${id}/messages`)
      setMessages(data)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const newChat = () => { setActiveId(null); setMessages([]); setError('') }

  const removeSession = async (id) => {
    await api.delete(`/api/chat/sessions/${id}`)
    if (id === activeId) newChat()
    loadSessions()
  }

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (q.length < 3 || loading) return
    setInput('')
    setError('')
    setLoading(true)
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, sender: 'user', text_content: q, citations: [] }])
    try {
      const { data } = await api.post('/api/chat/query', { query: q, session_id: activeId })
      setActiveId(data.session_id)
      setMessages((m) => [...m.filter((x) => !String(x.id).startsWith('tmp-')), data.user_message, { ...data.assistant_message, provider: data.provider }])
      loadSessions()
    } catch (e) {
      setError(errorMessage(e, 'Could not get an answer. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="p-3">
          <button className="btn-gold w-full" onClick={newChat}>+ New chat</button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                s.id === activeId ? 'bg-amber-50 text-gold-600' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <button className="flex-1 truncate text-left" onClick={() => openSession(s.id)}>{s.title}</button>
              <button
                className="ml-2 hidden text-slate-400 hover:text-red-600 group-hover:block"
                onClick={() => removeSession(s.id)}
                aria-label="Delete chat"
              >×</button>
            </div>
          ))}
          {sessions.length === 0 && <p className="px-3 text-xs text-slate-400">No conversations yet.</p>}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 && !loading && (
              <div className="py-10 text-center">
                <span className="badge">Bharatiya Nyaya Sanhita, 2023</span>
                <h2 className="mt-3 font-serif text-3xl font-bold text-navy-900">How can I help with your legal research?</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                  Ask about offences, definitions and punishments. Answers are grounded in BNS text and cite their sources.
                </p>
                <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="card px-4 py-3 text-left text-sm hover:border-gold-500">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} onOpenCitation={setDrawer} />
            ))}
            {loading && (
              <div className="card inline-block rounded-2xl px-4 py-3 text-sm text-slate-500">Researching the statute...</div>
            )}
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send() }}
          className="border-t border-slate-200 bg-white p-3"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              className="input"
              placeholder="Ask a question about Indian criminal law..."
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn-gold" disabled={loading || input.trim().length < 3}>Send</button>
          </div>
          <p className="mx-auto mt-1 max-w-3xl text-center text-[11px] text-slate-400">
            General legal information, not legal advice.
          </p>
        </form>
      </section>

      <CitationDrawer sectionNumber={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}
