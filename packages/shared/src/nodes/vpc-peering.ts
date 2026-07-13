import type { NodeTypeDefinition, NodeConfig } from './base.js'

export interface VpcPeeringConfig extends NodeConfig {
  peerVpcCidr: string
  peerRegion: string
  peerAccountId: string
  enableDnsResolution: boolean
  routeTableIds: string[]
}

export const vpcPeeringDefinition: NodeTypeDefinition<VpcPeeringConfig> = {
  type: 'vpc-peering',
  label: 'VPC Peering',
  color: '#7f8c8d',
  icon: '🔀',
  category: 'network',
  ports: [
    { id: 'source', label: 'Source VPC', type: 'input', acceptedTypes: ['vpc'] },
    { id: 'target', label: 'Target VPC', type: 'output' },
  ],
  defaultConfig: {
    peerVpcCidr: '',
    peerRegion: '',
    peerAccountId: '',
    enableDnsResolution: true,
    routeTableIds: [],
  },
  configFields: [
    { key: 'peerVpcCidr', label: 'Peer VPC CIDR', type: 'text', required: true, placeholder: '10.1.0.0/16' },
    { key: 'peerRegion', label: 'Peer Region', type: 'text', required: true, placeholder: 'us-west-2' },
    { key: 'peerAccountId', label: 'Peer Account ID', type: 'text', placeholder: '123456789012' },
    { key: 'enableDnsResolution', label: 'Enable DNS Resolution', type: 'boolean', defaultValue: true },
    {
      key: 'routeTableIds',
      label: 'Route Table IDs',
      type: 'array',
      fields: [
        { key: 'value', label: 'Route Table ID', type: 'text', placeholder: 'rtb-abc123' },
      ],
    },
  ],
}
