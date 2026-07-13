import { useMemo, useState } from 'react'
import { getNodeType } from '@board/shared'
import type { ConfigField } from '@board/shared'
import { useBoardStore } from '../store/boardStore.js'

export function NodeEditorModal() {
  const nodes = useBoardStore((s) => s.nodes)
  const editingNodeId = useBoardStore((s) => s.editingNodeId)
  const setEditingNodeId = useBoardStore((s) => s.setEditingNodeId)
  const selectNode = useBoardStore((s) => s.selectNode)
  const updateNodeConfig = useBoardStore((s) => s.updateNodeConfig)
  const setNodeLabel = useBoardStore((s) => s.setNodeLabel)
  const removeNode = useBoardStore((s) => s.removeNode)

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === editingNodeId),
    [nodes, editingNodeId]
  )

  const definition = useMemo(
    () => (selectedNode ? getNodeType(selectedNode.type) : undefined),
    [selectedNode]
  )

  if (!selectedNode || !definition) return null

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingNodeId(null) }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <span style={{ fontSize: 22 }}>{definition.icon}</span>
            <h3>
              {definition.label}
              <span style={{ fontWeight: 400, fontSize: 13, color: '#888', marginLeft: 8 }}>
                · editing
              </span>
            </h3>
          </div>
          <button className="modal-close" onClick={() => setEditingNodeId(null)} type="button">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="config-field">
            <label>Name</label>
            <input
              type="text"
              value={selectedNode.label || ''}
              onChange={(e) => setNodeLabel(selectedNode.id, e.target.value)}
              placeholder="Node name"
            />
          </div>
          {definition.configFields.map((field) => (
            <ConfigFieldRenderer
              key={field.key}
              field={field}
              value={selectedNode.config[field.key]}
              onChange={(v) => updateNodeConfig(selectedNode.id, { [field.key]: v })}
            />
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn-danger" onClick={() => { removeNode(selectedNode.id); setEditingNodeId(null) }}>
            Delete Node
          </button>
          <button className="btn-secondary" onClick={() => setEditingNodeId(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfigFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: ConfigField
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (field.type === 'group') {
    return (
      <div className="config-field">
        <label>{field.label}</label>
        <div style={{ paddingLeft: 8, borderLeft: '2px solid #3a3a5a' }}>
          {(field.fields || []).map((subField) => {
            const groupValue = (value as Record<string, unknown>) || {}
            return (
              <ConfigFieldRenderer
                key={subField.key}
                field={subField}
                value={groupValue[subField.key]}
                onChange={(v) => onChange({ ...groupValue, [subField.key]: v })}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'array') {
    const items = (value as unknown[]) || []
    // Collapse top-level arrays with >3 items
    const isCollapsible = items.length > 3
    const [collapsed, setCollapsed] = useState(isCollapsible)
    const visibleItems = collapsed ? items.slice(0, 1) : items
    return (
      <div className="config-field">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ margin: 0 }}>{field.label} ({items.length})</label>
          {isCollapsible && (
            <button className="modal-close" onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 14 }}>
              {collapsed ? '▼' : '▲'}
            </button>
          )}
        </div>
        {visibleItems.map((item, idx) => (
          <div key={idx} className="config-array-item">
            <div className="config-array-header">
              <span style={{ fontSize: 12, color: '#888' }}>#{idx + 1}</span>
              <button
                className="remove-btn"
                onClick={() => {
                  const updated = items.filter((_, i) => i !== idx)
                  onChange(updated)
                }}
              >
                ✕ Remove
              </button>
            </div>
            {(field.fields || []).map((subField) => {
              const itemRecord = item as Record<string, unknown>
              return (
                <ConfigFieldRenderer
                  key={subField.key}
                  field={subField}
                  value={itemRecord[subField.key]}
                  onChange={(v) => {
                    const updated = [...items]
                    updated[idx] = { ...itemRecord, [subField.key]: v }
                    onChange(updated)
                  }}
                />
              )
            })}
          </div>
        ))}
        {collapsed && items.length > 1 && (
          <div style={{ fontSize: 11, color: '#666', padding: '4px 0', textAlign: 'center' }}>
            ... {items.length - 1} more items
          </div>
        )}
        <button
          className="add-btn"
          onClick={() => {
            const template = Object.fromEntries(
              (field.fields || []).map((f) => [f.key, f.defaultValue ?? ''])
            )
            const id = `${field.key}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
            onChange([...items, { ...template, id }])
          }}
        >
          + Add {field.label}
        </button>
      </div>
    )
  }

  return (
    <div className="config-field">
      <label>{field.label}</label>
      {renderInput(field, value, onChange)}
      {field.description && (
        <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{field.description}</p>
      )}
    </div>
  )
}

function renderInput(field: ConfigField, value: unknown, onChange: (v: unknown) => void) {
  switch (field.type) {
    case 'select':
      return (
        <select value={(value as string) || ''} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    case 'boolean':
      return (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      )
    case 'number':
      return (
        <input
          type="number"
          value={(value as number | string) ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder}
        />
      )
    case 'json':
      return (
        <textarea
          rows={4}
          value={
            value
              ? typeof value === 'string'
                ? value
                : JSON.stringify(value, null, 2)
              : ''
          }
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value))
            } catch {
              onChange(e.target.value)
            }
          }}
          placeholder={field.placeholder}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      )
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )
  }
}
