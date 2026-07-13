export interface LayoutNode {
  id: string
  type: string
  label: string
  description?: string
  config: Record<string, unknown>
}

export interface LayoutEdge {
  source: string
  target: string
  label?: string
}

export interface LayoutResult {
  nodes: { id: string; type: string; position: { x: number; y: number }; config: Record<string, unknown>; label: string }[]
  edges: { id: string; source: string; target: string; label?: string }[]
}

const DEFAULT_NODE_W = 180
const DEFAULT_NODE_H = 80
const BASE_PAD = 60

function getNodeSize(node: LayoutNode, isLR: boolean): { layer: number; cross: number } {
  const cfg = node.config || {}
  const width = typeof cfg.width === 'number' ? cfg.width : DEFAULT_NODE_W
  const height = typeof cfg.height === 'number' ? cfg.height : DEFAULT_NODE_H
  return isLR
    ? { layer: width, cross: height }
    : { layer: height, cross: width }
}

/**
 * Build adjacency + reversed adjacency structures.
 */
function buildGraph(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const childrenOf = new Map<string, string[]>()
  const parentsOf = new Map<string, string[]>()
  const outEdges = new Map<string, LayoutEdge[]>()

  for (const n of nodes) {
    childrenOf.set(n.id, [])
    parentsOf.set(n.id, [])
    outEdges.set(n.id, [])
  }

  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue
    childrenOf.get(e.source)!.push(e.target)
    parentsOf.get(e.target)!.push(e.source)
    outEdges.get(e.source)!.push(e)
  }

  return { childrenOf, parentsOf, outEdges }
}

/**
 * Detect cycles and reverse back-edges so the remaining graph is a DAG.
 * Returns a Set of edge keys ("source->target") that should be treated as reversed
 * for layering purposes only. Original edge directions are preserved in output.
 */
function findFeedbackEdges(nodes: LayoutNode[], edges: LayoutEdge[]): Set<string> {
  const nodeIds = nodes.map((n) => n.id)
  const childrenOf = new Map<string, string[]>()
  for (const id of nodeIds) childrenOf.set(id, [])
  for (const e of edges) {
    if (childrenOf.has(e.source) && childrenOf.has(e.target)) {
      childrenOf.get(e.source)!.push(e.target)
    }
  }

  const visited = new Set<string>()
  const recStack = new Set<string>()
  const feedback = new Set<string>()

  // Sort children for deterministic cycle breaking
  for (const [, arr] of childrenOf) arr.sort()

  function dfs(id: string) {
    visited.add(id)
    recStack.add(id)
    for (const child of childrenOf.get(id)!) {
      if (!visited.has(child)) {
        dfs(child)
      } else if (recStack.has(child)) {
        feedback.add(`${id}->${child}`)
      }
    }
    recStack.delete(id)
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) dfs(id)
  }

  return feedback
}

/**
 * Assign layers using longest-path layering on the DAG obtained by treating
 * feedback edges as reversed.
 */
function assignLayers(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  feedbackEdges: Set<string>,
  aiLayer?: Record<string, number>
): Map<string, number> {
  const layerOf = new Map<string, number>()

  if (aiLayer) {
    for (const n of nodes) {
      layerOf.set(n.id, aiLayer[n.id] ?? 0)
    }
    return layerOf
  }

  const nodeIds = nodes.map((n) => n.id)
  const childrenOf = new Map<string, string[]>()
  const parentsOf = new Map<string, string[]>()
  for (const id of nodeIds) {
    childrenOf.set(id, [])
    parentsOf.set(id, [])
  }

  for (const e of edges) {
    if (!childrenOf.has(e.source) || !childrenOf.has(e.target)) continue
    const reversed = feedbackEdges.has(`${e.source}->${e.target}`)
    const src = reversed ? e.target : e.source
    const dst = reversed ? e.source : e.target
    childrenOf.get(src)!.push(dst)
    parentsOf.get(dst)!.push(src)
  }

  // Roots have no parents in the DAG
  const inDegree = new Map<string, number>()
  for (const id of nodeIds) inDegree.set(id, parentsOf.get(id)!.length)

  const queue: string[] = []
  for (const id of nodeIds) {
    if (inDegree.get(id) === 0) {
      layerOf.set(id, 0)
      queue.push(id)
    }
  }

  // Kahn's topological order with longest-path tracking
  for (const id of nodeIds) childrenOf.get(id)!.sort()

  let qi = 0
  while (qi < queue.length) {
    const id = queue[qi++]
    const currentLayer = layerOf.get(id) ?? 0
    for (const child of childrenOf.get(id)!) {
      const prev = layerOf.get(child)
      const nextLayer = currentLayer + 1
      if (prev === undefined || nextLayer > prev) {
        layerOf.set(child, nextLayer)
      }
      const deg = inDegree.get(child)! - 1
      inDegree.set(child, deg)
      if (deg === 0) queue.push(child)
    }
  }

  // Handle any remaining disconnected / cyclic leftovers
  for (const id of nodeIds) {
    if (!layerOf.has(id)) layerOf.set(id, 0)
  }

  return layerOf
}

