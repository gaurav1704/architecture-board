export type AiMode = 'create' | 'review' | 'modify'

export interface ChatMessage {
  id: string
  userId: string
  displayName: string
  content: string
  timestamp: string
  type: 'user' | 'ai-review' | 'ai-modify' | 'ai-create'
  metadata?: AiReviewResult | AiModifyResult | AiCreateResult
}

export interface AiReviewRequest {
  boardId: string
  question: string
}

export interface AiReviewResult {
  answer: string
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  suggestedNotes?: Partial<NotesSuggestion>
  timestamp: string
}

export interface AiModifyRequest {
  boardId: string
  instruction: string
}

export interface ProposedNodeChange {
  nodeId: string
  nodeLabel: string
  oldConfig: Record<string, unknown>
  newConfig: Record<string, unknown>
  summary: string
}

export interface AiModifyResult {
  proposedChanges: ProposedNodeChange[]
  explanation: string
  suggestedNotes?: Partial<NotesSuggestion>
  timestamp: string
}

export interface AiCreateRequest {
  boardId: string
  instruction: string
}

export interface ProposedNode {
  id: string
  type: string
  label: string
  config: Record<string, unknown>
}

export interface ProposedEdge {
  source: string
  target: string
  label?: string
}

export interface AiCreateResult {
  proposedNodes: ProposedNode[]
  proposedEdges: ProposedEdge[]
  explanation: string
  suggestedNotes?: Partial<NotesSuggestion>
  timestamp: string
}

export interface NotesSuggestion {
  functional: string
  nonFunctional: string
  calculations: string
}

export interface NodeChangeAcceptance {
  nodeId: string
  accepted: boolean
  editedConfig?: Record<string, unknown>
}
