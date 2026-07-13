import type { NodeTypeDefinition, NodeConfig } from './base.js'

export type ServerRole = 'web-server' | 'cronjob' | 'consumer' | 'producer' | 'static-worker'

export interface RouteDefinition {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  contentType: 'REST' | 'gRPC'
  description: string
  requestSchema: string
  responseSchema: string
}

export interface ApplicationServerConfig extends NodeConfig {
  role: ServerRole
  port: number
  routes: RouteDefinition[]
  envVars: Record<string, string>
  queueTopic?: string
}

export const applicationServerDefinition: NodeTypeDefinition<ApplicationServerConfig> = {
  type: 'application-server',
  label: 'Application Server',
  color: '#27ae60',
  icon: '🖥️',
  category: 'application-server',
  ports: [
    { id: 'inbound', label: 'Inbound', type: 'input', acceptedTypes: ['vpc', 'load-balancer'] },
    { id: 'outbound', label: 'Outbound', type: 'output' },
    { id: 'msg-producer', label: 'Message Producer', type: 'output' },
    { id: 'msg-consumer', label: 'Message Consumer', type: 'input' },
  ],
  defaultConfig: {
    role: 'web-server',
    port: 8080,
    routes: [],
    envVars: {},
  },
  configFields: [
    {
      key: 'role',
      label: 'Server Role',
      type: 'select',
      required: true,
      options: [
        { label: 'Web Server (Exposes Routes)', value: 'web-server' },
        { label: 'Cronjob', value: 'cronjob' },
        { label: 'Static Worker (No Routes)', value: 'static-worker' },
        { label: 'Message Producer', value: 'producer' },
        { label: 'Message Consumer', value: 'consumer' },
      ],
    },
    {
      key: 'port',
      label: 'Exposed Port',
      type: 'number',
      defaultValue: 8080,
      description: 'Only applicable for web-server role',
    },
    {
      key: 'queueTopic',
      label: 'Queue Topic',
      type: 'text',
      placeholder: 'order-events',
      description: 'Topic name for producer/consumer roles',
    },
    {
      key: 'routes',
      label: 'API Routes',
      type: 'array',
      fields: [
        { key: 'path', label: 'Path', type: 'text', required: true, placeholder: '/api/v1/users' },
        {
          key: 'method',
          label: 'Method',
          type: 'select',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' },
          ],
        },
        {
          key: 'contentType',
          label: 'Type',
          type: 'select',
          options: [
            { label: 'REST', value: 'REST' },
            { label: 'gRPC', value: 'gRPC' },
          ],
        },
        { key: 'description', label: 'Description', type: 'text', placeholder: 'Fetch all users' },
        { key: 'requestSchema', label: 'Request Schema (JSON)', type: 'json' },
        { key: 'responseSchema', label: 'Response Schema (JSON)', type: 'json' },
      ],
    },
    { key: 'app', label: 'App Label', type: 'text', placeholder: 'user-service', description: 'Groups deployments together' },
    { key: 'version', label: 'Version', type: 'text', defaultValue: 'v1', placeholder: 'v1' },
    { key: 'labels', label: 'Labels (key:val)', type: 'text', placeholder: 'tier:backend,env:prod' },
    {
      key: 'envVars',
      label: 'Environment Variables',
      type: 'json',
      description: 'Key-value pairs for environment configuration',
    },
  ],
}
