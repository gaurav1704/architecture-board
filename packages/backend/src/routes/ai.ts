import { Router } from 'express'
import { getBoard } from '../models/store.js'
import type { AiReviewResult, AiModifyResult, AiCreateResult } from '@board/shared'


export const aiRouter = Router()

// Must be before /:mode wildcard
const HLD_QUESTIONS = [
  {
    question: 'Design YouTube',
    problemStatement: 'Design a video sharing platform like YouTube that allows users to upload, watch, share, and discover videos at global scale with billions of users.',
    functional: '- User registration and profile management\n- Video upload with transcoding to multiple formats (360p, 720p, 1080p, 4K)\n- Video streaming with adaptive bitrate (HLS/DASH)\n- Search and discovery with filters and recommendations\n- Comments, likes, subscriptions, and playlists\n- Real-time notifications\n- Content moderation and reporting\n- Analytics dashboard for creators',
    nonFunctional: '- High availability: 99.99% uptime, multi-region active-active deployment\n- Low latency: <200ms for video start, <50ms for API calls\n- Scalability: support 2B+ monthly active users\n- Durability: no data loss for uploaded content (11x replication)\n- Consistency: strong consistency for metadata, eventual for views/likes\n- Cost efficiency: optimize CDN egress and cold storage\n- Security: DRM, signed URLs, WAF, rate limiting',
    calculations: '- DAU: 500M users\n- Daily uploads: 500,000 hours of video\n- Storage: 500K hrs × 500MB/hr = 250 TB/day raw → ~25 TB after compression → 9.1 PB/year\n- CDN bandwidth: 500M users × 30 min/day × 5 Mbps avg = 5.6 Tbps peak\n- Database: 500M users × 1KB/user = 500GB user data; 500M videos × 1KB = 500GB metadata\n- Search: 200M searches/day, need to index 5B+ videos\n- Transcoding: 500K hrs/day, takes 30 min per hr of video → 250K compute hours/day\n- Estimated annual cost: ~$200M CDN, ~$50M storage, ~$30M compute, ~$10M networking',
  },
  {
    question: 'Design WhatsApp',
    problemStatement: 'Design a real-time messaging platform like WhatsApp that supports billions of users with text, media, voice/video calls, and end-to-end encryption.',
    functional: '- One-on-one and group messaging\n- Media sharing (images, videos, documents)\n- Voice and video calls\n- End-to-end encryption\n- Read receipts and online status\n- Push notifications\n- Message sync across devices\n- Status/stories',
    nonFunctional: '- 99.999% availability for message delivery\n- <100ms latency for message delivery\n- Support 2B+ users\n- Messages must never be lost (durable persistence)\n- End-to-end encryption for privacy\n- Bandwidth efficient for low-connectivity regions',
    calculations: '- DAU: 1.5B users\n- Messages/day: 100B+ messages\n- Storage: 100B msgs × 100 bytes = 10TB/day = 3.6PB/year\n- Media: 500M images/day × 200KB = 100TB/day\n- Connections: 1.5B persistent WebSocket connections\n- Estimated cost: ~$50M/year for servers and bandwidth',
  },
  {
    question: 'Design Uber',
    problemStatement: 'Design a ride-hailing platform like Uber that connects riders with drivers, handles real-time tracking, pricing, and payments at global scale.',
    functional: '- Rider app: request ride, see ETA, track driver, pay\n- Driver app: receive requests, navigate, earnings\n- Matching algorithm: nearest driver algorithm\n- Dynamic pricing (surge pricing)\n- Real-time GPS tracking\n- Trip history and receipts\n- Rating system\n- Multiple ride types (economy, premium, XL)',
    nonFunctional: '- <1 second ride matching latency\n- 99.99% availability\n- Handle 100M+ daily trips\n- Strong consistency for ride matching\n- Eventually consistent for location updates\n- Global coverage across 70+ countries',
    calculations: '- DAU: 20M riders, 5M drivers\n- Daily trips: 50M\n- Matching requests: 200M/day (4x trips due to retries)\n- GPS updates: 5M drivers × 1 update/4sec = 1.25M writes/sec\n- Storage: 50M trips × 2KB = 100GB/day\n- Estimated cost: ~$20M/year for infrastructure',
  },
  {
    question: 'Design Twitter',
    problemStatement: 'Design a social media microblogging platform like Twitter that allows users to post short messages, follow others, and see a real-time timeline.',
    functional: '- Post tweets with 280 char limit\n- Follow/unfollow users\n- Home timeline (chronological + algorithmic)\n- Like, retweet, reply\n- Trending topics\n- Search\n- Direct messages\n- Media attachments (images, video)\n- Hashtags and mentions',
    nonFunctional: '- <500ms timeline load\n- 99.99% availability for reads\n- Handle 500M+ tweets/day\n- Eventual consistency for timeline (acceptable)\n- Strong consistency for follows and tweets\n- Handle viral events (celebrity tweets)',
    calculations: '- DAU: 300M users\n- Tweets/day: 500M\n- Timeline reads: 300M users × 10 refreshes/day = 3B reads/day\n- Storage: 500M tweets × 500 bytes = 250GB/day = 90TB/year\n- Follows: avg 200 follows/user → 60B follow relationships\n- Fanout writes: a celebrity with 50M followers → 50M writes per tweet\n- Estimated cost: ~$40M/year for infrastructure',
  },
]

