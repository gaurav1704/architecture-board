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
  notes: { functional: '', nonFunctional: '', calculations: '' },
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
    const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
    return { edges, undoStack: [...state.undoStack.slice(-49), snapshot], redoStack: [] }
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
      edges: board.edges,
      groups: board.groups || [],
      boardName: board.name,
      boardId: board.id,
      problemStatement: board.problemStatement || '',
      notes: board.notes || { functional: '', nonFunctional: '', calculations: '' },
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
    const NODE_W = 180, NODE_H = 80, PAD = 60
    const edges = state.edges
    const nodes = state.nodes
    const isLR = state.layoutDirection === 'LR'

    // Use AI-provided layout if available, otherwise compute from edges
    const layerOf = new Map<string, number>()
    if (aiLayout) {
      for (const n of nodes) {
        layerOf.set(n.id, aiLayout[n.id] ?? 0)
      }
    } else {
      // 1. Find roots (no incoming edges)
      const targets = new Set(edges.map((e) => e.target))
      const roots = nodes.filter((n) => !targets.has(n.id))
      const remaining = new Set(nodes.map((n) => n.id))

      // 2. BFS to assign layers
      const parents = new Map<string, string[]>()
      for (const e of edges) {
        if (!parents.has(e.target)) parents.set(e.target, [])
        parents.get(e.target)!.push(e.source)
      }

      const childrenOf = new Map<string, string[]>()
      for (const e of edges) {
        if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
        childrenOf.get(e.source)!.push(e.target)
      }

      const queue: string[] = roots.map((r) => r.id)
      for (const r of roots) { layerOf.set(r.id, 0); remaining.delete(r.id) }

      while (queue.length > 0) {
        const id = queue.shift()!
        const depth = layerOf.get(id) ?? 0
        for (const child of childrenOf.get(id) || []) {
          const newDepth = depth + 1
          if (!layerOf.has(child) || layerOf.get(child)! < newDepth) {
            layerOf.set(child, newDepth)
            remaining.delete(child)
          }
          if (!queue.includes(child)) queue.push(child)
        }
      }
      for (const id of remaining) if (!layerOf.has(id)) layerOf.set(id, 0)
    }

    // 3. Group by layer
    const layers = new Map<number, any[]>()
    for (const n of nodes) {
      const l = layerOf.get(n.id) ?? 0
      if (!layers.has(l)) layers.set(l, [])
      layers.get(l)!.push(n)
    }
    const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0])

    // 4. Within each layer, sort nodes by parent position to keep children near parents
    for (let li = 0; li < sortedLayers.length; li++) {
      const [layerNum, layerNodes] = sortedLayers[li]
      sortedLayers[li][1] = layerNodes.sort((a, b) => {
        const aParents = parents.get(a.id) || []
        const bParents = parents.get(b.id) || []
        // Get avg parent layer position index for each
        const aAvg = avgParentIndex(aParents, layers, layerOf, li)
        const bAvg = avgParentIndex(bParents, layers, layerOf, li)
        return aAvg - bAvg
      })
    }

    function avgParentIndex(parentIds: string[], layerMap: Map<number, any[]>, layerMap2: Map<string, number>, currentLayerIdx: number): number {
      if (parentIds.length === 0) return 0
      let sum = 0, count = 0
      for (const pid of parentIds) {
        const parentLayer = layerMap2.get(pid) ?? 0
        const layerNodes = layerMap.get(parentLayer)
        if (layerNodes) {
          const idx = layerNodes.findIndex((n: any) => n.id === pid)
          if (idx >= 0) { sum += idx; count++ }
        }
      }
      return count > 0 ? sum / count : 0
    }

    // 5. Dynamic spacing: gap scales with max nodes across layers
    const maxNodesPerLayer = Math.max(...sortedLayers.map(([, ln]) => ln.length), 1)
    const H_GAP = isLR ? 60 : Math.max(40, Math.min(100, 400 / maxNodesPerLayer))
    const V_GAP = isLR ? Math.max(40, Math.min(100, 400 / maxNodesPerLayer)) : 50

    let maxSpan = 0
    for (const [, layerNodes] of sortedLayers) {
      const span = layerNodes.length * (isLR ? NODE_H + V_GAP : NODE_W + H_GAP) - (isLR ? V_GAP : H_GAP)
      if (span > maxSpan) maxSpan = span
    }

    const resultNodes: any[] = []
    for (const [layerIdx, layerNodes] of sortedLayers) {
      const count = layerNodes.length
      if (isLR) {
        const x = PAD + layerIdx * (NODE_W + H_GAP)
        const colH = count * (NODE_H + V_GAP) - V_GAP
        const startY = PAD + (maxSpan - colH) / 2
        for (let i = 0; i < count; i++) {
          resultNodes.push({ ...layerNodes[i], position: { x, y: startY + i * (NODE_H + V_GAP) } })
        }
      } else {
        const y = PAD + layerIdx * (NODE_H + V_GAP)
        const rowW = count * (NODE_W + H_GAP) - H_GAP
        const startX = PAD + (maxSpan - rowW) / 2
        for (let i = 0; i < count; i++) {
          resultNodes.push({ ...layerNodes[i], position: { x: startX + i * (NODE_W + H_GAP), y } })
        }
      }
    }

    const snapshot = { nodes: state.nodes, edges: state.edges, groups: state.groups }
    return { nodes: resultNodes, undoStack: [...state.undoStack.slice(-49), snapshot], redoStack: [] }
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
