import { memo, useMemo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getBezierPath, type EdgeProps } from 'reactflow'
import type { FlowDirection } from '@board/shared'
import { useBoardStore } from '../store/boardStore.js'

const directionIcons: Record<string, string> = {
  ltr: '→',
  rtl: '←',
  bidirectional: '↔',
  none: '—',
}

const directionLabels: Record<string, string> = {
  ltr: 'Left to Right',
  rtl: 'Right to Left',
  bidirectional: 'Bidirectional',
  none: 'No Direction',
}

function FlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const direction: FlowDirection = data?.direction || 'ltr'
  const offset = (data as any)?.offset || 0
  const edgeStyle = (data as any)?.edgeStyle || 'smoothstep'
  const isLR = sourcePosition === 'left' || sourcePosition === 'right'
  const selectedNodeIds = useBoardStore((s) => s.selectedNodeIds)
  const selectedNodeId = useBoardStore((s) => s.selectedNodeId)
  const isConnectedToSelected = selectedNodeIds.includes(source) || selectedNodeIds.includes(target) || selectedNodeId === source || selectedNodeId === target

  const [edgePath, labelX, labelY] = useMemo(() => {
    const getPath = edgeStyle === 'smoothstep' ? getSmoothStepPath : getBezierPath
    if (offset === 0) {
      return getPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 })
    }
    if (isLR) {
      return getPath({
        sourceX, sourceY: sourceY + offset, sourcePosition,
        targetX, targetY: targetY + offset, targetPosition,
        borderRadius: 8,
      })
    }
    return getPath({
      sourceX: sourceX + offset, sourceY, sourcePosition,
      targetX: targetX + offset, targetY, targetPosition,
      borderRadius: 8,
    })
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset, edgeStyle, isLR])

  const markerEnd = direction === 'ltr' || direction === 'bidirectional' ? `url(#arrow-end)` : undefined
  const markerStart = direction === 'rtl' ? `url(#arrow-start)` : direction === 'bidirectional' ? `url(#arrow-end-rev)` : undefined
  const markerEndSel = direction === 'ltr' || direction === 'bidirectional' ? `url(#arrow-end-sel)` : undefined
  const markerStartSel = direction === 'rtl' ? `url(#arrow-start-sel)` : direction === 'bidirectional' ? `url(#arrow-end-rev-sel)` : undefined

  return (
    <>
      <defs>
        <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#4a4a6a" />
        </marker>
        <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#4a4a6a" />
        </marker>
        <marker id="arrow-end-rev" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#4a4a6a" />
        </marker>
        <marker id="arrow-end-sel" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8af" />
        </marker>
        <marker id="arrow-start-sel" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#8af" />
        </marker>
        <marker id="arrow-end-rev-sel" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8af" />
        </marker>
      </defs>
      {/* Wider invisible hit area for easier clicking */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer', pointerEvents: 'stroke' }} />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected || isConnectedToSelected ? '#8af' : '#4a4a6a',
          strokeWidth: selected || isConnectedToSelected ? 3 : 2,
          cursor: 'pointer',
          filter: selected || isConnectedToSelected ? 'drop-shadow(0 0 4px rgba(90,138,255,0.5))' : undefined,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
        markerEnd={selected || isConnectedToSelected ? markerEndSel : markerEnd}
        markerStart={selected || isConnectedToSelected ? markerStartSel : markerStart}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: selected || isConnectedToSelected ? '#2a2a5a' : '#1a1a2e',
            border: `1px solid ${selected || isConnectedToSelected ? '#8af' : '#4a4a6a'}`,
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 11,
            color: selected || isConnectedToSelected ? '#8af' : '#888',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            pointerEvents: 'all',
            transition: 'all 0.15s',
          }}
          title={directionLabels[direction]}
        >
          {directionIcons[direction] || '→'}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(FlowEdge)