aiRouter.post('/generate-hld', async (_req, res) => {
  const idx = Math.floor(Math.random() * HLD_QUESTIONS.length)
  res.json(HLD_QUESTIONS[idx])
})

const LAYER_ORDER: Record<string, number> = {
  'load-balancer': 0, 'mesh-lb': 0, 'reverse-proxy': 0,
  'application-server': 1, 'kubernetes-cluster': 1,
  'caching': 2, 'in-memory-cache': 2,
  'messaging-queue': 3, 'rabbitmq': 3,
  'database': 4, 'mysql': 4, 'elasticsearch': 4,
  'vpc': 0, 'vpc-peering': 0, 'transit-gateway': 0, 'proxy': 0,
  'prometheus': 5, 'grafana': 5, 'kibana': 5, 's3': 5, 'gcs': 5, 'external-system': 5,
}

function computeLayout(proposedNodes: any[], proposedEdges: any[], direction: 'TB' | 'LR' = 'TB', aiLayer?: Record<string, number>) {
  const NODE_W = 180, NODE_H = 80, PAD = 60
  const isLR = direction === 'LR'
  const nodeMap = new Map(proposedNodes.map((n: any) => [n.id, n]))

  const layerOf = new Map<string, number>()
  if (aiLayer) {
    for (const n of proposedNodes) layerOf.set(n.id, aiLayer[n.id] ?? 0)
  } else {
    // Find roots: nodes not targeted by any edge
    const targets = new Set(proposedEdges.map((e: any) => e.target))
    const roots = proposedNodes.filter((n: any) => !targets.has(n.id))
    const remaining = new Set(proposedNodes.map((n: any) => n.id))

    const queue: { id: string; depth: number }[] = roots.map((r: any) => ({ id: r.id, depth: 0 }))
    for (const r of roots) { layerOf.set(r.id, 0); remaining.delete(r.id) }

    const childrenOf = new Map<string, string[]>()
    for (const e of proposedEdges) {
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
      childrenOf.get(e.source)!.push(e.target)
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!
      for (const child of childrenOf.get(id) || []) {
        const newDepth = depth + 1
        if (!layerOf.has(child) || layerOf.get(child)! < newDepth) {
          layerOf.set(child, newDepth)
          remaining.delete(child)
        }
        if (!queue.find((q) => q.id === child)) {
          queue.push({ id: child, depth: newDepth })
        }
      }
    }

    for (const id of remaining) {
      if (!layerOf.has(id)) layerOf.set(id, 0)
    }
  }

  // Build parents map
  const parents = new Map<string, string[]>()
  for (const e of proposedEdges) {
    if (!parents.has(e.target)) parents.set(e.target, [])
    parents.get(e.target)!.push(e.source)
  }

  // Group nodes by layer
  const layers = new Map<number, any[]>()
  for (const n of proposedNodes) {
    const l = layerOf.get(n.id) ?? 0
    if (!layers.has(l)) layers.set(l, [])
    layers.get(l)!.push(n)
  }
  const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0])

  // Sort within each layer by parent position (barycenter heuristic)
  for (let li = 0; li < sortedLayers.length; li++) {
    const [layerNum, layerNodes] = sortedLayers[li]
    sortedLayers[li][1] = layerNodes.sort((a: any, b: any) => {
      const aParents = parents.get(a.id) || []
      const bParents = parents.get(b.id) || []
      const aAvg = avgParentIndex(aParents, layers, layerOf)
      const bAvg = avgParentIndex(bParents, layers, layerOf)
      return aAvg - bAvg
    })
  }

  function avgParentIndex(parentIds: string[], layerMap: Map<number, any[]>, layerMap2: Map<string, number>): number {
    if (parentIds.length === 0) return 0
    let sum = 0, count = 0
    for (const pid of parentIds) {
      const pl = layerMap2.get(pid) ?? 0
      const pn = layerMap.get(pl)
      if (pn) {
        const idx = pn.findIndex((x: any) => x.id === pid)
        if (idx >= 0) { sum += idx; count++ }
      }
    }
    return count > 0 ? sum / count : 0
  }

  // Dynamic spacing: gap scales with max nodes across layers
  const maxNodesPerLayer = Math.max(...sortedLayers.map(([, ln]) => ln.length), 1)
  const H_GAP = isLR ? 60 : Math.max(40, Math.min(100, 400 / maxNodesPerLayer))
  const V_GAP = isLR ? Math.max(40, Math.min(100, 400 / maxNodesPerLayer)) : 50

  // Calculate max span for centering
  let maxSpan = 0
  for (const [, nodes] of sortedLayers) {
    const span = nodes.length * (isLR ? NODE_H + V_GAP : NODE_W + H_GAP) - (isLR ? V_GAP : H_GAP)
    if (span > maxSpan) maxSpan = span
  }

  const resultNodes: any[] = []
  for (const [layerIdx, nodes] of sortedLayers) {
    const count = nodes.length
    if (isLR) {
      const x = PAD + layerIdx * (NODE_W + H_GAP)
      const colH = count * (NODE_H + V_GAP) - V_GAP
      const startY = PAD + (maxSpan - colH) / 2
      for (let i = 0; i < count; i++) {
        resultNodes.push({ ...nodes[i], position: { x, y: startY + i * (NODE_H + V_GAP) } })
      }
    } else {
      const y = PAD + layerIdx * (NODE_H + V_GAP)
      const rowW = count * (NODE_W + H_GAP) - H_GAP
      const startX = PAD + (maxSpan - rowW) / 2
      for (let i = 0; i < count; i++) {
        resultNodes.push({ ...nodes[i], position: { x: startX + i * (NODE_W + H_GAP), y } })
      }
    }
  }

  const resultEdges = proposedEdges.map((e: any, i: number) => ({ id: `edge-${Date.now()}-${i}`, source: e.source, target: e.target, label: e.label }))
  return { nodes: resultNodes, edges: resultEdges }
}

