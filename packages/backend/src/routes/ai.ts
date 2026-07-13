import { Router } from 'express'
import { getBoard } from '../models/store.js'
import { computeLayout, getAllNodeTypes } from '@board/shared'
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

// ── Helpers ──

function serializeBoardGraph(board: { name: string; problemStatement?: string; notes?: any; nodes: any[]; edges: any[]; groups?: any[] }): string {
  const parts: string[] = [`Board: ${board.name}`]
  if (board.problemStatement) { parts.push('\n## Problem Statement'); parts.push(board.problemStatement) }
  if (board.notes) {
    if (board.notes.functional) { parts.push('\n## Functional Requirements'); parts.push(board.notes.functional) }
    if (board.notes.nonFunctional) { parts.push('\n## Non-Functional Requirements'); parts.push(board.notes.nonFunctional) }
    if (board.notes.calculations) { parts.push('\n## Capacity Planning'); parts.push(board.notes.calculations) }
    if (board.notes.architecture) { parts.push('\n## Architecture Description'); parts.push(board.notes.architecture) }
  }
  parts.push('\n## Nodes')
  for (const n of board.nodes) {
    const parts2: string[] = [`\nNode "${n.label || n.id}" (${n.id})`, `  Type: ${n.type}`]
    if (n.description) parts2.push(`  Description: ${n.description}`)
    parts2.push(`  Config: ${JSON.stringify(n.config, null, 2)}`)
    parts.push(parts2.join('\n'))
  }
  parts.push('\n## Connections')
  for (const e of board.edges) {
    const src = board.nodes.find((n) => n.id === e.source)
    const tgt = board.nodes.find((n) => n.id === e.target)
    const desc = e.description ? ` — ${e.description}` : ''
    parts.push(`  ${src?.label || e.source} → ${tgt?.label || e.target}${e.label ? ` (${e.label})` : ''}${desc}`)
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

function buildAvailableTypesList(): string {
  const all = getAllNodeTypes()
  const lines: string[] = []
  for (const def of all) {
    const fields = def.configFields.map((f) => f.key).join(', ')
    lines.push(`  - "${def.type}" (${def.label}, category: ${def.category}): config keys = { ${fields} }`)
  }
  return lines.join('\n')
}

function buildSystemPrompt(mode: string): string {
  const base = 'You are an expert system architecture assistant. Respond with valid JSON only, no markdown or surrounding text.'
  const archDescInstruction = '\n\nInclude "architectureDescription": a coherent narrative (2-4 paragraphs) explaining the overall architectural decisions: why each major component was chosen, how data/request flows through the system, what trade-offs were made, and how functional/non-functional requirements and scale are addressed.'
  const configInstruction = '\n\nIMPORTANT: For every node in proposedNodes (or newConfig in proposedChanges), populate ALL relevant config fields meaningfully based on the node type. This includes:\n- Database nodes: engine, version, storage, tables with columns/indexes, relations, capacityPlanning (instanceCount, scalingMode, minInstances, maxInstances, instanceType, cpuThreshold, memoryThreshold, capacityNotes)\n- Application Server nodes: role, port, routes (with path, method, contentType, requestSchema, responseSchema), envVars, capacityPlanning with HPA settings\n- Load Balancer nodes: type, autoscaling settings, routes, capacityPlanning\n- Cache nodes: engine, version, useCases, maxMemory, evictionPolicy, persistence, capacityPlanning\n- Messaging Queue nodes: engine, brokers, topics with partitions/replication, capacityPlanning\n- Security nodes (firewall, key-vault, kms, secret-manager): rules, policies, accessPolicies, keySpec\n- Network nodes (cdn, dns-resolver, proxy, reverse-proxy): provider, caching, routes, capacityPlanning\n- For horizontally scalable components, set capacityPlanning with appropriate instanceCount based on expected load. Use scalingMode "auto" with min/max instances and CPU/memory thresholds for auto-scaling, or "fixed" with a specific instanceCount. Always fill capacityNotes with the rationale for the instance count based on capacity planning calculations.'
  const availableTypes = `\n\nAvailable node types and their config keys:\n${buildAvailableTypesList()}`

  if (mode === 'create') return `${base}\n\nGiven the current architecture context below, design a COMPLETE new architecture. Return a JSON object with:\n{\n  "explanation": "brief summary of the design",\n  "architectureDescription": "detailed narrative explaining component choices, data/request flow, trade-offs, and how requirements/scale are met",\n  "proposedNodes": [{ "id": "uid", "type": "one of the available node types", "label": "Name", "description": "why this component is needed and what it does", "config": { ... all relevant config fields including capacityPlanning ... } }],\n  "proposedEdges": [{ "source": "id", "target": "id", "label": "desc", "description": "why this connection exists and what traffic/data flows here" }],\n  "suggestedNotes": { "functional": "...", "nonFunctional": "...", "calculations": "...", "architecture": "same as architectureDescription or a concise version" },\n  "layout": { "nodeId1": 0, "nodeId2": 1, "nodeId3": 1, "nodeId4": 2, ... }\n}\nThe "layout" field maps each node ID to its layer number. Layer 0 = root (where traffic first enters, e.g. load balancers, API gateways). Layer 1 = immediate downstream (app servers that receive from layer 0). Layer 2 = databases, caches, queues that layer 1 nodes connect to. Keep the hierarchy as flat as possible. Use EXISTING nodes as reference but add/remove/restructure freely. Populate config fields meaningfully. Every node and edge must include a meaningful description.${configInstruction}${availableTypes}${archDescInstruction}`
  if (mode === 'review') return `${base}\n\nGiven the architecture below, evaluate it. Return:\n{\n  "answer": "detailed analysis",\n  "score": 0-100,\n  "strengths": [...],\n  "weaknesses": [...],\n  "suggestions": [...],\n  "architectureDescription": "narrative explaining what the architecture does well, its key decisions, gaps, and how it addresses functional/non-functional requirements and scale",\n  "suggestedNotes": { "functional": "...", "nonFunctional": "...", "calculations": "...", "architecture": "same as architectureDescription or a concise version" }\n}\nBe specific — reference actual node names. Score on scalability, reliability, security, cost, completeness. Evaluate capacity planning, HPA settings, database schemas, routes, and security configurations where present.${archDescInstruction}`
  return `${base}\n\nGiven the architecture below, enhance it by fixing missing metadata and configs. Return:\n{\n  "explanation": "summary of changes",\n  "architectureDescription": "narrative explaining why each change was made and how it improves the architecture, requirements handling, and scale",\n  "proposedChanges": [{ "nodeId": "id", "nodeLabel": "Name", "summary": "what changed and why", "oldConfig": {}, "newConfig": { ... all relevant config fields including capacityPlanning ... } }],\n  "suggestedNotes": { "functional": "...", "nonFunctional": "...", "calculations": "...", "architecture": "same as architectureDescription or a concise version" }\n}\nFill in: database→tables/columns/indexes/relations, server→routes/envVars/capacityPlanning, lb→routes/autoscaling/capacityPlanning, cache→settings/capacityPlanning, queue→topics/brokers/capacityPlanning, security→rules/policies, network→provider/capacityPlanning. For horizontally scalable components, set capacityPlanning with appropriate instanceCount and HPA settings. Only include nodes needing changes. Each proposedChange.summary must explain the rationale.${configInstruction}${availableTypes}${archDescInstruction}`
}

// ── Model discovery ──

aiRouter.post('/models', async (req, res) => {
  const { apiUrl, apiKey } = req.body

  const effectiveKey = apiKey || process.env.OPENAI_API_KEY || ''
  const effectiveUrl = (apiUrl || process.env.AI_API_URL || 'https://api.openai.com/v1')
    .replace(/^[^a-zA-Z]*/, '')
    .replace(/\/+$/, '')

  console.log(`[models] Using base URL: ${effectiveUrl}`)

  if (!effectiveKey) {
    return res.status(400).json({ error: 'API key required to list models' })
  }

  try {
    const modelsUrl = new URL(`${effectiveUrl}/models`)
    modelsUrl.searchParams.set('return_wildcard_routes', 'false')
    modelsUrl.searchParams.set('include_model_access_groups', 'false')
    modelsUrl.searchParams.set('only_model_access_groups', 'false')
    modelsUrl.searchParams.set('include_metadata', 'false')

    console.log(`[models] Fetching from: ${modelsUrl.href}`)

    const apiRes = await fetch(modelsUrl.href, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${effectiveKey}`,
      },
    })

    if (!apiRes.ok) {
      const errBody = await apiRes.text()
      return res.status(apiRes.status).json({ error: `API error: ${apiRes.status} — ${errBody.slice(0, 300)}` })
    }

    const data: any = await apiRes.json()
    const models: string[] = (data.data || [])
      .map((m: any) => m.id)
      .filter((id: string) => typeof id === 'string' && id.length > 0)
      .sort()

    res.json({ models })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

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
        architectureDescription: 'This sample architecture uses an API Gateway to terminate traffic and route requests to a stateless API Server. The API Server reads/writes a PostgreSQL primary database for durability and uses Redis as a session cache to reduce latency. This split keeps compute stateless, allows independent scaling of each tier, and addresses read-heavy workloads through caching.',
        proposedNodes: [
          { id: 'lb-1', type: 'load-balancer', label: 'API Gateway', description: 'Terminates external traffic, performs TLS offload, and routes requests to the appropriate API servers.', config: { type: 'alb', autoscaling: { minCount: 2, maxCount: 10, desiredCount: 3, scaleUpThreshold: 70, scaleDownThreshold: 30, cooldownSeconds: 300 }, routes: [{ id: 'r1', path: '/api/*', method: 'ANY', targetPort: 8080, targetProtocol: 'HTTP', healthCheckPath: '/health', isActive: true }], capacityPlanning: { scalingMode: 'auto', instanceCount: 3, minInstances: 2, maxInstances: 10, instanceType: 't3.medium', cpuThreshold: 70, memoryThreshold: 80, capacityNotes: '2 ALB nodes minimum for HA, auto-scale up to 10 based on traffic' } } },
          { id: 'app-1', type: 'application-server', label: 'API Server', description: 'Stateless compute tier that handles business logic and orchestrates reads/writes between cache and database.', config: { role: 'web-server', port: 8080, routes: [{ path: '/api/v1/users', method: 'GET', contentType: 'REST', description: 'List users', requestSchema: '{}', responseSchema: '{}' }], envVars: { DATABASE_URL: 'postgres://...' }, capacityPlanning: { scalingMode: 'auto', instanceCount: 4, minInstances: 2, maxInstances: 20, instanceType: 't3.medium', cpuThreshold: 70, memoryThreshold: 80, capacityNotes: 'Start with 4 instances for 1K RPS, auto-scale to 20 at 70% CPU' } } },
          { id: 'db-1', type: 'database', label: 'Primary DB', description: 'Relational database of record for durable, strongly-consistent data.', config: { engine: 'postgres', version: '16', storage: 500, tables: [{ id: 't1', name: 'users', columns: [{ name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isIndexed: true, isNullable: false }, { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isIndexed: true, isNullable: false }] }], relations: [], capacityPlanning: { scalingMode: 'fixed', instanceCount: 1, minInstances: 1, maxInstances: 5, instanceType: 'r6i.2xlarge', cpuThreshold: 70, memoryThreshold: 80, capacityNotes: 'Primary instance with 500GB storage; add read replicas for read-heavy workloads' } } },
          { id: 'cache-1', type: 'caching', label: 'Session Cache', description: 'Low-latency key-value store for session data and hot reads, reducing load on the primary database.', config: { engine: 'redis', version: '7.2', useCases: ['cache'], maxMemory: '1gb', evictionPolicy: 'allkeys-lru', persistence: 'rdb', capacityPlanning: { scalingMode: 'fixed', instanceCount: 3, minInstances: 1, maxInstances: 6, instanceType: 'cache.m5.large', cpuThreshold: 70, memoryThreshold: 80, capacityNotes: '3-node Redis cluster for HA, 1GB per node' } } },
        ],
        proposedEdges: [
          { source: 'lb-1', target: 'app-1', description: 'Incoming client requests are forwarded from the gateway to healthy API servers.' },
          { source: 'app-1', target: 'db-1', description: 'API servers persist durable state and run transactional queries against the primary database.' },
          { source: 'app-1', target: 'cache-1', description: 'Frequently accessed session and lookup data is served from cache to improve latency.' },
        ],
        suggestedNotes: { functional: 'User management API', nonFunctional: '<200ms latency', calculations: '10K DAU', architecture: 'API Gateway → API Server → PostgreSQL + Redis. Stateless compute, cached sessions, durable primary database.' },
      }),
      review: JSON.stringify({
        answer: 'The architecture is well-structured.', score: 72,
        strengths: ['Good separation of concerns', 'Redis caching'],
        weaknesses: ['No DB redundancy', 'Missing monitoring'],
        suggestions: ['Add read replica', 'Add monitoring stack'],
        architectureDescription: 'The architecture separates ingress, compute, storage, and caching into distinct tiers, which simplifies scaling and reasoning. Redis caching improves read latency. However, it lacks a read replica for availability and a monitoring stack for operability at scale.',
        suggestedNotes: { nonFunctional: 'Target 99.95% availability', architecture: 'Separation of tiers is good; add read replica and monitoring for scale.' },
      }),
      modify: JSON.stringify({
        explanation: 'Sample modification. Set OPENAI_API_KEY for real AI.',
        architectureDescription: 'Adding a users table with proper indexing turns the generic database into a concrete persistence layer for the application. Indexes on primary and foreign keys support scalable lookups.',
        proposedChanges: [
          { nodeId: 'node-1', nodeLabel: 'Database', summary: 'Added table schemas and indexes to support user queries at scale', oldConfig: { engine: 'postgres', tables: [] }, newConfig: { engine: 'postgres', tables: [{ id: 't1', name: 'users', columns: [] }] } },
        ],
        suggestedNotes: { functional: 'Added user table', calculations: 'Storage increased', architecture: 'Schema added to the primary database with indexes for scalable reads.' },
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
      architecture: '',
    })
  }

  return JSON.stringify({
    explanation: 'Dev fallback — set OPENAI_API_KEY',
    proposedChanges: [{ nodeId: 'sample', nodeLabel: 'DB', summary: 'Added schema', oldConfig: { engine: 'postgres', tables: [] }, newConfig: { engine: 'postgres', tables: [{ id: 't1', name: 'users', columns: [] }] } }],
  })
}
