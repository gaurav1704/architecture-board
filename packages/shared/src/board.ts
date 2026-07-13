import type { BoardNode, BoardEdge } from './nodes/base.js'

export interface GroupNode {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
  width: number
  height: number
  childNodeIds: string[]
}

export interface NotesSection {
  functional: string
  nonFunctional: string
  calculations: string
}

export interface Board {
  id: string
  name: string
  shareId: string
  problemStatement: string
  notes: NotesSection
  nodes: BoardNode[]
  edges: BoardEdge[]
  groups: GroupNode[]
  createdAt: string
  updatedAt: string
  ownerId: string
}

export interface CreateBoardRequest {
  name: string
}

export interface UpdateBoardRequest {
  nodes?: BoardNode[]
  edges?: BoardEdge[]
  groups?: GroupNode[]
  name?: string
  problemStatement?: string
  notes?: NotesSection
}
