export default function SectionCard({ section, onOpen, children }) {
  return (
    <div className="card flex flex-col p-4 transition hover:border-gold-500/60 hover:shadow-md">
      <button className="flex-1 text-left" onClick={() => onOpen(section.section_number)}>
        <div className="flex items-center justify-between gap-2">
          <span className="badge">BNS {section.section_number}</span>
          {section.relevance != null && (
            <span className="text-[11px] text-slate-400">{Math.round(section.relevance * 100)}% match</span>
          )}
        </div>
        <h4 className="mt-2 text-sm font-semibold text-navy-900">{section.title}</h4>
        <p className="mt-0.5 text-xs text-slate-500">{section.chapter}</p>
        {section.punishment && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{section.punishment}</p>}
      </button>
      {children}
    </div>
  )
}
