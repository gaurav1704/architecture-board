import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useBoardStore } from '../store/boardStore.js'
import { getUserId, getClientId, getDisplayName } from './identity.js'

let globalSocket: Socket | null = null

export function getSocket(): Socket | null {
  return globalSocket
}

export function useSocket() {
  const boardId = useBoardStore((s) => s.boardId)
  const setCollaboration = useBoardStore((s) => s.setCollaboration)
  const socketRef = useRef<Socket | null>(null)

  const userId = getUserId()
  const clientId = getClientId()

  useEffect(() => {
    if (!boardId) return

    const socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket
    globalSocket = socket

    const onConnect = () => {
      console.log('Socket connected')
      socket.emit('join-board', { boardId, userId, clientId, displayName: getDisplayName(userId) })
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', (err) => console.warn('Socket error:', err.message))
    socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason))

    socket.on('joined', (data: { userId: string; clientId: string }) => {
      setCollaboration({ myUserId: data.clientId })
    })

    socket.on('collaboration-state', (state: any) => {
      setCollaboration({
        connectedUsers: state.connectedUsers || [],
        controlOwnerId: state.controlOwnerId,
        pendingRequests: state.pendingRequests || [],
      })
    })

    socket.on('board-updated', (data: { userId: string; nodes?: any[]; edges?: any[] }) => {
      if (data.nodes) useBoardStore.getState().setNodes(data.nodes)
      if (data.edges) useBoardStore.getState().setEdges(data.edges)
    })

    return () => {
      socket.emit('leave-board', { boardId, clientId })
      socket.disconnect()
      socketRef.current = null
      globalSocket = null
    }
  }, [boardId])

  return socketRef
}
