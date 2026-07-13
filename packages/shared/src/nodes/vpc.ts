import type { NodeTypeDefinition, NodeConfig } from './base.js'

export interface VpcConfig extends NodeConfig {
  cidr: string
  region: string
  subnetCount: number
  enableDnsHostnames: boolean
  tags: Record<string, string>
}

export const vpcDefinition: NodeTypeDefinition<VpcConfig> = {
  type: 'vpc',
  label: 'VPC',
  color: '#34495e',
  icon: '🌐',
  category: 'network',
  isContainer: true,
  ports: [
    { id: 'internal', label: 'Internal', type: 'output' },
    { id: 'peering', label: 'VPC Peering', type: 'input', acceptedTypes: ['vpc-peering'] },
  ],
  defaultConfig: {
    cidr: '10.0.0.0/16',
    region: 'us-east-1',
    subnetCount: 3,
    enableDnsHostnames: true,
    tags: {},
  },
  configFields: [
    { key: 'cidr', label: 'CIDR Block', type: 'text', required: true, placeholder: '10.0.0.0/16' },
    { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
    { key: 'subnetCount', label: 'Subnet Count', type: 'number', defaultValue: 3 },
    { key: 'enableDnsHostnames', label: 'Enable DNS Hostnames', type: 'boolean', defaultValue: true },
    { key: 'tags', label: 'Tags', type: 'json', description: 'Key-value resource tags' },
  ],
}
