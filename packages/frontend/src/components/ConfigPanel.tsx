import { useCallback, useMemo } from 'react'
import { getNodeType } from '@board/shared'
import type { ConfigField } from '@board/shared'
import { useBoardStore } from '../store/boardStore.js'

export function ConfigPanel() {
  const nodes = useBoardStore((s) => s.nodes)
  const selectedNodeId = useBoardStore((s) => s.selectedNodeId)
  const updateNodeConfig = useBoardStore((s) => s.updateNodeConfig)
  const removeNode = useBoardStore((s) => s.removeNode)

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  const definition = useMemo(
    () => (selectedNode ? getNodeType(selectedNode.type) : undefined),
    [selectedNode]
  )

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNode) return
      updateNodeConfig(selectedNode.id, { [key]: value })
    },
    [selectedNode, updateNodeConfig]
  )

  const handleArrayItemChange = useCallback(
    (key: string, index: number, fieldKey: string, value: unknown) => {
      if (!selectedNode) return
      const arr = (selectedNode.config[key] as unknown[]) || []
      const updated = [...arr]
      updated[index] = { ...(updated[index] as Record<string, unknown>), [fieldKey]: value }
      updateNodeConfig(selectedNode.id, { [key]: updated })
    },
    [selectedNode, updateNodeConfig]
  )

  const handleAddArrayItem = useCallback(
    (key: string, template: Record<string, unknown>) => {
      if (!selectedNode) return
      const arr = (selectedNode.config[key] as unknown[]) || []
      const id = `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
      updateNodeConfig(selectedNode.id, {
        [key]: [...arr, { ...template, id }],
      })
    },
    [selectedNode, updateNodeConfig]
  )

  const handleRemoveArrayItem = useCallback(
    (key: string, index: number) => {
      if (!selectedNode) return
      const arr = (selectedNode.config[key] as unknown[]) || []
      updateNodeConfig(selectedNode.id, {
        [key]: arr.filter((_, i) => i !== index),
      })
    },
    [selectedNode, updateNodeConfig]
  )

  if (!selectedNode || !definition) {
    return (
      <div className="config-panel">
        <div className="config-panel-header">
          <h3>Configuration</h3>
        </div>
        <div className="config-panel-body">
          <p style={{ color: '#888', fontSize: 13 }}>
            Select a node to configure
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="config-panel">
      <div className="config-panel-header">
        <span style={{ fontSize: 18 }}>{definition.icon}</span>
        <h3>{definition.label}</h3>
      </div>
      <div className="config-panel-body">
        {definition.configFields.map((field) => (
          <ConfigFieldRenderer
            key={field.key}
            field={field}
            value={selectedNode.config[field.key]}
            onChange={(v) => handleChange(field.key, v)}
            onArrayItemChange={(index, subKey, v) =>
              handleArrayItemChange(field.key, index, subKey, v)
            }
            onAddArrayItem={() =>
              handleAddArrayItem(
                field.key,
                Object.fromEntries(
                  (field.fields || []).map((f) => [f.key, f.defaultValue ?? ''])
                )
              )
            }
            onRemoveArrayItem={(index) => handleRemoveArrayItem(field.key, index)}
          />
        ))}

        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => removeNode(selectedNode.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #e74c3c',
              background: 'transparent',
              color: '#e74c3c',
              cursor: 'pointer',
              fontSize: 13,
              width: '100%',
            }}
          >
            Delete Node
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
  onArrayItemChange,
  onAddArrayItem,
  onRemoveArrayItem,
}: {
  field: ConfigField
  value: unknown
  onChange: (v: unknown) => void
  onArrayItemChange: (index: number, subKey: string, v: unknown) => void
  onAddArrayItem: () => void
  onRemoveArrayItem: (index: number) => void
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
                onArrayItemChange={onArrayItemChange}
                onAddArrayItem={onAddArrayItem}
                onRemoveArrayItem={onRemoveArrayItem}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'array') {
    const items = (value as unknown[]) || []
    return (
      <div className="config-field">
        <label>{field.label}</label>
        {items.map((item, idx) => (
          <div key={idx} className="config-array-item">
            <div className="config-array-header">
              <span style={{ fontSize: 12, color: '#888' }}>
                #{idx + 1}
              </span>
              <button
                className="remove-btn"
                onClick={() => onRemoveArrayItem(idx)}
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
                  onChange={(v) => onArrayItemChange(idx, subField.key, v)}
                  onArrayItemChange={onArrayItemChange}
                  onAddArrayItem={onAddArrayItem}
                  onRemoveArrayItem={onRemoveArrayItem}
                />
              )
            })}
          </div>
        ))}
        <button className="add-btn" onClick={onAddArrayItem}>
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
        <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
          {field.description}
        </p>
      )}
    </div>
  )
}

function renderInput(
  field: ConfigField,
  value: unknown,
  onChange: (v: unknown) => void
) {
  switch (field.type) {
    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={(value as number | string) ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : '')
          }
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
