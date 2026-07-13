import { create } from 'zustand'
import type {
  BoardNode,
  BoardEdge,
  NodeConfig,
  NodeTypeDefinition,
  GroupNode,
  ChatMessage,
  ProposedNodeChange,
  FlowDirection,
  NotesSection,
  AiCreateResult,
  AiMode,
} from '@board/shared'
import { getNodeType, getAllNodeTypes } from '@board/shared'
import { computeLayout } from '@board/shared'

function mergeReverseEdges(edges: BoardEdge[]): BoardEdge[] {
  const toRemove = new Set<string>()
  const updates = new Map<string, BoardEdge>()

  for (const e of edges) {
    if (toRemove.has(e.id)) continue
    if (e.direction === 'bidirectional') continue

    const reverse = edges.find(
      (re) =>
        re.id !== e.id &&
        re.source === e.target &&
        re.target === e.source &&
        !toRemove.has(re.id)
    )
    if (reverse) {
      updates.set(e.id, { ...e, direction: 'bidirectional' as FlowDirection })
      toRemove.add(reverse.id)
    }
  }

  if (toRemove.size === 0) return edges

  return edges
    .filter((e) => !toRemove.has(e.id))
    .map((e) => updates.get(e.id) || e)
}

interface CollaborationInfo {
  connectedUsers: ConnectedUser[]
  controlOwnerId: string | null
  pendingRequests: ControlRequest[]
  myUserId: string | null
  displayName: string
}

interface ConnectedUser {
  userId: string
  displayName: string
  joinedAt: string
  tabCount?: number
}

interface ControlRequest {
  id: string
  userId: string
  displayName: string
  requestedAt: string
  status: 'pending' | 'accepted' | 'rejected'
}

interface AiSettings {
  model: string
  apiUrl: string
  apiKey: string
}

function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem('ai_settings')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { model: 'gpt-4o-mini', apiUrl: 'https://api.openai.com/v1', apiKey: '' }
}

function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem('ai_settings', JSON.stringify(settings))
}

interface AiState {
  loading: boolean
  proposedChanges: ProposedNodeChange[]
  createResult: AiCreateResult | null
  reviewAnswer: string
  mode: AiMode
  settings: AiSettings
}

interface BoardStore {
  boardId: string | null
  boardName: string
  nodes: BoardNode[]
  edges: BoardEdge[]
  groups: GroupNode[]
  problemStatement: string
  notes: NotesSection
  selectedNodeId: string | null
  editingNodeId: string | null
  encloseCandidates: { containerId: string; childIds: string[] } | null
  selectedNodeIds: string[]
  selectedGroupIds: string[]
  nodeTypes: NodeTypeDefinition[]
  collaboration: CollaborationInfo
  layoutDirection: 'TB' | 'LR'
  edgeStyle: 'bezier' | 'smoothstep'
  activeTool: 'pan' | 'rectangle' | 'freeform'
  sidebarOpen: boolean
  settingsOpen: boolean
  chatOpen: boolean
  reviewOpen: boolean
  chatMessages: ChatMessage[]
  ai: AiState
  undoStack: { nodes: BoardNode[]; edges: BoardEdge[]; groups: GroupNode[] }[]
  redoStack: { nodes: BoardNode[]; edges: BoardEdge[]; groups: GroupNode[] }[]

