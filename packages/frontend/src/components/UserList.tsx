import { useCallback } from 'react'
import { useBoardStore } from '../store/boardStore.js'
import { getSocket } from '../hooks/useSocket.js'
import { getDisplayName, getUserId } from '../hooks/identity.js'

export function UserList() {
  const connectedUsers = useBoardStore((s) => s.collaboration.connectedUsers)
  const controlOwnerId = useBoardStore((s) => s.collaboration.controlOwnerId)
  const myUserId = useBoardStore((s) => s.collaboration.myUserId)
  const pendingRequests = useBoardStore((s) => s.collaboration.pendingRequests)

  const isOwner = myUserId === controlOwnerId

  const noOwner = controlOwnerId === null

  const handleTakeControl = useCallback(() => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('take-control')
  }, [])

  const handleRequestControl = useCallback(() => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('request-control', { displayName: getDisplayName(getUserId()) })
  }, [])

  const handleReleaseControl = useCallback(() => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('release-control')
  }, [])

  const handleAcceptRequest = useCallback((requestId: string) => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('accept-control', { requestId })
  }, [])

  const handleRejectRequest = useCallback((requestId: string) => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('reject-control', { requestId })
  }, [])

  return (
    <div className="palette-category">
      <div className="palette-category-title">
        Online · {connectedUsers.length}
      </div>

      {connectedUsers.length === 0 && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#666' }}>
          No other users connected
        </div>
      )}

      {connectedUsers.map((u) => {
        const hasControl = u.userId === controlOwnerId
        const isMe = myUserId?.startsWith(u.userId)
        return (
          <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, fontSize: 12, color: '#ccc' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: hasControl ? '#27ae60' : '#4a4a6a', flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.displayName}
              {isMe && <span style={{ color: '#888', fontSize: 10, marginLeft: 2 }}>(you)</span>}
            </span>
            {u.tabCount && u.tabCount > 1 && <span style={{ color: '#666', fontSize: 10 }}>{u.tabCount}t</span>}
            {hasControl && <span style={{ color: '#27ae60', fontSize: 10 }}>🎮</span>}
          </div>
        )
      })}

      <div style={{ padding: '4px 8px', marginTop: 4 }}>
        {isOwner ? (
          <button className="group-node-btn" onClick={handleReleaseControl} style={{ width: '100%', fontSize: 11, padding: '4px 8px' }}>
            Release Control
          </button>
        ) : noOwner ? (
          <button className="group-node-btn" onClick={handleTakeControl} style={{ width: '100%', fontSize: 11, padding: '4px 8px', borderColor: '#27ae60', color: '#27ae60' }}>
            Take Control
          </button>
        ) : (
          <button className="group-node-btn" onClick={handleRequestControl} style={{ width: '100%', fontSize: 11, padding: '4px 8px' }}>
            Request Control
          </button>
        )}
      </div>

      {isOwner && pendingRequests.length > 0 && (
        <div style={{ borderTop: '1px solid #2a2a4a', marginTop: 6, paddingTop: 6 }}>
          <div style={{ fontSize: 10, color: '#f39c12', padding: '2px 8px', marginBottom: 4 }}>
            Control Requests
          </div>
          {pendingRequests.filter((r) => r.status === 'pending').map((req) => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
              <span style={{ flex: 1, fontSize: 11, color: '#ccc' }}>{req.displayName}</span>
              <button className="group-node-btn" style={{ fontSize: 10, padding: '2px 6px', color: '#27ae60' }} onClick={() => handleAcceptRequest(req.id)}>✓</button>
              <button className="group-node-btn" style={{ fontSize: 10, padding: '2px 6px', color: '#e74c3c' }} onClick={() => handleRejectRequest(req.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
