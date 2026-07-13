import type { ReactNode } from 'react'

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <div style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        background: '#2a2a4a', color: '#eee', fontSize: 11, padding: '3px 8px',
        borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 100,
        opacity: 0, transition: 'opacity 0.15s',
      }}
      className="tooltip-content"
      >
        {content}
      </div>
      <style>{`
        div:hover > .tooltip-content { opacity: 1; }
      `}</style>
    </div>
  )
}
