import { memo, useCallback } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow'
import { getNodeType } from '@board/shared'
import type { BoardNode } from '@board/shared'
import { useBoardStore } from '../store/boardStore.js'

function CustomNode({ data, selected }: NodeProps<BoardNode & { layoutDirection?: string }>) {
  const layoutDirection = (data as any).layoutDirection || 'TB'
  const isLR = layoutDirection === 'LR'
  const inPos = isLR ? Position.Left : Position.Top
  const outPos = isLR ? Position.Right : Position.Bottom
  const definition = getNodeType(data.type)
  const color = definition?.color || '#4a4a6a'
  const icon = definition?.icon || '📦'
  const label = data.label || definition?.label || data.type

  const cfg = data.config as Record<string, unknown>

  if (definition?.isContainer) {
    const isCircle = data.type === 'circle'
    const isCloud = data.type === 'cloud'

    const handleResizeEnd = useCallback((_event: any, params: { width: number; height: number }) => {
      if (isCircle) {
        const d = Math.max(params.width, params.height)
        useBoardStore.getState().updateNodeConfig(data.id, { diameter: d })
      } else {
        useBoardStore.getState().updateNodeConfig(data.id, { width: params.width, height: params.height })
      }
    }, [data.id, isCircle])

    const cw = isCircle ? (cfg.diameter as number) || 250 : (cfg.width as number) || 300
    const ch = isCircle ? (cfg.diameter as number) || 250 : (cfg.height as number) || 200

    const containerStyle: React.CSSProperties = {
      width: cw,
      height: ch,
      borderRadius: isCircle ? '50%' : isCloud ? '30px' : 8,
      border: `2px dashed ${color}`,
      background: `${color}10`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 8,
      position: 'relative',
      opacity: 0.9,
      boxSizing: 'border-box',
    }

    const namespaces = (cfg.namespaces as any[]) || []
    const ingress = (cfg.ingress as any[]) || []

    return (
      <div className={`custom-node ${selected ? 'selected' : ''}`} style={containerStyle}>
        <NodeResizer minWidth={80} minHeight={60} isVisible={selected} onResizeEnd={handleResizeEnd} />
        <Handle type="target" position={inPos} id="in" style={{ background: color, top: isLR ? 20 : 0, left: isLR ? 0 : '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color, padding: '0 6px 4px' }}>{icon} {label}</div>

        <div style={{ flex: 1, display: 'flex', width: '100%', overflow: 'hidden' }}>
          {/* Left column: Common */}
          <div style={{ width: '38%', borderRight: '1px solid #2a2a4a', padding: '0 3px', overflowY: 'auto' }}>
            <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', padding: '2px 0' }}>Common</div>
            {ingress.length === 0 && <div style={{ fontSize: 8, color: '#555' }}>None</div>}
            {ingress.map((ing: any, i: number) => (
              <MiniNode key={i} label={ing.name || ing.host || ing.type || 'ingress'} color="#8af" />
            ))}
          </div>

          {/* Right column: Namespaces */}
          <div style={{ width: '62%', padding: '0 3px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', padding: '2px 0' }}>Namespaces</div>
            {namespaces.length === 0 && <div style={{ fontSize: 8, color: '#555' }}>None</div>}
            {namespaces.map((ns: any, i: number) => {
              const svcs = (ns.services as any[]) || []
              return (
                <div key={i} style={{ flex: 1, border: '1px solid #3a3a5a', borderRadius: 4, padding: 2, background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', minHeight: 24 }}>
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#ccc', marginBottom: 1 }}>📦 {ns.name || `ns-${i}`}</div>
                  <div style={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
                    <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {svcs.length === 0 && <div style={{ fontSize: 7, color: '#555' }}>No svc</div>}
                      {svcs.map((svc: any, j: number) => (
                        <MiniNode key={j} label={`${svc.name}:${svc.port || 80}`} color="#8af" icon="🔗" />
                      ))}
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Handle type="source" position={outPos} id="out" style={{ background: color, top: isLR ? 20 : 'auto', bottom: isLR ? 'auto' : 0, left: isLR ? 'auto' : '50%' }} />
      </div>
    )
  }

  const subText = getSubText(data)
  const isChild = !!data.parentId

  if (isChild) {
    return (
      <MiniNode label={label} color={color} icon={icon} sub={subText} id={data.id} />
    )
  }

  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`} style={{ borderColor: color, background: '#1a1a2e' }}>
      <Handle type="target" position={inPos} id="in" style={{ background: color }} />
      <div className="custom-node-header">
        <span className="custom-node-icon">{icon}</span>
        <span className="custom-node-label">{label}</span>
      </div>
      {subText && <div className="custom-node-sub">{subText}</div>}
      <Handle type="source" position={outPos} id="out" style={{ background: color }} />
    </div>
  )
}

function getSubText(data: BoardNode): string {
  const config = data.config as Record<string, unknown>
  switch (data.type) {
    case 'load-balancer': return `${String(config.type || 'alb').toUpperCase()}`
    case 'database': return String(config.engine || 'postgres')
    case 'application-server': return `${String(config.role || 'web-server').replace(/-/g, ' ')} ${config.version ? 'v' + config.version : ''}`
    case 'caching': return `${String(config.engine || 'redis')} · ${(config.useCases as string[])?.[0] || 'cache'}`
    case 'messaging-queue': return `${String(config.engine || 'kafka')} · ${String(config.brokers || 3)} brokers`
    case 'external-system': return String(config.name || 'External System')
    case 'vpc': return String(config.cidr || '10.0.0.0/16')
    case 'vpc-peering': return `→ ${String(config.peerVpcCidr || '?')}`
    case 'mysql': return `MySQL ${String(config.version || '8.0')}`
    case 'in-memory-cache': return `RAM · ${String(config.maxSize || '512mb')}`
    case 'transit-gateway': return String(config.region || 'us-east-1')
    case 'proxy': return String(config.protocol || 'HTTP')
    case 'reverse-proxy': return `Upstream: ${((config.upstreams || []) as any[]).length || 0}`
    case 'mesh-lb': return String(config.sidecarProxy || 'envoy')
    case 'kubernetes-cluster': {
      const ns = (config.namespaces as any[]) || []
      const svcs = ns.reduce((a, n) => a + ((n.services as any[])?.length || 0), 0)
      const apps = ns.reduce((a, n) => a + ((n.applications as any[])?.length || 0), 0)
      return `${ns.length} NS · ${svcs} svc · ${apps} app`
    }
    case 'elasticsearch': return `${String(config.version || '8.x')} · ${String(config.shards || 3)} shards`
    case 'prometheus': return `Retention: ${String(config.retentionDays || 15)}d`
    case 'grafana': return `${((config.dashboards || []) as any[]).length || 0} dashboards`
    case 'kibana': return String(config.version || '8.x')
    case 's3': case 'gcs': return String(config.bucketName || 'Unnamed')
    case 'rabbitmq': return `${String(config.version || '3.13')} · ${((config.vhosts || []) as any[]).length || 1} vhosts`
    default: return ''
  }
}

function MiniNode({ label, color, icon, sub, id }: { label: string; color: string; icon?: string; sub?: string; id?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3, padding: '1px 5px',
      borderRadius: 4, border: `1.5px solid ${color}`, background: `${color}12`,
      fontSize: 8, color: '#eee', width: '100%', boxSizing: 'border-box',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      position: 'relative',
    }}>
      {id && <Handle type="target" position={inPos} id={`${id}-in`} style={{ background: color, width: 6, height: 6, top: inPos === Position.Top ? 0 : '50%', left: inPos === Position.Left ? 0 : '50%', transform: 'translate(-50%, -50%)' }} />}
      {icon && <span style={{ fontSize: 9 }}>{icon}</span>}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {sub && <span style={{ color: '#888', fontSize: 7, flexShrink: 0 }}>{sub}</span>}
      {id && <Handle type="source" position={outPos} id={`${id}-out`} style={{ background: color, width: 6, height: 6, top: outPos === Position.Bottom ? '100%' : '50%', left: outPos === Position.Right ? '100%' : '50%', transform: 'translate(-50%, -50%)' }} />}
    </div>
  )
}

export default memo(CustomNode)
