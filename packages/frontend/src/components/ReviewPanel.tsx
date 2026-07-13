import { useCallback, useState } from 'react'
import { useBoardStore } from '../store/boardStore.js'
import type { ProposedNodeChange, NodeChangeAcceptance } from '@board/shared'
import { getNodeType } from '@board/shared'

export function ReviewPanel() {
  const reviewOpen = useBoardStore((s) => s.reviewOpen)
  const setReviewOpen = useBoardStore((s) => s.setReviewOpen)
  const ai = useBoardStore((s) => s.ai)
  const updateNodeConfig = useBoardStore((s) => s.updateNodeConfig)
  const setNodes = useBoardStore((s) => s.setNodes)
  const setEdges = useBoardStore((s) => s.setEdges)
  const addChatMessage = useBoardStore((s) => s.addChatMessage)

  const [acceptances, setAcceptances] = useState<Record<string, NodeChangeAcceptance>>({})
  const [editingOld, setEditingOld] = useState<Record<string, string>>({})
  const [editingNew, setEditingNew] = useState<Record<string, string>>({})

  const isCreate = ai.mode === 'create' && ai.createResult !== null
  const isModify = ai.mode === 'modify' || ai.mode === 'create'
  const raw = ai.proposedChanges
  const proposedChanges: ProposedNodeChange[] = Array.isArray(raw) ? raw.filter((c: any): c is ProposedNodeChange => c && typeof c === 'object') : []
  const createResult = ai.createResult

  // ── Hooks (must be before any conditional returns) ──

  const safeAccept = useCallback((change: ProposedNodeChange) => {
    try {
      const id = change.nodeId
      if (!id) return
      updateNodeConfig(id, change.newConfig || {})
      setAcceptances((prev) => ({ ...prev, [id]: { nodeId: id, accepted: true } }))
      addChatMessage({ id: `msg-${Date.now()}`, userId: 'system', displayName: 'System', content: `Accepted changes for "${change.nodeLabel}"`, timestamp: new Date().toISOString(), type: 'user' })
    } catch { /* silent */ }
  }, [updateNodeConfig, addChatMessage])

  const safeReject = useCallback((change: ProposedNodeChange) => {
    try {
      const id = change.nodeId
      if (!id) return
      setAcceptances((prev) => ({ ...prev, [id]: { nodeId: id, accepted: false } }))
      addChatMessage({ id: `msg-${Date.now()}`, userId: 'system', displayName: 'System', content: `Rejected changes for "${change.nodeLabel}"`, timestamp: new Date().toISOString(), type: 'user' })
    } catch { /* silent */ }
  }, [addChatMessage])

  const safeAcceptEdited = useCallback((change: ProposedNodeChange, side: 'old' | 'new') => {
    try {
      const id = change.nodeId
      if (!id) return
      const edited = side === 'old' ? editingOld[id] : editingNew[id]
      if (!edited) { safeAccept(change); return }
      const parsed = JSON.parse(edited)
      updateNodeConfig(id, parsed)
      setAcceptances((prev) => ({ ...prev, [id]: { nodeId: id, accepted: true, editedConfig: parsed } }))
      addChatMessage({ id: `msg-${Date.now()}`, userId: 'system', displayName: 'System', content: `Accepted edited changes for "${change.nodeLabel}"`, timestamp: new Date().toISOString(), type: 'user' })
    } catch {
      addChatMessage({ id: `msg-${Date.now()}`, userId: 'system', displayName: 'System', content: `Invalid JSON`, timestamp: new Date().toISOString(), type: 'user' })
    }
  }, [editingOld, editingNew, updateNodeConfig, addChatMessage, safeAccept])

  const handleAccept = useCallback((change: ProposedNodeChange) => safeAccept(change), [safeAccept])
  const handleReject = useCallback((change: ProposedNodeChange) => safeReject(change), [safeReject])
  const handleAcceptEdited = useCallback((change: ProposedNodeChange, side: 'old' | 'new') => safeAcceptEdited(change, side), [safeAcceptEdited])

  const acceptAll = useCallback(() => {
    const changes: ProposedNodeChange[] = Array.isArray(ai.proposedChanges) ? ai.proposedChanges.filter((c: any): c is ProposedNodeChange => c && typeof c === 'object') : []
    for (const c of changes) { safeAccept(c) }
  }, [ai.proposedChanges, safeAccept])

  console.log('[ReviewPanel] render:', { reviewOpen, isCreate, hasCreateResult: !!createResult, proposedChangesLen: proposedChanges.length, mode: ai.mode })

  if (!reviewOpen) return null

  // ── Create mode: show proposed full graph ──

  console.log('[Create] checking render:', { isCreate, hasCreateResult: !!createResult, resultType: createResult ? typeof createResult : 'N/A', hasNodes: !!createResult?.proposedNodes })
  try {
  if (isCreate && createResult) {
    const nodesList = Array.isArray(createResult.proposedNodes) ? createResult.proposedNodes : []
    const edgesList = Array.isArray(createResult.proposedEdges) ? createResult.proposedEdges : []
    console.log('[Create] render:', { nodes: nodesList.length, edges: edgesList.length, sampleNode: nodesList[0] })
    const handleAcceptAll = () => {
      const newNodes = nodesList.map((pn: any, i: number) => ({
        id: pn.id || `node-${Date.now()}-${i}`,
        type: pn.type,
        position: pn.position || { x: 100 + i * 220, y: 100 + (i % 3) * 120 },
        config: (pn.config || {}) as Record<string, unknown>,
        label: pn.label,
      }))
      const newEdges = edgesList.map((pe: any, i: number) => ({
        id: `edge-${Date.now()}-${i}`,
        source: pe.source,
        target: pe.target,
        label: pe.label,
      }))
      setNodes(newNodes)
      setEdges(newEdges)
      setReviewOpen(false)
      addChatMessage({
        id: `msg-${Date.now()}`,
        userId: 'system', displayName: 'System',
        content: `Accepted new architecture with ${newNodes.length} nodes and ${newEdges.length} connections`,
        timestamp: new Date().toISOString(), type: 'user',
      })
    }

    return (
      <div className="review-overlay" onClick={() => setReviewOpen(false)}>
        <div className="review-modal" onClick={(e) => e.stopPropagation()}>
          <div className="review-header">
            <h3>🏗️ Proposed Architecture</h3>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {nodesList.length} nodes · {edgesList.length} connections
            </p>
          </div>
          <div className="review-body">
            <div style={{ marginBottom: 16, fontSize: 13, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {createResult.explanation}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#eee', marginBottom: 8 }}>Nodes</div>
            {nodesList.map((n: any, i: number) => {
              const def = getNodeType(n.type)
              return (
                <div key={i} className="review-item" style={{ padding: 12 }}>
                  <div className="review-item-header">
                    <span className="review-item-title">
                      {def?.icon || '📦'} {n.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#888' }}>{n.type}</span>
                  </div>
                  <pre className="review-diff-code">{JSON.stringify(n.config, null, 2)}</pre>
                </div>
              )
            })}
            {edgesList.length > 0 && (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#eee', margin: '12px 0 8px' }}>Connections</div>
                {edgesList.map((e: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#aaa', padding: '4px 0' }}>
                    {e?.source || '?'} → {e?.target || '?'}{e?.label ? ` (${e.label})` : ''}
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button className="btn-danger" onClick={() => setReviewOpen(false)}>Reject All</button>
            <button className="review-accept-btn" onClick={handleAcceptAll}>Accept All</button>
          </div>
        </div>
      </div>
    )
  }
  } catch (e) { console.error('[Create] render error:', e); return null }

  // ── Modify mode: per-node diff ──

  if (proposedChanges.length === 0) return null

  const allDecided = proposedChanges.every((c) => acceptances[c.nodeId]?.accepted !== undefined)

  return (
    <div className="review-overlay" onClick={() => setReviewOpen(false)}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h3>📋 Review Proposed Changes</h3>
            <button className="modal-close" onClick={() => setReviewOpen(false)} type="button">✕</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: '#888' }}>{proposedChanges.length} change(s) proposed</span>
            <button className="topbar-btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={acceptAll}>✓ Accept All</button>
          </div>
        </div>
        <div className="review-body">
          {proposedChanges.filter((c): c is ProposedNodeChange => c && typeof c === 'object').map((change) => {
            const cid = change.nodeId || 'unknown'
            const decision = acceptances[cid]
            try {
              const label = change.nodeLabel || 'Unknown'
              const summary = change.summary || ''
              const oldCfg = change.oldConfig || {}
              const newCfg = change.newConfig || {}
              return (
                <div key={cid} className="review-item"
                  style={{
                    opacity: decision ? 0.5 : 1,
                    borderColor: decision?.accepted ? '#27ae60' : decision?.accepted === false ? '#e74c3c' : '#2a2a4a',
                  }}
                >
                  <div className="review-item-header">
                    <span className="review-item-title">{label}</span>
                    {decision && (
                      <span style={{ fontSize: 12, color: decision.accepted ? '#27ae60' : '#e74c3c' }}>
                        {decision.accepted ? '✓ Accepted' : '✕ Rejected'}
                      </span>
                    )}
                  </div>
                  <div className="review-item-summary">{summary}</div>
                  <div className="review-diff-grid">
                    <div className="review-diff-col">
                      <div className="review-diff-label">Current State</div>
                      <div className={`review-diff-code ${editingOld[cid] !== undefined ? 'editing' : ''}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => setEditingOld((p) => ({ ...p, [cid]: e.currentTarget.textContent || '' }))}>
                        {JSON.stringify(oldCfg, null, 2)}
                      </div>
                      <button className="review-accept-btn" style={{ alignSelf: 'flex-end', fontSize: 11, padding: '4px 10px' }}
                        onClick={() => handleAcceptEdited(change, 'old')} disabled={!!decision}>
                        Keep Current
                      </button>
                    </div>
                    <div className="review-diff-col">
                      <div className="review-diff-label">Proposed State</div>
                      <div className={`review-diff-code ${editingNew[cid] !== undefined ? 'editing' : ''}`}
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => setEditingNew((p) => ({ ...p, [cid]: e.currentTarget.textContent || '' }))}>
                        {JSON.stringify(newCfg, null, 2)}
                      </div>
                      <button className="review-accept-btn" style={{ alignSelf: 'flex-end', fontSize: 11, padding: '4px 10px' }}
                        onClick={() => handleAcceptEdited(change, 'new')} disabled={!!decision}>
                        Accept Proposed
                      </button>
                    </div>
                  </div>
                  {!decision && (
                    <div className="review-item-actions">
                      <button className="review-reject-btn" onClick={() => handleReject(change)}>Reject</button>
                      <button className="review-accept-btn" onClick={() => handleAccept(change)}>Accept</button>
                    </div>
                  )}
                </div>
              )
            } catch { return null }
          })}
          {allDecided && (
            <div style={{ textAlign: 'center', padding: 16, color: '#888', fontSize: 14 }}>
              All changes reviewed. Close to continue editing.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setReviewOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  )
}
