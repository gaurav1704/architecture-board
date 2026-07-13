export interface CollaborationState {
  boardId: string
  controlOwnerId: string | null
  connectedUsers: ConnectedUser[]
  pendingRequests: ControlRequest[]
}

export interface ConnectedUser {
  userId: string
  displayName: string
  joinedAt: string
}

export interface ControlRequest {
  id: string
  userId: string
  displayName: string
  requestedAt: string
  status: 'pending' | 'accepted' | 'rejected'
}

export type WsMessage =
  | { type: 'join-board'; payload: { boardId: string; userId: string; displayName: string } }
  | { type: 'leave-board'; payload: { boardId: string; userId: string } }
  | { type: 'request-control'; payload: { boardId: string; userId: string; displayName: string } }
  | { type: 'accept-control'; payload: { boardId: string; requestId: string } }
  | { type: 'reject-control'; payload: { boardId: string; requestId: string } }
  | { type: 'release-control'; payload: { boardId: string; userId: string } }
  | { type: 'board-update'; payload: { boardId: string; nodes?: any[]; edges?: any[] } }
  | { type: 'cursor-move'; payload: { boardId: string; userId: string; position: { x: number; y: number } } }

export type WsResponse =
  | { type: 'collaboration-state'; payload: CollaborationState }
  | { type: 'control-granted'; payload: { userId: string } }
  | { type: 'control-revoked'; payload: {} }
  | { type: 'board-updated'; payload: { userId: string; nodes?: any[]; edges?: any[] } }
  | { type: 'error'; payload: { message: string } }
