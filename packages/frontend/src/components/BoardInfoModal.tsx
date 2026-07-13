import { useCallback, useState } from 'react'
import { useBoardStore } from '../store/boardStore.js'

interface BoardInfoModalProps {
  open: boolean
  onClose: () => void
}

export function BoardInfoModal({ open, onClose }: BoardInfoModalProps) {
  const problemStatement = useBoardStore((s) => s.problemStatement)
  const notes = useBoardStore((s) => s.notes)
  const setProblemStatement = useBoardStore((s) => s.setProblemStatement)
  const setNotes = useBoardStore((s) => s.setNotes)
  const [loading, setLoading] = useState(false)

  const handleAskQuestion = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate-hld', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.problemStatement) setProblemStatement(data.problemStatement)
      setNotes({
        functional: data.functional || notes.functional,
        nonFunctional: data.nonFunctional || notes.nonFunctional,
        calculations: data.calculations || notes.calculations,
        architecture: notes.architecture,
      })
    } catch (err) {
      console.error('HLD generate error:', err)
    } finally {
      setLoading(false)
    }
  }, [setProblemStatement, setNotes, notes])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <h3>📋 Board Context</h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <button
            className="topbar-btn"
            onClick={handleAskQuestion}
            disabled={loading}
            style={{ marginBottom: 16, width: '100%', justifyContent: 'center', padding: '8px 0' }}
          >
            {loading ? '⏳ Generating...' : '🎲 Ask Question (Random HLD)'}
          </button>

          <div className="config-field">
            <label style={{ fontSize: 14, fontWeight: 600, color: '#eee' }}>
              Problem Statement
            </label>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
              What are you trying to build? This context is passed to the AI assistant for better recommendations.
            </p>
            <textarea
              className="config-field-textarea"
              rows={4}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Describe the system you are designing..."
              style={textareaStyle}
            />
          </div>

          <div style={{ height: 1, background: '#2a2a4a', margin: '20px 0' }} />

          <label style={{ fontSize: 14, fontWeight: 600, color: '#eee', display: 'block', marginBottom: 12 }}>
            Notes
          </label>

          <SectionField
            title="Functional Requirements"
            value={notes.functional}
            onChange={(v) => setNotes({ ...notes, functional: v })}
            placeholder="List functional requirements..."
          />
          <SectionField
            title="Non-Functional Requirements"
            value={notes.nonFunctional}
            onChange={(v) => setNotes({ ...notes, nonFunctional: v })}
            placeholder="Latency, availability, consistency, security..."
          />
          <SectionField
            title="Calculations / Capacity Planning"
            value={notes.calculations}
            onChange={(v) => setNotes({ ...notes, calculations: v })}
            placeholder="DAU estimates, traffic volume, storage needs, bandwidth, cost projections..."
          />

          <div style={{ height: 1, background: '#2a2a4a', margin: '20px 0' }} />

          <SectionField
            title="Architecture Description"
            value={notes.architecture}
            onChange={(v) => setNotes({ ...notes, architecture: v })}
            placeholder="Describe the overall architecture: what each component does, how data/request flows, how functional/non-functional requirements are met, and how the system scales..."
          />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #3a3a5a',
  background: '#0f0f1a',
  color: '#eee',
  fontSize: 13,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.5,
}

function SectionField({
  title,
  value,
  onChange,
  placeholder,
}: {
  title: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="config-field">
      <label>{title}</label>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={textareaStyle} />
    </div>
  )
}
