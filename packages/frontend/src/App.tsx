import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Connection,
  type Edge,
  type NodeChange,
  type OnNodeDrag,
  type OnReconnect,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useBoardStore } from './store/boardStore.js'
import { getNodeType } from '@board/shared'
import type { FlowDirection, BoardNode } from '@board/shared'
import CustomNode from './nodes/CustomNode.js'
import FlowEdge from './edges/FlowEdge.js'
import { Sidebar } from './components/Sidebar.js'
import { Topbar } from './components/Topbar.js'
import { NodeEditorModal } from './components/NodeEditorModal.js'
import { ChatPanel } from './components/ChatPanel.js'
import { ReviewPanel } from './components/ReviewPanel.js'
import { UserList } from './components/UserList.js'
import { useSocket } from './hooks/useSocket.js'

const nodeTypes = { default: CustomNode }
const edgeTypes = { default: FlowEdge }

function FlowCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const storeNodes = useBoardStore((s) => s.nodes)
  const storeEdges = useBoardStore((s) => s.edges)
  const setEdges = useBoardStore((s) => s.setEdges)
  const selectNode = useBoardStore((s) => s.selectNode)
  const setSelectedNodeIds = useBoardStore((s) => s.setSelectedNodeIds)
  const setSelectedGroupIds = useBoardStore((s) => s.setSelectedGroupIds)
  const flowDirection = useBoardStore((s) => s.flowDirection)
  const selectEdge = useBoardStore((s) => s.selectEdge)
  const updateEdgeDirection = useBoardStore((s) => s.updateEdgeDirection)
  const updateNodePosition = useBoardStore((s) => s.updateNodePosition)
  const removeNode = useBoardStore((s) => s.removeNode)
  const activeTool = useBoardStore((s) => s.activeTool)
  const layoutDirection = useBoardStore((s) => s.layoutDirection)
  const edgeStylePref = useBoardStore((s) => s.edgeStyle)
  const chatOpen = useBoardStore((s) => s.chatOpen)

  const reactFlowInstance = useReactFlow()
  const [nodes, setLocalNodes, onNodesChange] = useNodesState([])
  const [edges, setLocalEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setLocalNodes(
      storeNodes.map((n) => ({
        id: n.id,
        type: 'default',
        position: n.position,
        data: { ...n, layoutDirection },
        parentId: n.parentId,
      }))
    )
  }, [storeNodes, setLocalNodes, layoutDirection])

  useEffect(() => {
    // Calculate offsets for parallel edges between the same pair of nodes
    const pairs = new Map<string, { count: number; idx: number }>()
    for (const e of storeEdges) {
      const key = `${e.source}|${e.target}`
      if (!pairs.has(key)) pairs.set(key, { count: 0, idx: 0 })
      pairs.get(key)!.count++
    }

    setLocalEdges(
      storeEdges.map((e) => {
        const key = `${e.source}|${e.target}`
        const p = pairs.get(key)!
        const offset = p.count > 1 ? (p.idx++ - (p.count - 1) / 2) * 24 : 0
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourcePort ?? null,
          targetHandle: e.targetPort ?? null,
          label: e.label,
          data: { direction: e.direction || 'ltr', offset, edgeStyle: edgeStylePref, description: e.description },
          type: 'default',
        }
      })
    )
  }, [storeEdges, setLocalEdges, edgeStylePref])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      // If a reverse edge (target→source) already exists, upgrade it to bidirectional
      const reverseEdge = storeEdges.find(
        (e) => e.source === connection.target && e.target === connection.source
      )
      if (reverseEdge) {
        if (reverseEdge.direction !== 'bidirectional') {
          updateEdgeDirection(reverseEdge.id, 'bidirectional')
        }
        return
      }

      // Skip exact duplicates (same source→target)
      if (storeEdges.some((e) => e.source === connection.source && e.target === connection.target)) return

      const id = `edge-${Date.now()}`
      const dir = flowDirection
      const edge: Edge = {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'default',
        data: { direction: dir, edgeStyle: edgeStylePref },
      }
      setLocalEdges((eds) => addEdge(edge, eds))
      setEdges([
        ...storeEdges,
        {
          id,
          source: connection.source,
          target: connection.target,
          sourcePort: connection.sourceHandle ?? undefined,
          targetPort: connection.targetHandle ?? undefined,
          direction: dir,
        },
      ])
    },
    [setLocalEdges, setEdges, storeEdges, flowDirection, edgeStylePref, updateEdgeDirection]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id)
    },
    [selectEdge]
  )

  const onReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const updated = storeEdges.map((e) =>
        e.id === oldEdge.id
          ? { ...e, source: newConnection.source || e.source, target: newConnection.target || e.target, sourcePort: newConnection.sourceHandle || undefined, targetPort: newConnection.targetHandle || undefined }
          : e
      )
      setEdges(updated)
      setLocalEdges((eds) =>
        eds.map((e) =>
          e.id === oldEdge.id
            ? { ...e, source: newConnection.source || e.source, target: newConnection.target || e.target, sourceHandle: newConnection.sourceHandle || null, targetHandle: newConnection.targetHandle || null }
            : e
        )
      )
    },
    [storeEdges, setEdges, setLocalEdges]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
    setSelectedGroupIds([])
    setLassoPoints(null)
  }, [selectNode, selectEdge, setSelectedGroupIds])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/node-type')
      if (!type) return

      let pos = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Check if dropped inside a container node
      let parentId: string | undefined
      for (const n of storeNodes) {
        const def = getNodeType(n.type)
        if (!def?.isContainer) continue
        const cfg = n.config as Record<string, unknown>
        const nx = n.position.x
        const ny = n.position.y
        const nw = (cfg.width as number) || 300
        const nh = (cfg.height as number) || 200
        const isCircle = n.type === 'circle'
        const cx = nx + nw / 2
        const cy = ny + nh / 2
        const dx = pos.x - cx
        const dy = pos.y - cy

        if (isCircle) {
          const r = ((cfg.diameter as number) || 250) / 2
          if (dx * dx + dy * dy <= r * r) {
            parentId = n.id
            pos = { x: dx + nw / 2, y: dy + nh / 2 }
          }
        } else {
          if (pos.x >= nx && pos.x <= nx + nw && pos.y >= ny && pos.y <= ny + nh) {
            parentId = n.id
            pos = { x: pos.x - nx, y: pos.y - ny }
          }
        }
      }

      useBoardStore.getState().addNode(type, pos, parentId)
    },
    [reactFlowInstance, storeNodes]
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position)
        }
      }
    },
    [onNodesChange, updateNodePosition]
  )

  // ── Alignment guides ──

  const [alignGuides, setAlignGuides] = useState<AlignmentGuide[]>([])
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[] | null>(null)
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([])
  const isDrawingLasso = useRef(false)
  const SNAP_THRESHOLD = 6

  // Check if a position aligns with any edge or center of node n
  function checkEdgeAlign(pos: number, edges: number[], type: 'vertical' | 'horizontal', draggedId: string, nId: string): number | null {
    for (const edge of edges) {
      if (Math.abs(pos - edge) < SNAP_THRESHOLD) return edge
    }
    return null
  }

  const onNodeDragStart: OnNodeDrag = useCallback((_event, _node) => {
    setAlignGuides([])
  }, [])

  const onNodeDrag: OnNodeDrag = useCallback((_event, draggedNode) => {
    const guides: AlignmentGuide[] = []
    const dw = draggedNode.measured?.width || 160
    const dh = draggedNode.measured?.height || 60
    const dLeft = draggedNode.position.x
    const dRight = draggedNode.position.x + dw
    const dTop = draggedNode.position.y
    const dBottom = draggedNode.position.y + dh
    const dCx = dLeft + dw / 2
    const dCy = dTop + dh / 2

    // Get container offset to convert viewport coords → canvas-relative coords
    const bounds = canvasRef.current?.getBoundingClientRect()
    const ox = bounds?.left || 0
    const oy = bounds?.top || 0
    const toCanvas = (x: number, y: number) => {
      const s = reactFlowInstance.flowToScreenPosition({ x, y })
      return { x: s.x - ox, y: s.y - oy }
    }

    const sLeft = toCanvas(dLeft, 0).x
    const sRight = toCanvas(dRight, 0).x
    const sTop = toCanvas(0, dTop).y
    const sBottom = toCanvas(0, dBottom).y
    const sCx = toCanvas(dCx, 0).x
    const sCy = toCanvas(0, dCy).y

    guides.push({ type: 'vertical', pos: sLeft, nodes: [draggedNode.id] })
    guides.push({ type: 'vertical', pos: sRight, nodes: [draggedNode.id] })
    guides.push({ type: 'horizontal', pos: sTop, nodes: [draggedNode.id] })
    guides.push({ type: 'horizontal', pos: sBottom, nodes: [draggedNode.id] })

    for (const n of nodes) {
      if (n.id === draggedNode.id) continue
      const nw = n.measured?.width || 160
      const nh = n.measured?.height || 60
      const nLeft = n.position.x
      const nRight = n.position.x + nw
      const nTop = n.position.y
      const nBottom = n.position.y + nh
      const nCx = nLeft + nw / 2
      const nCy = nTop + nh / 2

      const snLeft = toCanvas(nLeft, 0).x
      const snRight = toCanvas(nRight, 0).x
      const snCx = toCanvas(nCx, 0).x
      const snTop = toCanvas(0, nTop).y
      const snBottom = toCanvas(0, nBottom).y
      const snCy = toCanvas(0, nCy).y

      const xEdges = [snLeft, snCx, snRight]
      const yEdges = [snTop, snCy, snBottom]
      const dXEdges = [sLeft, sCx, sRight]
      const dYEdges = [sTop, sCy, sBottom]

      for (const de of dXEdges) {
        const match = checkEdgeAlign(de, xEdges, 'vertical', draggedNode.id, n.id)
        if (match !== null) {
          guides.push({ type: 'vertical', pos: match, nodes: [draggedNode.id, n.id] })
        }
      }
      for (const de of dYEdges) {
        const match = checkEdgeAlign(de, yEdges, 'horizontal', draggedNode.id, n.id)
        if (match !== null) {
          guides.push({ type: 'horizontal', pos: match, nodes: [draggedNode.id, n.id] })
        }
      }

      const gapLeft = Math.abs(sRight - snLeft)
      const gapRight = Math.abs(sLeft - snRight)
      const gapTop = Math.abs(sBottom - snTop)
      const gapBottom = Math.abs(sTop - snBottom)

      const hGap = Math.min(gapLeft, gapRight)
      const hOverlap = sLeft < snRight && sRight > snLeft
      if (hGap < 200 && !hOverlap) {
        const isLeft = gapLeft < gapRight
        const x1 = isLeft ? sRight : sLeft
        const x2 = isLeft ? snLeft : snRight
        const y = (sCy + snCy) / 2
        guides.push({
          type: 'distance-h', pos: y, x1, x2, label: `${Math.round(hGap)}px`, nodes: [draggedNode.id, n.id],
        })
      }

      const vGap = Math.min(gapTop, gapBottom)
      const vOverlap = sTop < snBottom && sBottom > snTop
      if (vGap < 200 && !vOverlap) {
        const isTop = gapTop < gapBottom
        const y1 = isTop ? sBottom : sTop
        const y2 = isTop ? snTop : snBottom
        const x = (sCx + snCx) / 2
        guides.push({
          type: 'distance-v', pos: x, y1, y2, label: `${Math.round(vGap)}px`, nodes: [draggedNode.id, n.id],
        })
      }
    }
    setAlignGuides(guides)
  }, [nodes, reactFlowInstance])

  const onNodeDragStop: OnNodeDrag = useCallback((_event, draggedNode) => {
    setAlignGuides([])
    selectNode(draggedNode.id)
    const boardData = useBoardStore.getState().nodes.find((n) => n.id === draggedNode.id)
    if (!boardData) return
    const def = getNodeType(boardData.type)

    // If the dragged node has a parent, check if it's still inside
    if (boardData.parentId) {
      const parent = useBoardStore.getState().nodes.find((n) => n.id === boardData.parentId)
      if (parent) {
        const pCfg = parent.config
        const pIsCircle = parent.type === 'circle'
        const pDw = pIsCircle ? (pCfg.diameter as number) || 250 : (pCfg.width as number) || 300
        const pDh = pIsCircle ? (pCfg.diameter as number) || 250 : (pCfg.height as number) || 200
        const absX = boardData.position.x + parent.position.x
        const absY = boardData.position.y + parent.position.y
        const cx = absX + 80
        const cy = absY + 30
        const inside = pIsCircle
          ? Math.hypot(cx - (parent.position.x + pDw / 2), cy - (parent.position.y + pDh / 2)) <= pDw / 2
          : absX >= parent.position.x && absX <= parent.position.x + pDw &&
            absY >= parent.position.y && absY <= parent.position.y + pDh
        if (!inside) {
          // Remove from parent config if it's a K8s cluster
          if (parent.type === 'kubernetes-cluster') {
            const nsList = [...((parent.config.namespaces as any[]) || [])]
            let changed = false
            const updatedNs = nsList.map((ns: any) => {
              const apps = ((ns.applications as any[]) || []).filter((a: any) => a.nodeId !== boardData.id)
              if (apps.length !== ((ns.applications as any[]) || []).length) changed = true
              return { ...ns, applications: apps }
            })
            if (changed) {
              useBoardStore.getState().updateNodeConfig(parent.id, { namespaces: updatedNs })
            }
          }
          useBoardStore.getState().setNodes(
            useBoardStore.getState().nodes.map((n) =>
              n.id === boardData.id ? { ...n, parentId: undefined, position: { x: absX, y: absY } } : n
            )
          )
        }
      }
    }

    // If the dragged node is a container, suggest enclosing overlapping children
    if (def?.isContainer) {
      const cfg = boardData.config
      const isCircle = boardData.type === 'circle'
      const dw = isCircle ? (cfg.diameter as number) || 250 : (cfg.width as number) || 300
      const dh = isCircle ? (cfg.diameter as number) || 250 : (cfg.height as number) || 200

      const childIds: string[] = []
      for (const n of useBoardStore.getState().nodes) {
        if (n.id === boardData.id || n.parentId || n.id === boardData.parentId) continue
        const nc = { x: n.position.x + 80, y: n.position.y + 30 }
        const inside = isCircle
          ? Math.hypot(nc.x - (boardData.position.x + dw / 2), nc.y - (boardData.position.y + dh / 2)) <= dw / 2
          : nc.x >= boardData.position.x && nc.x <= boardData.position.x + dw &&
            nc.y >= boardData.position.y && nc.y <= boardData.position.y + dh
        if (inside) childIds.push(n.id)
      }
      useBoardStore.getState().setEncloseCandidates(childIds.length > 0 ? { containerId: boardData.id, childIds } : null)
      return
    }

    // If the dragged node is NOT a container, check if it landed inside a container
    const containers = useBoardStore.getState().nodes.filter((n) => {
      const d = getNodeType(n.type)
      return d?.isContainer && n.id !== boardData.id
    })
    for (const container of containers) {
      const cfg = container.config
      const isCircle = container.type === 'circle'
      const dw = isCircle ? (cfg.diameter as number) || 250 : (cfg.width as number) || 300
      const dh = isCircle ? (cfg.diameter as number) || 250 : (cfg.height as number) || 200
      const cx = boardData.position.x + 80
      const cy = boardData.position.y + 30
      const inside = isCircle
        ? Math.hypot(cx - (container.position.x + dw / 2), cy - (container.position.y + dh / 2)) <= dw / 2
        : cx >= container.position.x && cx <= container.position.x + dw &&
          cy >= container.position.y && cy <= container.position.y + dh
      if (inside && !boardData.parentId) {
        // Determine which namespace the node landed on (right column = namespace area, left column = common area)
        if (container.type === 'kubernetes-cluster' && !isCircle) {
          const relX = boardData.position.x - container.position.x
          const relY = boardData.position.y - container.position.y
          const rightColX = dw * 0.4 // 40% for left column
          const nsStartY = 40 // header area
          const nsAreaH = dh - nsStartY
          const namespaces = (cfg.namespaces as any[]) || []
          if (relX >= rightColX && namespaces.length > 0) {
            const nsIndex = Math.min(Math.floor((relY - nsStartY) / (nsAreaH / namespaces.length)), namespaces.length - 1)
            if (nsIndex >= 0 && relY >= nsStartY) {
              const label = boardData.label || boardData.type
              const version = (boardData.config?.version as string) || 'v1'
              const appName = boardData.config?.app as string || label
              const targetNs = { ...namespaces[nsIndex] }
              const apps = [...((targetNs.applications as any[]) || [])]
              const svcs = [...((targetNs.services as any[]) || [])]

              if (apps.some((a: any) => a.name === label && a.version === version)) {
                console.warn(`Deployment "${label}" v${version} already exists`)
              } else {
                apps.push({ nodeId: boardData.id, name: label, version, app: appName, image: 'custom', replicas: 1, cpu: '250m', memory: '256Mi' })
                const existingSvc = svcs.find((s: any) => s.name === appName || s.name === label)
                if (!existingSvc) {
                  svcs.push({ name: appName || label, type: 'clusterip', port: 80, targetPort: 8080 })
                }
                targetNs.applications = apps
                targetNs.services = svcs
                const updatedNs = [...namespaces]
                updatedNs[nsIndex] = targetNs
                useBoardStore.getState().updateNodeConfig(container.id, { namespaces: updatedNs })
                // Position the child directly under its matching service
                const nsTop = nsStartY + nsIndex * (nsAreaH / namespaces.length)
                const svcIndex = svcs.findIndex((s: any) => s.name === appName || s.name === label)
                const serviceY = nsTop + 14 + (svcIndex >= 0 ? svcIndex : svcs.length - 1) * 18 + 18
                const childRelX = dw * 0.42 + 10 // right column
                const childRelY = serviceY
                useBoardStore.getState().setNodes(
                  useBoardStore.getState().nodes.map((n) =>
                    n.id === boardData.id ? { ...n, parentId: container.id, position: { x: childRelX, y: childRelY } } : n
                  )
                )
              }
            }
          }
        }
        break
      }
    }
  }, [selectNode])

  // ── Freeform lasso selection ──

  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'freeform') return
    if (e.button !== 0) return
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const pos = { x: e.clientX - bounds.left, y: e.clientY - bounds.top }
    lassoPointsRef.current = [pos]
    setLassoPoints([pos])
    isDrawingLasso.current = true
  }, [activeTool])

  const onCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawingLasso.current || activeTool !== 'freeform') return
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const pos = { x: e.clientX - bounds.left, y: e.clientY - bounds.top }
    lassoPointsRef.current = [...lassoPointsRef.current, pos]
    setLassoPoints(lassoPointsRef.current)
  }, [activeTool])

  const onCanvasMouseUp = useCallback(() => {
    if (!isDrawingLasso.current) return
    isDrawingLasso.current = false
    const pts = lassoPointsRef.current
    lassoPointsRef.current = []
    if (pts.length < 3) {
      setLassoPoints(null)
      return
    }

    const selected: string[] = []
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (bounds) {
      for (const n of nodes) {
        const nw = n.measured?.width || 160
        const nh = n.measured?.height || 60
        const cx = n.position.x + nw / 2
        const cy = n.position.y + nh / 2
        const screen = reactFlowInstance.flowToScreenPosition({ x: cx, y: cy })
        const px = screen.x - bounds.left
        const py = screen.y - bounds.top
        if (pointInPolygon(px, py, pts)) {
          selected.push(n.id)
        }
      }
    }

    if (selected.length > 0) {
      selectNode(selected[0])
    }
    setLassoPoints(null)
  }, [activeTool, nodes, reactFlowInstance, selectNode])

  function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y
      const xj = polygon[j].x, yj = polygon[j].y
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }
    return inside
  }

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div
      ref={canvasRef}
      className="canvas-container"
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onReconnect={onReconnect}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag={activeTool === 'pan'}
        panOnScroll={false}
        zoomOnScroll={true}
        selectionOnDrag={activeTool === 'rectangle'}
        selectionMode="partial"
        selectNodesOnDrag={false}
        edgesReconnectable={true}
        onSelectionChange={({ nodes: selectedNodes }) => {
          setSelectedNodeIds(selectedNodes.map((n) => n.id))
        }}
      >
        <Background variant="dots" color="#2a2a3a" gap={24} size={1} />
        {alignGuides.length > 0 && <AlignGuidesRenderer guides={alignGuides} />}
        {lassoPoints && lassoPoints.length > 1 && (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
            <polygon
              points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(90, 138, 255, 0.1)"
              stroke="#5a8aff"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          </svg>
        )}
        <Controls />
        <MiniMap
          style={{ background: '#1a1a2e', right: chatOpen ? 392 : 10 }}
          nodeColor={(n) => { const def = getNodeType((n.data as any)?.type); return def?.color || '#3a3a5a' }}
          nodeStrokeColor={(n) => { const def = getNodeType((n.data as any)?.type); return def?.color || '#4a4a6a' }}
          nodeBorderRadius={4}
          maskColor="rgba(26, 26, 46, 0.8)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}

