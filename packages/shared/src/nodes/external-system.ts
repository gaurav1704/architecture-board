import type { NodeTypeDefinition, NodeConfig } from './base.js'

export interface ExternalRouteDefinition {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  contentType: 'REST' | 'gRPC'
  description: string
  requestSchema: string
  responseSchema: string
}

export interface ExternalSystemConfig extends NodeConfig {
  name: string
  description: string
  systemType: 'payment' | 'auth' | 'email' | 'sms' | 'analytics' | 'storage' | 'custom'
  baseUrl: string
  apiKeyEnvVar: string
  routes: ExternalRouteDefinition[]
}

export const externalSystemDefinition: NodeTypeDefinition<ExternalSystemConfig> = {
  type: 'external-system',
  label: 'External System',
  color: '#8e44ad',
  icon: '🔗',
  category: 'components',
  ports: [
    { id: 'inbound', label: 'Inbound', type: 'input', acceptedTypes: ['vpc', 'application-server'] },
    { id: 'outbound', label: 'Outbound', type: 'output' },
  ],
  defaultConfig: {
    name: '',
    description: '',
    systemType: 'custom',
    baseUrl: '',
    apiKeyEnvVar: '',
    routes: [],
  },
  configFields: [
    { key: 'name', label: 'System Name', type: 'text', required: true, placeholder: 'Stripe Payments' },
    { key: 'description', label: 'Description', type: 'text', placeholder: 'Handles payment processing' },
    {
      key: 'systemType',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Payment Gateway', value: 'payment' },
        { label: 'Auth Provider', value: 'auth' },
        { label: 'Email Service', value: 'email' },
        { label: 'SMS Service', value: 'sms' },
        { label: 'Analytics', value: 'analytics' },
        { label: 'Storage', value: 'storage' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.stripe.com' },
    { key: 'apiKeyEnvVar', label: 'API Key Env Variable', type: 'text', placeholder: 'STRIPE_API_KEY' },
    {
      key: 'routes',
      label: 'External API Routes',
      type: 'array',
      fields: [
        { key: 'path', label: 'Path', type: 'text', required: true, placeholder: '/v1/charges' },
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
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'requestSchema', label: 'Request Schema', type: 'json' },
        { key: 'responseSchema', label: 'Response Schema', type: 'json' },
      ],
    },
  ],
}
