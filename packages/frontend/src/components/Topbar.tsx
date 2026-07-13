import { useCallback, useState } from 'react'
import { useBoardStore } from '../store/boardStore.js'
import { BoardInfoModal } from './BoardInfoModal.js'
import { SettingsModal } from './SettingsModal.js'

export function Topbar() {
  const boardName = useBoardStore((s) => s.boardName)
  const boardId = useBoardStore((s) => s.boardId)
  const collaboration = useBoardStore((s) => s.collaboration)
  const sidebarOpen = useBoardStore((s) => s.sidebarOpen)
  const toggleSidebar = useBoardStore((s) => s.toggleSidebar)
  const chatOpen = useBoardStore((s) => s.chatOpen)
  const toggleChat = useBoardStore((s) => s.toggleChat)
  const toggleSettings = useBoardStore((s) => s.toggleSettings)
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)
  const undoStack = useBoardStore((s) => s.undoStack)
  const redoStack = useBoardStore((s) => s.redoStack)
  const layoutDirection = useBoardStore((s) => s.layoutDirection)
  const setLayoutDirection = useBoardStore((s) => s.setLayoutDirection)
  const edgeStyle = useBoardStore((s) => s.edgeStyle)
  const setEdgeStyle = useBoardStore((s) => s.setEdgeStyle)
  const reLayout = useBoardStore((s) => s.reLayout)
  const setBoardName = useBoardStore((s) => s.setBoardName)
  const selectedGroupIds = useBoardStore((s) => s.selectedGroupIds)
  const nodes = useBoardStore((s) => s.nodes)
  const createGroup = useBoardStore((s) => s.createGroup)
  const [copied, setCopied] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(boardName)

  const isOwner = collaboration.controlOwnerId === collaboration.myUserId
  const hasControl = !!collaboration.controlOwnerId

  const shareUrl = boardId
    ? `${window.location.origin}${window.location.pathname}?board=${boardId}`
    : null

  const handleShare = useCallback(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  const handleGroupSelection = useCallback(() => {
    if (nodes.length === 0) return
    const minX = Math.min(...nodes.map((n) => n.position.x))
    const minY = Math.min(...nodes.map((n) => n.position.y))
    createGroup(
      nodes.map((n) => n.id),
      { x: minX - 20, y: minY - 40 }
    )
  }, [nodes, createGroup])

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-btn" onClick={toggleSidebar} style={{ fontSize: 16, padding: '4px 8px' }}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim()
              if (trimmed && trimmed !== boardName) setBoardName(trimmed)
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = nameDraft.trim()
                if (trimmed && trimmed !== boardName) setBoardName(trimmed)
                setEditingName(false)
              }
              if (e.key === 'Escape') {
                setNameDraft(boardName)
                setEditingName(false)
              }
            }}
            style={{
              background: '#0f0f1a',
              border: '1px solid #4a4a6a',
              borderRadius: 6,
              color: '#eee',
              fontSize: 16,
              fontWeight: 500,
              padding: '2px 8px',
              outline: 'none',
              minWidth: 120,
              maxWidth: 260,
            }}
          />
        ) : (
          <h1
            onClick={() => {
              setNameDraft(boardName)
              setEditingName(true)
            }}
            title="Click to rename"
            style={{ cursor: 'pointer' }}
          >
            {boardName}
          </h1>
        )}
        <button className="share-btn" onClick={handleShare}>
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="topbar-actions">
          <button className="topbar-btn" onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
            ↩️
          </button>
          <button className="topbar-btn" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
            ↪️
          </button>
          <button className="topbar-btn" onClick={() => setInfoOpen(true)} title="Board context">
            📋
          </button>
          <button className="topbar-btn" onClick={toggleSettings} title="AI settings">
            ⚙️
          </button>
          <select
            value={layoutDirection}
            onChange={(e) => { setLayoutDirection(e.target.value as 'TB' | 'LR'); setTimeout(() => reLayout(), 50) }}
            style={{
              background: '#1a1a2e', color: '#ccc', border: '1px solid #4a4a6a',
              borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="TB">⬇ Top→Bottom</option>
            <option value="LR">➡ Left→Right</option>
          </select>
          <button className="topbar-btn" onClick={() => setEdgeStyle(edgeStyle === 'smoothstep' ? 'bezier' : 'smoothstep')} title="Toggle edge style">
            {edgeStyle === 'smoothstep' ? '📐' : '〰️'}
          </button>
          <button className="topbar-btn" onClick={() => reLayout()} title="Re-layout graph">
            🔄
          </button>
          <button
            className={`topbar-btn ${chatOpen ? 'active' : ''}`}
            onClick={toggleChat}
          >
            💬 AI
          </button>
        </div>
        <BoardInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        <SettingsModal />
        <div className="control-indicator">
          <span
            className={`control-dot ${isOwner ? 'owned' : hasControl ? 'none' : 'none'}`}
          />
          <span>
            {isOwner
              ? 'You have control'
              : hasControl
                ? 'View only'
                : 'No connected users'}
          </span>
          {collaboration.connectedUsers.length > 0 && (
            <span style={{ color: '#666' }}>
              · {collaboration.connectedUsers.length} online
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
