import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoardStore } from '../store/boardStore.js'
import type { ChatMessage, AiMode, AiCreateResult, AiModifyResult } from '@board/shared'

const MODES: { mode: AiMode; label: string }[] = [
  { mode: 'create', label: 'Create' },
  { mode: 'review', label: 'Review' },
  { mode: 'modify', label: 'Modify' },
]

export function ChatPanel() {
  const chatOpen = useBoardStore((s) => s.chatOpen)
  const toggleChat = useBoardStore((s) => s.toggleChat)
  const messages = useBoardStore((s) => s.chatMessages)
  const addChatMessage = useBoardStore((s) => s.addChatMessage)
  const boardId = useBoardStore((s) => s.boardId)
  const ai = useBoardStore((s) => s.ai)
  const setAiState = useBoardStore((s) => s.setAiState)
  const setReviewOpen = useBoardStore((s) => s.setReviewOpen)
  const setNotes = useBoardStore((s) => s.setNotes)
  const notes = useBoardStore((s) => s.notes)

  const [input, setInput] = useState('')
  const [currentMode, setCurrentMode] = useState<AiMode>('review')
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !boardId) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: 'user',
      displayName: 'You',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      type: 'user',
    }
    addChatMessage(userMsg)
    setInput('')
    setAiState({ loading: true, mode: currentMode })
    setStreamingContent('')

    const settings = ai.settings

    try {
      const res = await fetch(`/api/ai/${currentMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, instruction: input.trim(), model: settings.model, apiUrl: settings.apiUrl, apiKey: settings.apiKey }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      let resultHandled = false
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            if (line === 'event: done') streamDone = true
            continue
          }
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.token) {
                fullContent += parsed.token
                setStreamingContent(fullContent)
              } else if (parsed.proposedNodes || parsed.proposedChanges || parsed.score !== undefined) {
                if (!resultHandled) {
                  console.log('[AI] Result event received, mode:', currentMode, 'keys:', Object.keys(parsed))
                  resultHandled = true
                  setStreamingContent('')
                  try { handleResult(parsed, currentMode) } catch (e) {
                    console.error('[AI] handleResult error:', e)
                    addChatMessage({ id: `msg-${Date.now()}`, userId: 'ai', displayName: 'Error', content: `Result error: ${(e as Error).message}`, timestamp: new Date().toISOString(), type: 'ai-review' })
                  }
                }
              } else if (parsed.error) {
                addChatMessage({
                  id: `msg-${Date.now()}`, userId: 'ai', displayName: 'Error',
                  content: parsed.error, timestamp: new Date().toISOString(), type: 'ai-review',
                })
              }
            } catch { /* skip */ }
          }
        }
      }

    } catch (err) {
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}`, userId: 'ai', displayName: 'Error',
        content: `Failed: ${(err as Error).message}`,
        timestamp: new Date().toISOString(), type: 'ai-review',
      }
      addChatMessage(errMsg)
    } finally {
      setAiState({ loading: false })
      setStreamingContent('')
    }
  }, [input, boardId, currentMode, addChatMessage, setAiState, setReviewOpen, setNotes, notes, ai.settings])

  function handleResult(data: any, mode: AiMode) {
    console.log(`[AI] ${mode} result received:`, { hasNodes: !!data.proposedNodes, hasChanges: !!data.proposedChanges, hasScore: data.score })
    const ts = new Date().toISOString()

    if (data.suggestedNotes || data.architectureDescription) {
      const suggestedArch = data.architectureDescription || data.suggestedNotes?.architecture
      setNotes({
        functional: data.suggestedNotes?.functional || notes.functional,
        nonFunctional: data.suggestedNotes?.nonFunctional || notes.nonFunctional,
        calculations: data.suggestedNotes?.calculations || notes.calculations,
        architecture: suggestedArch || notes.architecture,
      })
    }

    if (mode === 'create') {
      addChatMessage({
        id: `msg-${Date.now()}`, userId: 'ai', displayName: 'AI Create',
        content: data.explanation || `Proposed ${data.proposedNodes?.length || 0} nodes`,
        timestamp: ts, type: 'ai-create', metadata: data,
      })
      setAiState({ proposedChanges: [], createResult: data })
      if (data.proposedNodes?.length) setReviewOpen(true)
    } else if (mode === 'review') {
      addChatMessage({
        id: `msg-${Date.now()}`, userId: 'ai', displayName: 'AI Review',
        content: `**Score: ${data.score}/100**\n\n${data.answer}`,
        timestamp: ts, type: 'ai-review', metadata: data,
      })
      setAiState({ reviewAnswer: data.answer || '' })
    } else {
      const changes = data.proposedChanges || []
      addChatMessage({
        id: `msg-${Date.now()}`, userId: 'ai', displayName: 'AI Modify',
        content: data.explanation || `Proposed ${changes.length} change(s)`,
        timestamp: ts, type: 'ai-modify', metadata: data,
      })
      setAiState({ proposedChanges: changes })
      if (changes.length > 0) setReviewOpen(true)
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }, [handleSend]
  )

  if (!chatOpen) return null

  const placeholderMap: Record<AiMode, string> = {
    create: 'Describe the system you want to build...',
    review: 'Ask about your architecture...',
    modify: 'Describe what to fix or enhance...',
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 AI Assistant</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="chat-mode-switch">
            {MODES.map((m) => (
              <button key={m.mode} className={`chat-mode-btn ${currentMode === m.mode ? 'active' : ''}`} onClick={() => setCurrentMode(m.mode)}>{m.label}</button>
            ))}
          </div>
          <button className="modal-close" onClick={toggleChat}>✕</button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !streamingContent && (
          <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: 20 }}>
            {currentMode === 'create' && 'Describe a system — AI will generate a complete architecture.'}
            {currentMode === 'review' && 'Ask about your architecture for AI review with scoring.'}
            {currentMode === 'modify' && 'Describe what to fix — AI will propose per-node changes.'}
          </div>
        )}
        {messages.map((msg) => {
          const isAi = msg.type.startsWith('ai')
          const meta = msg.metadata as any
          return (
            <div key={msg.id} className={`chat-message ${isAi ? 'ai' : 'user'}`}>
              <div className="chat-meta">{msg.displayName} · {new Date(msg.timestamp).toLocaleTimeString()}</div>
              <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              {meta?.strengths && (
                <div style={{ padding: '4px 0' }}>
                  <div style={{ fontSize: 11, color: '#27ae60', marginBottom: 2 }}>Strengths</div>
                  {meta.strengths.map((s: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#aaa', paddingLeft: 8 }}>✓ {s}</div>)}
                </div>
              )}
              {meta?.weaknesses && (
                <div style={{ padding: '4px 0' }}>
                  <div style={{ fontSize: 11, color: '#e74c3c', marginBottom: 2 }}>Weaknesses</div>
                  {meta.weaknesses.map((w: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#aaa', paddingLeft: 8 }}>✗ {w}</div>)}
                </div>
              )}
            </div>
          )
        })}

        {/* Streaming content */}
        {streamingContent && (
          <div className="chat-message ai">
            <div className="chat-meta">AI · thinking</div>
            <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap', color: '#8af' }}>
              {streamingContent}
              <span className="review-loading" />
            </div>
          </div>
        )}

        {/* Loading indicator (before stream starts) */}
        {ai.loading && !streamingContent && (
          <div className="chat-message ai">
            <div className="chat-bubble" style={{ color: '#888' }}>Thinking<span className="review-loading" /></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea className="chat-input" rows={2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholderMap[currentMode]} />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim() || ai.loading}>Send</button>
      </div>
    </div>
  )
}
