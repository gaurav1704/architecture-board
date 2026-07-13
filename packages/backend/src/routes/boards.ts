import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import type { Board, BoardNode, BoardEdge, GroupNode, NotesSection } from '@board/shared'
import { getBoard, createBoard, updateBoard, deleteBoard, getAllBoards, getBoardByShareId } from '../models/store.js'

export const boardRouter = Router()

boardRouter.get('/', (_req, res) => {
  const boards = getAllBoards().map(({ nodes, edges, ...rest }) => rest)
  res.json(boards)
})

boardRouter.post('/', (req, res) => {
  const { name } = req.body
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Board name is required' })
  }

  const board: Board = {
    id: uuidv4(),
    name,
    shareId: uuidv4().slice(0, 8),
    nodes: [],
    edges: [],
    groups: [],
    problemStatement: '',
    notes: { functional: '', nonFunctional: '', calculations: '', architecture: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: req.body.ownerId || 'anonymous',
  }

  createBoard(board)
  res.status(201).json(board)
})

boardRouter.get('/:id', (req, res) => {
  const board = getBoard(req.params.id) || getBoardByShareId(req.params.id)
  if (!board) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.json(board)
})

boardRouter.put('/:id', (req, res) => {
  const { nodes, edges, groups, name, problemStatement, notes } = req.body
  const updates: Partial<Board> = {}

  if (nodes !== undefined) updates.nodes = nodes as BoardNode[]
  if (edges !== undefined) updates.edges = edges as BoardEdge[]
  if (groups !== undefined) updates.groups = groups as GroupNode[]
  if (name !== undefined) updates.name = name
  if (problemStatement !== undefined) updates.problemStatement = problemStatement
  if (notes !== undefined) updates.notes = notes as NotesSection

  const updated = updateBoard(req.params.id, updates)
  if (!updated) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.json(updated)
})

boardRouter.delete('/:id', (req, res) => {
  const deleted = deleteBoard(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.status(204).send()
})