// ── Board persistence hook ──

const LS_BOARD_KEY = 'board_data'

function saveToLocalStorage(data: { nodes: any[]; edges: any[]; groups: any[]; name?: string; id?: string; problemStatement?: string; notes?: any }) {
  localStorage.setItem(LS_BOARD_KEY, JSON.stringify(data))
}

function loadFromLocalStorage(): { nodes: any[]; edges: any[]; groups: any[]; name?: string; id?: string } | null {
  try {
    const raw = localStorage.getItem(LS_BOARD_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ── Alignment guides ──

interface AlignmentGuide {
  type: 'vertical' | 'horizontal' | 'distance-h' | 'distance-v'
  pos: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  label?: string
  nodes: string[]
}

function AlignGuidesRenderer({ guides }: { guides: AlignmentGuide[] }) {
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {guides.map((g, i) => {
        if (g.type === 'vertical') {
          return (
            <line
              key={i}
              x1={g.pos}
              y1={-10000}
              x2={g.pos}
              y2={10000}
              stroke="#5a8aff"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          )
        }
        if (g.type === 'horizontal') {
          return (
            <line
              key={i}
              x1={-10000}
              y1={g.pos}
              x2={10000}
              y2={g.pos}
              stroke="#5a8aff"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          )
        }
        if (g.type === 'distance-h') {
          const midX = ((g.x1 || 0) + (g.x2 || 0)) / 2
          return (
            <g key={i}>
              <line
                x1={g.x1} y1={g.pos} x2={g.x2} y2={g.pos}
                stroke="#5a8aff" strokeWidth={1} opacity={0.6}
              />
              <line
                x1={g.x1} y1={g.pos - 4} x2={g.x1} y2={g.pos + 4}
                stroke="#5a8aff" strokeWidth={1} opacity={0.6}
              />
              <line
                x1={g.x2} y1={g.pos - 4} x2={g.x2} y2={g.pos + 4}
                stroke="#5a8aff" strokeWidth={1} opacity={0.6}
              />
              <text
                x={midX} y={g.pos - 6}
                fill="#5a8aff" fontSize={11}
                textAnchor="middle" fontFamily="monospace"
              >
                {g.label}
              </text>
            </g>
          )
        }
        if (g.type === 'distance-v') {
          const midY = ((g.y1 || 0) + (g.y2 || 0)) / 2
          return (
            <g key={i}>
              <line
                x1={g.pos} y1={g.y1} x2={g.pos} y2={g.y2}
                stroke="#5a8aff" strokeWidth={1} opacity={0.6}
              />
              <line
                x1={g.pos - 4} y1={g.y1} x2={g.pos + 4} y2={g.y1}
                stroke="#5a8aff" strokeWidth={1} opacity={0.6}
              />
              <line
                x1={g.pos - 4} y1={g.y2} x2={g.pos + 4} y2={g.y2}
                stroke="#5a8aff" strokeWidth={1} opacity={0.6}
              />
              <text
                x={g.pos + 6} y={midY + 4}
                fill="#5a8aff" fontSize={11}
                textAnchor="start" fontFamily="monospace"
              >
                {g.label}
              </text>
            </g>
          )
        }
        return null
      })}
    </svg>
  )
}

function useBoardPersistence() {
  const boardId = useBoardStore((s) => s.boardId)
  const setBoardId = useBoardStore((s) => s.setBoardId)
  const setBoardName = useBoardStore((s) => s.setBoardName)
  const importBoard = useBoardStore((s) => s.importBoard)
  const nodes = useBoardStore((s) => s.nodes)
  const edges = useBoardStore((s) => s.edges)
  const groups = useBoardStore((s) => s.groups)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backendOkRef = useRef(true)

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      const idFromUrl = params.get('board')

      if (idFromUrl) {
        try {
          const res = await fetch(`/api/boards/${idFromUrl}`)
          if (res.ok) {
            const data = await res.json()
            importBoard({ nodes: data.nodes || [], edges: data.edges || [], groups: data.groups || [], name: data.name, id: data.id })
            setBoardId(data.id)
            return
          }
        } catch { /* backend unavailable */ }
      }

      const localId = localStorage.getItem('boardId')
      if (localId) {
        try {
          const res = await fetch(`/api/boards/${localId}`)
          if (res.ok) {
            const data = await res.json()
            importBoard({ nodes: data.nodes || [], edges: data.edges || [], groups: data.groups || [], name: data.name, id: data.id })
            setBoardId(data.id)
            return
          }
        } catch { /* backend unavailable */ }
      }

      const localData = loadFromLocalStorage()
      if (localData && localData.id) {
        importBoard({ nodes: localData.nodes || [], edges: localData.edges || [], groups: localData.groups || [], name: localData.name || 'Untitled Board', id: localData.id })
        setBoardId(localData.id)
        return
      }

      try {
        const res = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Untitled Board' }),
        })
        if (res.ok) {
          const data = await res.json()
          setBoardId(data.id)
          setBoardName(data.name)
        }
      } catch { /* backend unavailable — will stay empty */ }
    }

    init()
  }, [])

  useEffect(() => {
    if (boardId) {
      localStorage.setItem('boardId', boardId)
      const url = new URL(window.location.href)
      url.searchParams.set('board', boardId)
      window.history.replaceState({}, '', url.toString())
    }
  }, [boardId])

  useEffect(() => {
    if (!boardId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const st = useBoardStore.getState()
      saveToLocalStorage({ nodes, edges, groups, name: st.boardName, id: boardId, problemStatement: st.problemStatement, notes: st.notes })
      if (backendOkRef.current) {
        fetch(`/api/boards/${boardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges, groups, problemStatement: st.problemStatement, notes: st.notes }),
        }).then((r) => {
          if (!r.ok) backendOkRef.current = false
        }).catch(() => {
          backendOkRef.current = false
          setTimeout(() => { backendOkRef.current = true }, 5000)
        })
      }
    }, 200)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [boardId, nodes, edges, groups])

  useEffect(() => {
    if (!boardId) return
    const save = () => {
      const s = useBoardStore.getState()
      saveToLocalStorage({ nodes: s.nodes, edges: s.edges, groups: s.groups, name: s.boardName, id: boardId, problemStatement: s.problemStatement, notes: s.notes })
      if (backendOkRef.current) {
        fetch(`/api/boards/${boardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes: s.nodes, edges: s.edges, groups: s.groups, problemStatement: s.problemStatement, notes: s.notes }),
          keepalive: true,
        }).catch(() => {})
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') save() }
    window.addEventListener('beforeunload', save)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', save)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [boardId])
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useBoardStore.getState().undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        useBoardStore.getState().redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        useBoardStore.getState().redo()
      }
      // Delete / Backspace: remove selected nodes or edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        const state = useBoardStore.getState()
        // Delete selected edge first
        if (state.selectedEdgeId) {
          state.setEdges(state.edges.filter((ed) => ed.id !== state.selectedEdgeId))
          state.selectEdge(null)
          return
        }
        // Delete selected nodes
        const ids = [...new Set([...state.selectedNodeIds, ...(state.selectedNodeId ? [state.selectedNodeId] : [])])]
        for (const id of ids) state.removeNode(id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

export function App() {
  const editingNodeId = useBoardStore((s) => s.editingNodeId)
  const selectedNodeId = useBoardStore((s) => s.selectedNodeId)
  const setEditingNodeId = useBoardStore((s) => s.setEditingNodeId)
  const selectNode = useBoardStore((s) => s.selectNode)
  const encloseCandidates = useBoardStore((s) => s.encloseCandidates)
  const setEncloseCandidates = useBoardStore((s) => s.setEncloseCandidates)
  const nodes = useBoardStore((s) => s.nodes)
  const setNodes = useBoardStore((s) => s.setNodes)

  useBoardPersistence()
  useSocket()
  useKeyboardShortcuts()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const chatOpen = useBoardStore((s) => s.chatOpen)
  const sidebarOpen = useBoardStore((s) => s.sidebarOpen)
  const toggleSidebar = useBoardStore((s) => s.toggleSidebar)

  return (
    <ReactFlowProvider>
      <div className="app-container" style={{ flexDirection: 'column' }}>
        <Topbar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              right: chatOpen ? 392 : 12,
              top: 12,
              zIndex: 50,
              transition: 'right 0.2s ease',
            }}>
              <UserList />
            </div>
            {!sidebarOpen && (
              <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 20 }}>
                <button className="sidebar-floating-btn" onClick={toggleSidebar} title="Open palette">
                  ☰
                </button>
              </div>
            )}
            <FlowCanvas />
          </div>
        </div>

        {/* Floating action bar for selected node */}
        {selectedNode && !editingNodeId && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a2e', border: '1px solid #3a3a5a', borderRadius: 10,
            padding: '8px 16px', display: 'flex', gap: 8, zIndex: 150,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', alignItems: 'center',
          }}>
            <span style={{ color: '#888', fontSize: 13, marginRight: 4 }}>
              {selectedNode.label || selectedNode.type}
            </span>
            <button className="topbar-btn" onClick={() => setEditingNodeId(selectedNode.id)}>
              ✏️ Edit
            </button>
            {encloseCandidates && encloseCandidates.containerId === selectedNode.id && (
              <button className="topbar-btn" style={{ borderColor: '#27ae60', color: '#27ae60' }}
                onClick={() => {
                  const container = nodes.find((n) => n.id === selectedNode.id)
                  if (!container) return
                  const updated = nodes.map((n) => {
                    if (!encloseCandidates.childIds.includes(n.id)) return n
                    const relX = n.position.x - container.position.x
                    const relY = n.position.y - container.position.y
                    return { ...n, parentId: selectedNode.id, position: { x: relX, y: relY } }
                  })
                  setNodes(updated)
                  setEncloseCandidates(null)
                }}>
                📦 Enclose {encloseCandidates.childIds.length}
              </button>
            )}
            <button className="topbar-btn" onClick={() => { selectNode(null); setEncloseCandidates(null) }}>
              Deselect
            </button>
          </div>
        )}

        {editingNodeId && <NodeEditorModal />}
        <ChatPanel />
        <ReviewPanel />
      </div>
    </ReactFlowProvider>
  )
}
