import { useCallback } from 'react'
import { useBoardStore } from '../store/boardStore.js'

export function GroupRenderer() {
  const groups = useBoardStore((s) => s.groups)
  const selectedGroupIds = useBoardStore((s) => s.selectedGroupIds)
  const setSelectedGroupIds = useBoardStore((s) => s.setSelectedGroupIds)
  const updateGroup = useBoardStore((s) => s.updateGroup)
  const removeGroup = useBoardStore((s) => s.removeGroup)

  if (groups.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {groups.map((group) => {
        const isSelected = selectedGroupIds.includes(group.id)
        return (
          <div
            key={group.id}
            className={`group-node ${isSelected ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: group.position.x,
              top: group.position.y,
              width: group.width,
              height: group.height,
              pointerEvents: 'auto',
            }}
            onClick={() => setSelectedGroupIds([group.id])}
          >
            <div className="group-node-controls">
              <button
                className="group-node-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  removeGroup(group.id)
                }}
              >
                ✕
              </button>
            </div>
            <div className="group-node-header">
              <span>📦</span>
              <input
                className="group-node-name"
                value={group.name}
                onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Group name"
              />
            </div>
            <textarea
              className="group-node-desc"
              value={group.description}
              onChange={(e) => updateGroup(group.id, { description: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="Description..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: 11,
                resize: 'none',
                outline: 'none',
                padding: '0 8px',
                fontFamily: 'inherit',
              }}
              rows={2}
            />
          </div>
        )
      })}
    </div>
  )
}
