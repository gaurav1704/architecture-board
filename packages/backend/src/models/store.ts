import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Board } from '@board/shared'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const BOARDS_FILE = join(DATA_DIR, 'boards.json')

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadBoards(): Map<string, Board> {
  ensureDataDir()
  try {
    if (existsSync(BOARDS_FILE)) {
      const raw = readFileSync(BOARDS_FILE, 'utf-8')
      const arr: Board[] = JSON.parse(raw)
      return new Map(arr.map((b) => [b.id, b]))
    }
  } catch (err) {
    console.error('Failed to load boards from disk:', err)
  }
  return new Map()
}

function saveBoards(boards: Map<string, Board>): void {
  ensureDataDir()
  try {
    const arr = Array.from(boards.values())
    writeFileSync(BOARDS_FILE, JSON.stringify(arr, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save boards to disk:', err)
  }
}

let boards = loadBoards()
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveBoards(boards)
    saveTimeout = null
  }, 300)
}

export function getBoard(id: string): Board | undefined {
  return boards.get(id)
}

export function getBoardByShareId(shareId: string): Board | undefined {
  for (const board of boards.values()) {
    if (board.shareId === shareId) return board
  }
  return undefined
}

export function createBoard(board: Board): void {
  boards.set(board.id, board)
  scheduleSave()
}

export function updateBoard(id: string, updates: Partial<Board>): Board | undefined {
  const board = boards.get(id)
  if (!board) return undefined
  const updated = { ...board, ...updates, updatedAt: new Date().toISOString() }
  boards.set(id, updated)
  scheduleSave()
  return updated
}

export function deleteBoard(id: string): boolean {
  const result = boards.delete(id)
  if (result) scheduleSave()
  return result
}

export function getAllBoards(): Board[] {
  return Array.from(boards.values())
}
