export interface PortDefinition {
  id: string
  label: string
  type: 'input' | 'output'
  acceptedTypes?: string[]
}

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'json' | 'array' | 'group'
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  defaultValue?: unknown
  fields?: ConfigField[]
  description?: string
}

export interface NodeConfig {
  [key: string]: unknown
}

export interface ValidationError {
  field: string
  message: string
}

export type ValidationResult = { valid: true } | { valid: false; errors: ValidationError[] }

export interface NodeTypeDefinition<TConfig extends NodeConfig = NodeConfig> {
  type: string
  label: string
  color: string
  icon: string
  category: NodeCategory
  ports: PortDefinition[]
  defaultConfig: TConfig
  configFields: ConfigField[]
  isContainer?: boolean
  validateConfig?: (config: TConfig) => ValidationResult
}

export type NodeCategory =
  | 'databases'
  | 'cache'
  | 'network'
  | 'load-balancer'
  | 'components'
  | 'application-server'
  | 'messaging-queues'
  | 'external'
  | 'shapes'
  | 'security'

export interface BoardNode<TConfig extends NodeConfig = NodeConfig> {
  id: string
  type: string
  position: { x: number; y: number }
  config: TConfig
  label: string
  description?: string
  parentId?: string
}

export type FlowDirection = 'ltr' | 'rtl' | 'bidirectional' | 'none'

export interface BoardEdge {
  id: string
  source: string
  target: string
  sourcePort?: string
  targetPort?: string
  label?: string
  description?: string
  direction?: FlowDirection
}