/**
 * Minimize edge length / layer span by pulling nodes down when all their
 * descendants are deeper. Runs a few passes to compact the layout vertically.
 */
function compactLayers(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  layerOf: Map<string, number>
): Map<string, number> {
  const nodeIds = nodes.map((n) => n.id)
  const childrenOf = new Map<string, string[]>()
  const parentsOf = new Map<string, string[]>()
  for (const id of nodeIds) {
    childrenOf.set(id, [])
    parentsOf.set(id, [])
  }
  for (const e of edges) {
    if (!childrenOf.has(e.source) || !childrenOf.has(e.target)) continue
    childrenOf.get(e.source)!.push(e.target)
    parentsOf.get(e.target)!.push(e.source)
  }

  // Max layer (deepest)
  const maxLayer = Math.max(0, ...Array.from(layerOf.values()))

  // Process from deepest to shallowest: a node can be moved up to the highest
  // layer where all its children are still below it.
  for (let pass = 0; pass < 3; pass++) {
    const layers = new Map<number, string[]>()
    for (const id of nodeIds) {
      const l = layerOf.get(id) ?? 0
      if (!layers.has(l)) layers.set(l, [])
      layers.get(l)!.push(id)
    }

    for (let l = maxLayer; l >= 0; l--) {
      const ids = layers.get(l) || []
      for (const id of ids) {
        const childrenLayers = childrenOf.get(id)!.map((c) => layerOf.get(c) ?? maxLayer)
        const minChildLayer = childrenLayers.length > 0 ? Math.min(...childrenLayers) : maxLayer + 1
        const maxUp = minChildLayer - 1
        const parentsLayers = parentsOf.get(id)!.map((p) => layerOf.get(p) ?? 0)
        const minParentLayer = parentsLayers.length > 0 ? Math.max(...parentsLayers) : -1
        const targetLayer = Math.max(minParentLayer + 1, Math.min(layerOf.get(id) ?? l, maxUp))
        if (targetLayer < (layerOf.get(id) ?? l)) {
          layerOf.set(id, targetLayer)
        }
      }
    }
  }

  // Renumber layers to be 0..N contiguous
  const usedLayers = [...new Set(Array.from(layerOf.values()))].sort((a, b) => a - b)
  const layerRemap = new Map<number, number>()
  usedLayers.forEach((l, i) => layerRemap.set(l, i))
  for (const id of nodeIds) {
    layerOf.set(id, layerRemap.get(layerOf.get(id)!)!)
  }

  return layerOf
}

/**
 * Iterative crossing minimization using barycenter + median sweep.
 */
function orderLayers(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  layerOf: Map<string, number>,
  layers: Map<number, LayoutNode[]>
): Map<number, LayoutNode[]> {
  const nodeIds = nodes.map((n) => n.id)
  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  for (const id of nodeIds) {
    parentsOf.set(id, [])
    childrenOf.set(id, [])
  }
  for (const e of edges) {
    if (!parentsOf.has(e.source) || !parentsOf.has(e.target)) continue
    parentsOf.get(e.target)!.push(e.source)
    childrenOf.get(e.source)!.push(e.target)
  }

  function positionInLayer(id: string): number {
    const l = layerOf.get(id)!
    return (layers.get(l) || []).findIndex((n) => n.id === id)
  }

  function barycenter(ids: string[], neighborLayer: LayoutNode[], getNeighbors: (id: string) => string[]): number {
    if (ids.length === 0) return 0
    let sum = 0
    let count = 0
    for (const id of ids) {
      const neighbors = getNeighbors(id)
      for (const nid of neighbors) {
        const pos = neighborLayer.findIndex((n) => n.id === nid)
        if (pos >= 0) {
          sum += pos
          count++
        }
      }
    }
    return count > 0 ? sum / count : 0
  }

  function median(ids: string[], neighborLayer: LayoutNode[], getNeighbors: (id: string) => string[]): number {
    if (ids.length === 0) return 0
    const positions: number[] = []
    for (const id of ids) {
      for (const nid of getNeighbors(id)) {
        const pos = neighborLayer.findIndex((n) => n.id === nid)
        if (pos >= 0) positions.push(pos)
      }
    }
    if (positions.length === 0) return 0
    positions.sort((a, b) => a - b)
    const mid = Math.floor(positions.length / 2)
    return positions.length % 2 === 1 ? positions[mid] : (positions[mid - 1] + positions[mid]) / 2
  }

  function weightedValue(id: string, neighborLayer: LayoutNode[], getNeighbors: (id: string) => string[]): number {
    const b = barycenter([id], neighborLayer, getNeighbors)
    const m = median([id], neighborLayer, getNeighbors)
    // Weighted combination: median gives stability, barycenter gives fine detail
    return m * 0.6 + b * 0.4
  }

  const maxLayer = Math.max(...Array.from(layers.keys()))

  for (let iter = 0; iter < 10; iter++) {
    // Left-to-right sweep
    for (let l = 1; l <= maxLayer; l++) {
      const prev = layers.get(l - 1)
      const curr = layers.get(l)
      if (!prev || !curr || curr.length < 2) continue
      curr.sort((a, b) => {
        const av = weightedValue(a.id, prev, (id) => parentsOf.get(id) || [])
        const bv = weightedValue(b.id, prev, (id) => parentsOf.get(id) || [])
        return av - bv
      })
      layers.set(l, curr)
    }

    // Right-to-left sweep
    for (let l = maxLayer - 1; l >= 0; l--) {
      const next = layers.get(l + 1)
      const curr = layers.get(l)
      if (!next || !curr || curr.length < 2) continue
      curr.sort((a, b) => {
        const av = weightedValue(a.id, next, (id) => childrenOf.get(id) || [])
        const bv = weightedValue(b.id, next, (id) => childrenOf.get(id) || [])
        return av - bv
      })
      layers.set(l, curr)
    }
  }

  return layers
}