  setBoardId: (id: string) => void
  setBoardName: (name: string) => void
  setNodes: (nodes: BoardNode[]) => void
  setEdges: (edges: BoardEdge[]) => void
  addNode: (type: string, position: { x: number; y: number }, parentId?: string) => void
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void
  updateNodeDescription: (nodeId: string, description: string) => void
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  setNodeLabel: (nodeId: string, label: string) => void
  removeNode: (nodeId: string) => void
  selectNode: (nodeId: string | null) => void
  setEditingNodeId: (nodeId: string | null) => void
  setEncloseCandidates: (candidates: { containerId: string; childIds: string[] } | null) => void
  setSelectedNodeIds: (ids: string[]) => void
  setCollaboration: (data: Partial<CollaborationInfo>) => void
  importBoard: (board: { nodes: BoardNode[]; edges: BoardEdge[]; groups?: GroupNode[]; name: string; id: string; problemStatement?: string; notes?: NotesSection }) => void
  toggleSidebar: () => void
  toggleSettings: () => void
  setAiSettings: (settings: AiSettings) => void
  toggleChat: () => void
  setReviewOpen: (open: boolean) => void
  addChatMessage: (msg: ChatMessage) => void
  setAiState: (data: Partial<AiState>) => void
  createGroup: (childNodeIds: string[], position: { x: number; y: number }) => void
  updateGroup: (groupId: string, data: Partial<GroupNode>) => void
  removeGroup: (groupId: string) => void
  flowDirection: FlowDirection
  selectedEdgeId: string | null
  setFlowDirection: (dir: FlowDirection) => void
  updateEdgeDirection: (edgeId: string, direction: FlowDirection) => void
  updateEdgeDescription: (edgeId: string, description: string) => void
  selectEdge: (edgeId: string | null) => void
  setSelectedGroupIds: (ids: string[]) => void
  setActiveTool: (tool: 'pan' | 'rectangle' | 'freeform') => void
  setLayoutDirection: (dir: 'TB' | 'LR') => void
  setEdgeStyle: (style: 'bezier' | 'smoothstep') => void
  reLayout: (aiLayout?: Record<string, number>) => void
  setProblemStatement: (text: string) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  setNotes: (notes: NotesSection) => void
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  boardId: null,
  boardName: 'Untitled Board',
  nodes: [],
  edges: [],
  groups: [],
  problemStatement: '',
  notes: { functional: '', nonFunctional: '', calculations: '', architecture: '' },
  selectedNodeId: null,
  editingNodeId: null,
  encloseCandidates: null,
  selectedNodeIds: [],
  selectedGroupIds: [],
  nodeTypes: getAllNodeTypes(),
  collaboration: {
    connectedUsers: [],
    controlOwnerId: null,
    pendingRequests: [],
    myUserId: null,
    displayName: '',
  },
  sidebarOpen: true,
  layoutDirection: 'TB',
  edgeStyle: 'smoothstep',
  activeTool: 'pan',
  flowDirection: 'ltr',
  selectedEdgeId: null,
  chatOpen: false,
  reviewOpen: false,
  chatMessages: [],
  undoStack: [],
  redoStack: [],
  settingsOpen: false,
  ai: {
    loading: false,
    proposedChanges: [],
    createResult: null,
    reviewAnswer: '',
    mode: 'review',
    settings: loadAiSettings(),
  },

  setBoardId: (id) => set({ boardId: id }),
  setBoardName: (name) => set({ boardName: name }),
  setNodes: (nodes) => set((state) => {
    const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
    return { nodes, undoStack: [...state.undoStack.slice(-49), snapshot], redoStack: [] }
  }),
  setEdges: (edges) => set((state) => {
    const merged = mergeReverseEdges(edges)
    const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
    return { edges: merged, undoStack: [...state.undoStack.slice(-49), snapshot], redoStack: [] }
  }),