// ── Helpers ──

function serializeBoardGraph(board: { name: string; problemStatement?: string; notes?: any; nodes: any[]; edges: any[]; groups?: any[] }): string {
  const parts: string[] = [`Board: ${board.name}`]
  if (board.problemStatement) { parts.push('\n## Problem Statement'); parts.push(board.problemStatement) }
  if (board.notes) {
    if (board.notes.functional) { parts.push('\n## Functional Requirements'); parts.push(board.notes.functional) }
    if (board.notes.nonFunctional) { parts.push('\n## Non-Functional Requirements'); parts.push(board.notes.nonFunctional) }
    if (board.notes.calculations) { parts.push('\n## Capacity Planning'); parts.push(board.notes.calculations) }
  }
  parts.push('\n## Nodes')
  for (const n of board.nodes) {
    parts.push(`\nNode "${n.label || n.id}" (${n.id})\n  Type: ${n.type}\n  Config: ${JSON.stringify(n.config, null, 2)}`)
  }
  parts.push('\n## Connections')
  for (const e of board.edges) {
    const src = board.nodes.find((n) => n.id === e.source)
    const tgt = board.nodes.find((n) => n.id === e.target)
    parts.push(`  ${src?.label || e.source} → ${tgt?.label || e.target}`)
  }
  if (board.groups?.length) {
    parts.push('\n## Groups')
    for (const g of board.groups) {
      const children = g.childNodeIds.map((id: string) => board.nodes.find((n: any) => n.id === id)?.label || id).join(', ')
      parts.push(`  "${g.name}": ${g.description} | Contains: ${children}`)
    }
  }
  return parts.join('\n')
}