/**
 * Assign coordinates given ordered layers.
 */
function assignCoordinates(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  layers: Map<number, LayoutNode[]>,
  direction: 'TB' | 'LR'
): { nodes: LayoutResult['nodes']; edges: LayoutResult['edges'] } {
  const isLR = direction === 'LR'
  const nodeSizes = new Map<string, { layer: number; cross: number }>()
  for (const n of nodes) nodeSizes.set(n.id, getNodeSize(n, isLR))

  const layerGapBase = isLR ? 280 : 220
  const nodeGapBase = isLR ? 80 : 100

  const maxNodesPerLayer = Math.max(1, ...Array.from(layers.values()).map((l) => l.length))
  const densityFactor = Math.max(0.65, Math.min(1.35, maxNodesPerLayer / 6))

  const layerGap = layerGapBase * densityFactor
  const nodeGap = nodeGapBase * densityFactor

  // Scale spacing based on total graph complexity (node + edge count)
  const complexity = nodes.length + edges.length
  const complexityFactor = complexity > 40 ? 1.4
    : complexity > 25 ? 1.25
    : complexity > 15 ? 1.15
    : complexity > 8 ? 1.05
    : 1.0

  const finalLayerGap = layerGap * complexityFactor
  const finalNodeGap = nodeGap * complexityFactor

  const layerSpans: number[] = []
  for (let li = 0; ; li++) {
    const layer = layers.get(li)
    if (!layer) break
    let span = 0
    for (let i = 0; i < layer.length; i++) {
      const size = nodeSizes.get(layer[i].id)!
      span += size.cross + (i > 0 ? finalNodeGap : 0)
    }
    layerSpans[li] = span
  }
  const maxSpan = Math.max(1, ...layerSpans)

  const resultNodes: LayoutResult['nodes'] = []

  for (let li = 0; ; li++) {
    const layer = layers.get(li)
    if (!layer) break
    const span = layerSpans[li]
    const startOffset = (maxSpan - span) / 2

    let crossPos = BASE_PAD + startOffset
    const layerPos = BASE_PAD + li * finalLayerGap

    for (let i = 0; i < layer.length; i++) {
      const n = layer[i]
      const size = nodeSizes.get(n.id)!

      if (isLR) {
        resultNodes.push({ ...n, position: { x: layerPos, y: crossPos } })
      } else {
        resultNodes.push({ ...n, position: { x: crossPos, y: layerPos } })
      }

      crossPos += size.cross + finalNodeGap
    }
  }

  const resultEdges: LayoutResult['edges'] = []
  for (let i = 0; i < edges.length; i++) {
    resultEdges.push({
      id: `edge-${Date.now()}-${i}`,
      source: edges[i].source,
      target: edges[i].target,
      label: edges[i].label,
    })
  }

  return { nodes: resultNodes, edges: resultEdges }
}

export function computeLayout(
  proposedNodes: LayoutNode[],
  proposedEdges: LayoutEdge[],
  direction: 'TB' | 'LR' = 'TB',
  aiLayer?: Record<string, number>
): LayoutResult {
  if (proposedNodes.length === 0) return { nodes: [], edges: [] }

  const feedbackEdges = findFeedbackEdges(proposedNodes, proposedEdges)
  let layerOf = assignLayers(proposedNodes, proposedEdges, feedbackEdges, aiLayer)

  if (!aiLayer) {
    layerOf = compactLayers(proposedNodes, proposedEdges, layerOf)
  }

  // Group by layer
  const layers = new Map<number, LayoutNode[]>()
  for (const n of proposedNodes) {
    const l = layerOf.get(n.id) ?? 0
    if (!layers.has(l)) layers.set(l, [])
    layers.get(l)!.push(n)
  }

  // Initial sort within each layer by original index for stability
  const originalIndex = new Map<string, number>()
  proposedNodes.forEach((n, i) => originalIndex.set(n.id, i))
  for (const [l, arr] of layers) {
    arr.sort((a, b) => (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0))
    layers.set(l, arr)
  }

  orderLayers(proposedNodes, proposedEdges, layerOf, layers)

  return assignCoordinates(proposedNodes, proposedEdges, layers, direction)
}
