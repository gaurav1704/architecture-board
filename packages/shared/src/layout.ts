export interface LayoutNode {
  id: string
  type: string
  label: string
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

const NODE_WIDTH = 180
const NODE_HEIGHT = 80
const H_GAP = 60
const V_GAP = 40
const PADDING = 60

const LAYER_ORDER: Record<string, number> = {
  'load-balancer': 0,
  'mesh-lb': 0,
  'reverse-proxy': 0,
  'application-server': 1,
  'kubernetes-cluster': 1,
  'caching': 2,
  'in-memory-cache': 2,
  'messaging-queue': 3,
  'rabbitmq': 3,
  'database': 4,
  'mysql': 4,
  'elasticsearch': 4,
  'vpc': 0,
  'vpc-peering': 0,
  'transit-gateway': 0,
  'proxy': 0,
  'prometheus': 5,
  'grafana': 5,
  'kibana': 5,
  's3': 5,
  'gcs': 5,
  'external-system': 5,
}

export function computeLayout(proposedNodes: LayoutNode[], proposedEdges: LayoutEdge[]): LayoutResult {
  // Group nodes by layer
  const layers = new Map<number, LayoutNode[]>()
  for (const n of proposedNodes) {
    const layer = LAYER_ORDER[n.type] ?? 1
    if (!layers.has(layer)) layers.set(layer, [])
    layers.get(layer)!.push(n)
  }

  const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0])
  const resultNodes: LayoutResult['nodes'] = []
  const resultEdges: LayoutResult['edges'] = []

  let maxWidth = 0
  for (const [, layerNodes] of sortedLayers) {
    const w = layerNodes.length * (NODE_WIDTH + H_GAP) - H_GAP
    if (w > maxWidth) maxWidth = w
  }

  let y = PADDING
  for (const [layerIdx, layerNodes] of sortedLayers) {
    const totalW = layerNodes.length * (NODE_WIDTH + H_GAP) - H_GAP
    const startX = PADDING + (maxWidth - totalW) / 2

    for (let i = 0; i < layerNodes.length; i++) {
      const n = layerNodes[i]
      resultNodes.push({
        id: n.id,
        type: n.type,
        position: { x: startX + i * (NODE_WIDTH + H_GAP), y },
        config: n.config,
        label: n.label,
      })
    }
    y += NODE_HEIGHT + V_GAP
  }

  for (let i = 0; i < proposedEdges.length; i++) {
    const e = proposedEdges[i]
    resultEdges.push({
      id: `edge-${Date.now()}-${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
    })
  }

  return { nodes: resultNodes, edges: resultEdges }
}