function buildSystemPrompt(mode: string): string {
  const base = 'You are an expert system architecture assistant. Respond with valid JSON only, no markdown or surrounding text.'
  if (mode === 'create') return `${base}\n\nGiven the current architecture context below, design a COMPLETE new architecture. Return a JSON object with:\n{\n  "explanation": "summary",\n  "proposedNodes": [{ "id": "uid", "type": "load-balancer|database|application-server|caching|messaging-queue|external-system|vpc|vpc-peering", "label": "Name", "config": { ... } }],\n  "proposedEdges": [{ "source": "id", "target": "id", "label": "desc" }],\n  "suggestedNotes": { "functional": "...", "nonFunctional": "...", "calculations": "..." },\n  "layout": { "nodeId1": 0, "nodeId2": 1, "nodeId3": 1, "nodeId4": 2, ... }\n}\nThe "layout" field maps each node ID to its layer number. Layer 0 = root (where traffic first enters, e.g. load balancers, API gateways). Layer 1 = immediate downstream (app servers that receive from layer 0). Layer 2 = databases, caches, queues that layer 1 nodes connect to. Keep the hierarchy as flat as possible. Use EXISTING nodes as reference but add/remove/restructure freely. Populate config fields meaningfully.`
  if (mode === 'review') return `${base}\n\nGiven the architecture below, evaluate it. Return:\n{\n  "answer": "detailed analysis",\n  "score": 0-100,\n  "strengths": [...],\n  "weaknesses": [...],\n  "suggestions": [...],\n  "suggestedNotes": { "functional": "...", "nonFunctional": "...", "calculations": "..." }\n}\nBe specific — reference actual node names. Score on scalability, reliability, security, cost, completeness.`
  return `${base}\n\nGiven the architecture below, enhance it by fixing missing metadata. Return:\n{\n  "explanation": "summary",\n  "proposedChanges": [{ "nodeId": "id", "nodeLabel": "Name", "summary": "what changed", "oldConfig": {}, "newConfig": {} }],\n  "suggestedNotes": { "functional": "...", "nonFunctional": "...", "calculations": "..." }\n}\nFill in: database→tables, server→routes, lb→rules, cache→settings, queue→topics, vpc→cidr. Only include nodes needing changes.`
}

// ── Streaming AI handler ──

