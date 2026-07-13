import type { Server as SocketServer, Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import type { BoardNode, BoardEdge } from '@board/shared'
import { getBoard, updateBoard } from '../models/store.js'

interface TabInfo {
  clientId: string
  socketId: string
  joinedAt: string
}

interface ConnectedUser {
  userId: string
  displayName: string
  tabs: TabInfo[]
  activeTabCount: number
}

interface ControlRequest {
  id: string
  userId: string
  displayName: string
  requestedAt: string
  status: 'pending' | 'accepted' | 'rejected'
}

interface RoomState {
  boardId: string
  users: Map<string, ConnectedUser>
  controlOwnerId: string | null
  pendingRequests: ControlRequest[]
}

const rooms = new Map<string, RoomState>()

function getOrCreateRoom(boardId: string): RoomState {
  let room = rooms.get(boardId)
  if (!room) {
    room = {
      boardId,
      users: new Map(),
      controlOwnerId: null,
      pendingRequests: [],
    }
    rooms.set(boardId, room)
  }
  return room
}

function broadcastRoomState(io: SocketServer, boardId: string) {
  const room = rooms.get(boardId)
  if (!room) return

  const state = {
    boardId: room.boardId,
    controlOwnerId: room.controlOwnerId,
    connectedUsers: Array.from(room.users.values()).map((u) => ({
      userId: u.userId,
      displayName: u.displayName,
      joinedAt: u.tabs[0]?.joinedAt || '',
      tabCount: u.activeTabCount,
    })),
    pendingRequests: room.pendingRequests,
  }

  io.to(`board:${boardId}`).emit('collaboration-state', state)
}

export function setupCollaboration(io: SocketServer) {
  io.on('connection', (socket: Socket) => {
    let currentBoardId: string | null = null
    let currentUserId: string | null = null
    let currentClientId: string | null = null

    socket.on('join-board', (payload: { boardId: string; userId: string; clientId: string; displayName: string }) => {
      const { boardId, userId, clientId, displayName } = payload

      const board = getBoard(boardId)
      if (!board) {
        socket.emit('error', { message: 'Board not found' })
        return
      }

      currentBoardId = boardId
      currentUserId = userId
      currentClientId = clientId

      socket.join(`board:${boardId}`)

      const room = getOrCreateRoom(boardId)
      let user = room.users.get(userId)
      if (!user) {
        user = {
          userId,
          displayName,
          tabs: [],
          activeTabCount: 0,
        }
        room.users.set(userId, user)
      } else {
        user.displayName = displayName
      }

      const existingTab = user.tabs.find((t) => t.clientId === clientId)
      if (!existingTab) {
        user.tabs.push({
          clientId,
          socketId: socket.id,
          joinedAt: new Date().toISOString(),
        })
        user.activeTabCount = user.tabs.length
      }

      if (!room.controlOwnerId) {
        room.controlOwnerId = clientId
      }

      socket.emit('joined', { userId, clientId })
      broadcastRoomState(io, boardId)
    })

    socket.on('leave-board', () => {
      if (!currentBoardId || !currentUserId || !currentClientId) return
      leaveBoard(io, socket, currentBoardId, currentUserId, currentClientId)
    })

    socket.on('disconnect', () => {
      if (!currentBoardId || !currentUserId || !currentClientId) return
      leaveBoard(io, socket, currentBoardId, currentUserId, currentClientId)
    })

    socket.on('request-control', (payload: { displayName: string }) => {
      if (!currentBoardId || !currentUserId) return
      const room = rooms.get(currentBoardId)
      if (!room) return

      const existing = room.pendingRequests.find(
        (r) => r.userId === currentUserId && r.status === 'pending'
      )
      if (existing) return

      const user = room.users.get(currentUserId)
      const request: ControlRequest = {
        id: uuidv4(),
        userId: currentUserId,
        displayName: payload.displayName || user?.displayName || 'Unknown',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      }
      room.pendingRequests.push(request)
      broadcastRoomState(io, currentBoardId)

      const ownerUser = room.controlOwnerId
        ? findUserByClientId(room, room.controlOwnerId)
        : null
      if (ownerUser) {
        const ownerSocketIds = room.users.get(ownerUser.userId)?.tabs.map((t) => t.socketId) || []
        ownerSocketIds.forEach((sid) => {
          io.to(sid).emit('control-requested', request)
        })
      }
    })

    socket.on('accept-control', (payload: { requestId: string }) => {
      if (!currentBoardId || !currentUserId || !currentClientId) return
      const room = rooms.get(currentBoardId)
      if (!room || room.controlOwnerId !== currentClientId) return

      const request = room.pendingRequests.find((r) => r.id === payload.requestId)
      if (!request || request.status !== 'pending') return

      request.status = 'accepted'
      const previousOwner = room.controlOwnerId

      // Transfer control to the requesting user's first tab
      const targetUser = room.users.get(request.userId)
      if (targetUser && targetUser.tabs.length > 0) {
        room.controlOwnerId = targetUser.tabs[0].clientId
      }

      io.to(`board:${currentBoardId}`).emit('control-transferred', {
        fromClientId: previousOwner,
        toUserId: request.userId,
      })

      room.pendingRequests = room.pendingRequests.filter(
        (r) => r.id !== payload.requestId
      )
      broadcastRoomState(io, currentBoardId)
    })

    socket.on('reject-control', (payload: { requestId: string }) => {
      if (!currentBoardId || !currentUserId || !currentClientId) return
      const room = rooms.get(currentBoardId)
      if (!room || room.controlOwnerId !== currentClientId) return

      const request = room.pendingRequests.find((r) => r.id === payload.requestId)
      if (!request) return

      request.status = 'rejected'
      room.pendingRequests = room.pendingRequests.filter(
        (r) => r.id !== payload.requestId
      )
      broadcastRoomState(io, currentBoardId)
    })

    socket.on('take-control', () => {
      if (!currentBoardId || !currentClientId) return
      const room = rooms.get(currentBoardId)
      if (!room || room.controlOwnerId !== null) return
      room.controlOwnerId = currentClientId
      socket.emit('control-granted', { clientId: currentClientId })
      broadcastRoomState(io, currentBoardId)
    })

    socket.on('release-control', () => {
      if (!currentBoardId || !currentClientId) return
      const room = rooms.get(currentBoardId)
      if (!room || room.controlOwnerId !== currentClientId) return

      room.controlOwnerId = null
      broadcastRoomState(io, currentBoardId)
    })

    socket.on('board-update', (payload: { nodes?: BoardNode[]; edges?: BoardEdge[] }) => {
      if (!currentBoardId || !currentClientId) return
      const room = rooms.get(currentBoardId)
      if (!room || room.controlOwnerId !== currentClientId) return

      if (payload.nodes || payload.edges) {
        updateBoard(currentBoardId, {
          nodes: payload.nodes,
          edges: payload.edges,
        })
      }

      socket.to(`board:${currentBoardId}`).emit('board-updated', {
        userId: currentUserId,
        nodes: payload.nodes,
        edges: payload.edges,
      })
    })

    socket.on('cursor-move', (payload: { position: { x: number; y: number } }) => {
      if (!currentBoardId || !currentUserId) return
      socket.to(`board:${currentBoardId}`).emit('cursor-moved', {
        userId: currentUserId,
        clientId: currentClientId,
        position: payload.position,
      })
    })
  })
}

function findUserByClientId(room: RoomState, clientId: string): ConnectedUser | undefined {
  for (const user of room.users.values()) {
    if (user.tabs.some((t) => t.clientId === clientId)) return user
  }
  return undefined
}

function leaveBoard(io: SocketServer, socket: Socket, boardId: string, userId: string, clientId: string) {
  const room = rooms.get(boardId)
  if (!room) return

  const user = room.users.get(userId)
  if (!user) return

  user.tabs = user.tabs.filter((t) => t.clientId !== clientId)
  user.activeTabCount = user.tabs.length

  if (user.tabs.length === 0) {
    room.users.delete(userId)
  }

  if (room.controlOwnerId === clientId) {
    // Find next available tab to take control
    let nextOwner: string | null = null
    for (const [uid, u] of room.users) {
      if (u.tabs.length > 0) {
        nextOwner = u.tabs[0].clientId
        break
      }
    }
    room.controlOwnerId = nextOwner
  }

  room.pendingRequests = room.pendingRequests.filter(
    (r) => r.userId !== userId || r.status === 'accepted'
  )

  if (room.users.size === 0) {
    rooms.delete(boardId)
  } else {
    broadcastRoomState(io, boardId)
  }
}
