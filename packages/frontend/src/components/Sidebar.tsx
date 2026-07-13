import { useCallback } from 'react'
import { getNodeTypesByCategory } from '@board/shared'
import type { NodeTypeDefinition, FlowDirection, NodeCategory } from '@board/shared'
import { useBoardStore } from '../store/boardStore.js'
const CATEGORIES: { key: NodeCategory; icon: string; label: string }[] = [
  { key: 'databases', icon: '🗄️', label: 'Databases' },
  { key: 'cache', icon: '⚡', label: 'Cache' },
  { key: 'network', icon: '🌐', label: 'Network' },
  { key: 'load-balancer', icon: '⚖️', label: 'Load Balancer' },
  { key: 'components', icon: '📦', label: 'Components' },
  { key: 'application-server', icon: '🖥️', label: 'Application Server' },
  { key: 'shapes', icon: '🔲', label: 'Shapes' },
  { key: 'messaging-queues', icon: '📨', label: 'Messaging Queues' },
]

const FLOW_DIRECTIONS: { dir: FlowDirection; icon: string; label: string }[] = [
  { dir: 'ltr', icon: '→', label: 'Left to Right' },
  { dir: 'rtl', icon: '←', label: 'Right to Left' },
  { dir: 'bidirectional', icon: '↔', label: 'Bidirectional' },
  { dir: 'none', icon: '—', label: 'No Direction' },
]

const SELECTION_TOOLS = [
  { tool: 'pan' as const, icon: '✋', label: 'Pan' },
  { tool: 'rectangle' as const, icon: '▭', label: 'Rectangle' },
  { tool: 'freeform' as const, icon: '✏️', label: 'Freeform' },
]

export function Sidebar() {
  const sidebarOpen = useBoardStore((s) => s.sidebarOpen)
  const toggleSidebar = useBoardStore((s) => s.toggleSidebar)
  const flowDirection = useBoardStore((s) => s.flowDirection)
  const setFlowDirection = useBoardStore((s) => s.setFlowDirection)
  const activeTool = useBoardStore((s) => s.activeTool)
  const setActiveTool = useBoardStore((s) => s.setActiveTool)

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData('application/node-type', nodeType)
      event.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  const currentToolIcon = SELECTION_TOOLS.find((t) => t.tool === activeTool)?.icon || '✋'

  return (
    <>
      {/* Floating button for collapsed state */}
      {!sidebarOpen && (
        <div className="sidebar-floating">
          <button className="sidebar-floating-btn" onClick={toggleSidebar} style={{ fontSize: 18 }} title="Open palette">
            ☰
          </button>
        </div>
      )}

      {/* Expanded palette panel */}
      {sidebarOpen && (
        <div style={{
          width: 140, background: '#1a1a2e', color: '#eee',
          display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a4a',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid #2a2a4a',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>🏗️ Palette</span>
            <button className="modal-close" onClick={toggleSidebar}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {/* Selection tools */}
            <SectionTitle text="Selection" />
            <div className="tooltip-grid" style={{ marginBottom: 10 }}>
              {SELECTION_TOOLS.map((t) => (
                <span
                  key={t.tool}
                  className={`tooltip-item ${activeTool === t.tool ? 'tooltip-item-active' : ''}`}
                  onClick={() => setActiveTool(t.tool)}
                  style={{ cursor: 'pointer' }}
                  title={t.label}
                >
                  {t.icon}
                </span>
              ))}
            </div>

            {/* Flow direction */}
            <SectionTitle text="Connection" />
            <div className="tooltip-grid" style={{ marginBottom: 10 }}>
              {FLOW_DIRECTIONS.map((f) => (
                <span
                  key={f.dir}
                  className={`tooltip-item ${flowDirection === f.dir ? 'tooltip-item-active' : ''}`}
                  onClick={() => setFlowDirection(f.dir)}
                  style={{ cursor: 'pointer' }}
                  title={f.label}
                >
                  {f.icon}
                </span>
              ))}
            </div>

            {/* Node type categories */}
            {CATEGORIES.map((cat) => {
              const types = getNodeTypesByCategory(cat.key)
              if (types.length === 0) return null
              return (
                <div key={cat.key}>
                  <SectionTitle text={cat.label} icon={cat.icon} />
                  <div className="tooltip-grid" style={{ marginBottom: 10 }}>
                    {types.map((def) => (
                      <span
                        key={def.type}
                        className="tooltip-item"
                        draggable
                        onDragStart={(e) => onDragStart(e, def.type)}
                        title={def.label}
                      >
                        {def.icon}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}

          </div>
        </div>
      )}
    </>
  )
}

function SectionTitle({ text, icon }: { text: string; icon?: string }) {
  return (
    <div style={{
      fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#888',
      padding: '4px 4px 6px', display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {icon && <span>{icon}</span>}
      {text}
    </div>
  )
}