aiRouter.post('/:mode', async (req, res) => {
  const { mode } = req.params
  if (!['create', 'review', 'modify'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' })
  }

  const { boardId, instruction, model: rawModel, apiUrl, apiKey } = req.body
  if (!boardId) return res.status(400).json({ error: 'boardId required' })
  if (!instruction) return res.status(400).json({ error: 'instruction required' })

  const board = getBoard(boardId)
  if (!board) return res.status(404).json({ error: 'Board not found' })

  const graph = serializeBoardGraph(board)
  const systemPrompt = buildSystemPrompt(mode)
  const userPrompt = `${systemPrompt}\n\nCurrent Architecture:\n${graph}\n\nUser request: ${instruction}`

  const effectiveKey = apiKey || process.env.OPENAI_API_KEY || ''
  const effectiveModel = (rawModel || process.env.AI_MODEL || 'gpt-4o-mini').replace(/^opencode\//, '')
  const effectiveUrl = (apiUrl || process.env.AI_API_URL || 'https://api.openai.com/v1').replace(/^[^a-zA-Z]*/, '').replace(/\/+$/, '')

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  let fullText = ''

  if (effectiveKey) {
    try {
      const apiRes = await fetch(`${effectiveUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${effectiveKey}` },
        body: JSON.stringify({
          model: effectiveModel,
          messages: [{ role: 'system', content: 'You are an expert system architecture assistant.' }, { role: 'user', content: userPrompt }],
          temperature: 0.3,
          stream: true,
        }),
      })

      if (!apiRes.ok) {
        const errBody = await apiRes.text()
        res.write(`event: error\ndata: ${JSON.stringify({ error: `API error: ${apiRes.status} — ${errBody.slice(0, 300)}` })}\n\n`)
        res.end()
        return
      }

      const reader = apiRes.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullText += content
                res.write(`event: token\ndata: ${JSON.stringify({ token: content })}\n\n`)
              }
            } catch { /* skip parse errors */ }
          }
        }
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
      return
    }
  } else {
    // Dev fallback
    const fallbacks: Record<string, string> = {
      create: JSON.stringify({
        explanation: 'Sample architecture proposal. Set OPENAI_API_KEY for real AI.',
        proposedNodes: [
          { id: 'lb-1', type: 'load-balancer', label: 'API Gateway', config: { type: 'alb', autoscaling: { minCount: 2, maxCount: 10, desiredCount: 3, scaleUpThreshold: 70, scaleDownThreshold: 30, cooldownSeconds: 300 }, routes: [{ id: 'r1', path: '/api/*', method: 'ANY', targetPort: 8080, targetProtocol: 'HTTP', healthCheckPath: '/health', isActive: true }] } },
          { id: 'app-1', type: 'application-server', label: 'API Server', config: { role: 'web-server', port: 8080, routes: [{ path: '/api/v1/users', method: 'GET', contentType: 'REST', description: 'List users', requestSchema: '{}', responseSchema: '{}' }], envVars: { DATABASE_URL: 'postgres://...' } } },
          { id: 'db-1', type: 'database', label: 'Primary DB', config: { engine: 'postgres', version: '16', storage: 500, tables: [{ id: 't1', name: 'users', columns: [{ name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isIndexed: true, isNullable: false }, { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isIndexed: true, isNullable: false }] }], relations: [] } },
          { id: 'cache-1', type: 'caching', label: 'Session Cache', config: { engine: 'redis', version: '7.2', useCases: ['cache'], maxMemory: '1gb', evictionPolicy: 'allkeys-lru', persistence: 'rdb' } },
        ],
        proposedEdges: [
          { source: 'lb-1', target: 'app-1' },
          { source: 'app-1', target: 'db-1' },
          { source: 'app-1', target: 'cache-1' },
        ],
        suggestedNotes: { functional: 'User management API', nonFunctional: '<200ms latency', calculations: '10K DAU' },
      }),
      review: JSON.stringify({
        answer: 'The architecture is well-structured.', score: 72,
        strengths: ['Good separation of concerns', 'Redis caching'],
        weaknesses: ['No DB redundancy', 'Missing monitoring'],
        suggestions: ['Add read replica', 'Add monitoring stack'],
        suggestedNotes: { nonFunctional: 'Target 99.95% availability' },
      }),
      modify: JSON.stringify({
        explanation: 'Sample modification. Set OPENAI_API_KEY for real AI.',
        proposedChanges: [
          { nodeId: 'node-1', nodeLabel: 'Database', summary: 'Added table schemas and indexes', oldConfig: { engine: 'postgres', tables: [] }, newConfig: { engine: 'postgres', tables: [{ id: 't1', name: 'users', columns: [] }] } },
        ],
        suggestedNotes: { functional: 'Added user table', calculations: 'Storage increased' },
      }),
    }

    fullText = fallbacks[mode] || fallbacks.modify
    // Simulate streaming tokens
    const chars = fullText.split('')
    for (let i = 0; i < chars.length; i += 3) {
      const chunk = chars.slice(i, i + 3).join('')
      res.write(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`)
      await new Promise((r) => setTimeout(r, 5))
    }
  }

  // Send final result
  try {
    const cleaned = fullText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    parsed.timestamp = new Date().toISOString()

    // Apply layout engine for create mode
    if (mode === 'create' && parsed.proposedNodes) {
      const layout = computeLayout(parsed.proposedNodes, parsed.proposedEdges || [], 'TB', parsed.layout)
      parsed.proposedNodes = layout.nodes
      parsed.proposedEdges = layout.edges
    }

    res.write(`event: result\ndata: ${JSON.stringify(parsed)}\n\n`)
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
  }
  res.write(`event: done\ndata: {}\n\n`)
  res.end()
})

// ── Non-streaming fallback for HLD ──

async function queryAi(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || ''
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  const baseUrl = (process.env.AI_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')

  if (apiKey) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: 'You are an expert system architecture assistant.' }, { role: 'user', content: prompt }], temperature: 0.3 }),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data: any = await res.json()
    return data.choices?.[0]?.message?.content || 'No response'
  }

  if (prompt.includes('HLD') || prompt.includes('high-level design')) {
    return JSON.stringify({
      question: 'Design YouTube',
      problemStatement: 'Design a video sharing platform at scale.',
      functional: '- Upload with transcoding\n- Streaming with adaptive bitrate\n- Search and discovery',
      nonFunctional: '- 99.99% uptime\n- <200ms latency\n- 2B+ MAU',
      calculations: '- DAU: 500M\n- Storage: 250TB/day\n- CDN: 5.6 Tbps',
    })
  }

  return JSON.stringify({
    explanation: 'Dev fallback — set OPENAI_API_KEY',
    proposedChanges: [{ nodeId: 'sample', nodeLabel: 'DB', summary: 'Added schema', oldConfig: { engine: 'postgres', tables: [] }, newConfig: { engine: 'postgres', tables: [{ id: 't1', name: 'users', columns: [] }] } }],
  })
}