  addNode: (type, position, parentId) => {
    const definition = getNodeType(type)
    if (!definition) return
    const newNode: BoardNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      position,
      config: { ...definition.defaultConfig },
      label: definition.label,
      parentId: parentId || undefined,
    }
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return { nodes: [...state.nodes, newNode], undoStack: [...state.undoStack.slice(-49), snapshot], redoStack: [] }
    })
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return {
        nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, config: { ...n.config, ...config } as NodeConfig } : n),
        undoStack: [...state.undoStack.slice(-49), snapshot],
        redoStack: [],
      }
    })
  },
  updateNodeDescription: (nodeId, description) => {
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return {
        nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, description } : n),
        undoStack: [...state.undoStack.slice(-49), snapshot],
        redoStack: [],
      }
    })
  },

  updateNodePosition: (nodeId, position) => {
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return {
        nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, position } : n),
        undoStack: [...state.undoStack.slice(-49), snapshot],
        redoStack: [],
      }
    })
  },

  setNodeLabel: (nodeId, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, label } : n),
    }))
  },

  removeNode: (nodeId) => {
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return {
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        groups: state.groups.map((g) => ({ ...g, childNodeIds: g.childNodeIds.filter((id) => id !== nodeId) })),
        undoStack: [...state.undoStack.slice(-49), snapshot],
        redoStack: [],
      }
    })
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, editingNodeId: null, encloseCandidates: null, selectedNodeIds: nodeId ? [nodeId] : [], selectedGroupIds: [] }),
  setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
  setEncloseCandidates: (candidates) => set({ encloseCandidates: candidates }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids, selectedNodeId: ids.length === 1 ? ids[0] : null, selectedGroupIds: [] }),

  setCollaboration: (data) =>
    set((state) => ({
      collaboration: { ...state.collaboration, ...data },
    })),

  importBoard: (board) =>
    set({
      nodes: board.nodes,
      edges: mergeReverseEdges(board.edges),
      groups: board.groups || [],
      boardName: board.name,
      boardId: board.id,
      problemStatement: board.problemStatement || '',
      notes: board.notes || { functional: '', nonFunctional: '', calculations: '', architecture: '' },
    }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  setAiSettings: (settings) => {
    const sanitized = { ...settings, apiUrl: settings.apiUrl.replace(/^[^a-zA-Z]+/, '') }
    saveAiSettings(sanitized)
    set((state) => ({ ai: { ...state.ai, settings: sanitized } }))
  },
  setFlowDirection: (dir) => set({ flowDirection: dir }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
  updateEdgeDirection: (edgeId, direction) => {
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return {
        edges: state.edges.map((e) => e.id === edgeId ? { ...e, direction } : e),
        undoStack: [...state.undoStack.slice(-49), snapshot],
        redoStack: [],
      }
    })
  },
  updateEdgeDescription: (edgeId, description) => {
    set((state) => {
      const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
      return {
        edges: state.edges.map((e) => e.id === edgeId ? { ...e, description } : e),
        undoStack: [...state.undoStack.slice(-49), snapshot],
        redoStack: [],
      }
    })
  },
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setReviewOpen: (open) => set({ reviewOpen: open }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  setAiState: (data) =>
    set((state) => ({ ai: { ...state.ai, ...data } })),

  createGroup: (childNodeIds, position) => {
    const group: GroupNode = {
      id: `group-${Date.now()}`,
      name: 'Group',
      description: '',
      position,
      width: 400,
      height: 300,
      childNodeIds,
    }
    set((state) => ({ groups: [...state.groups, group] }))
  },

  updateGroup: (groupId, data) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, ...data } : g
      ),
    }))
  },

  removeGroup: (groupId) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }))
  },

  setSelectedGroupIds: (ids) => set({ selectedGroupIds: ids, selectedNodeId: null }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedNodeId: null, selectedGroupIds: [] }),
  setLayoutDirection: (dir) => set({ layoutDirection: dir }),
  setEdgeStyle: (style) => set({ edgeStyle: style }),
  reLayout: (aiLayout?: Record<string, number>) => set((state) => {
    const layout = computeLayout(
      state.nodes as any,
      state.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
      state.layoutDirection,
      aiLayout
    )
    const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
    return { nodes: layout.nodes as BoardNode[], undoStack: [...state.undoStack.slice(-49), snapshot], redoStack: [] }
  }),
  setProblemStatement: (text) => set({ problemStatement: text }),
  pushHistory: () => set((state) => {
    const snapshot = { nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)), groups: JSON.parse(JSON.stringify(state.groups)) }
    const undoStack = [...state.undoStack.slice(-49), snapshot]
    return { undoStack, redoStack: [] }
  }),
  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state
    const snapshot = { nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)), groups: JSON.parse(JSON.stringify(state.groups)) }
    const prev = state.undoStack[state.undoStack.length - 1]
    return {
      nodes: prev.nodes,
      edges: prev.edges,
      groups: prev.groups,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, snapshot],
    }
  }),
  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state
    const snapshot = { nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)), groups: JSON.parse(JSON.stringify(state.groups)) }
    const next = state.redoStack[state.redoStack.length - 1]
    return {
      nodes: next.nodes,
      edges: next.edges,
      groups: next.groups,
      undoStack: [...state.undoStack, snapshot],
      redoStack: state.redoStack.slice(0, -1),
    }
  }),
  setNotes: (notes) => set({ notes }),
}))
