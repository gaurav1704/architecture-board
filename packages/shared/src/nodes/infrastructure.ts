import type { NodeTypeDefinition } from './base.js'

export const cdnDefinition: NodeTypeDefinition = {
  type: 'cdn',
  label: 'CDN',
  color: '#8e44ad',
  icon: '🌍',
  category: 'network',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { provider: 'cloudflare', priceClass: 'standard' },
  configFields: [
    { key: 'provider', label: 'Provider', type: 'select', options: [{ label: 'Cloudflare', value: 'cloudflare' }, { label: 'Akamai', value: 'akamai' }, { label: 'Fastly', value: 'fastly' }, { label: 'CloudFront', value: 'cloudfront' }] },
    { key: 'priceClass', label: 'Price Class', type: 'select', options: [{ label: 'Standard', value: 'standard' }, { label: 'All Edge Locations', value: 'all' }] },
  ],
}

export const firewallDefinition: NodeTypeDefinition = {
  type: 'firewall',
  label: 'Firewall',
  color: '#e74c3c',
  icon: '🔥',
  category: 'network',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { rules: 10, inspection: 'stateful' },
  configFields: [
    { key: 'rules', label: 'Rule Count', type: 'number', defaultValue: 10 },
    { key: 'inspection', label: 'Inspection Type', type: 'select', options: [{ label: 'Stateful', value: 'stateful' }, { label: 'Stateless', value: 'stateless' }] },
  ],
}

export const keyVaultDefinition: NodeTypeDefinition = {
  type: 'key-vault',
  label: 'Key Vault',
  color: '#f39c12',
  icon: '🔐',
  category: 'security',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { keys: 5, rotationDays: 90 },
  configFields: [
    { key: 'keys', label: 'Key Count', type: 'number', defaultValue: 5 },
    { key: 'rotationDays', label: 'Rotation (days)', type: 'number', defaultValue: 90 },
  ],
}

export const dnsResolverDefinition: NodeTypeDefinition = {
  type: 'dns-resolver',
  label: 'DNS Resolver',
  color: '#3498db',
  icon: '🔍',
  category: 'network',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { ttl: 300, recordCount: 50 },
  configFields: [
    { key: 'ttl', label: 'TTL (seconds)', type: 'number', defaultValue: 300 },
    { key: 'recordCount', label: 'Record Count', type: 'number', defaultValue: 50 },
  ],
}

export const secretManagerDefinition: NodeTypeDefinition = {
  type: 'secret-manager',
  label: 'Secret Manager',
  color: '#e67e22',
  icon: '🛡️',
  category: 'security',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { secrets: 20, autoRotation: true },
  configFields: [
    { key: 'secrets', label: 'Secret Count', type: 'number', defaultValue: 20 },
    { key: 'autoRotation', label: 'Auto Rotation', type: 'boolean', defaultValue: true },
  ],
}

export const kmsDefinition: NodeTypeDefinition = {
  type: 'kms',
  label: 'KMS',
  color: '#1abc9c',
  icon: '🔑',
  category: 'security',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { keyType: 'symmetric', rotationPeriod: '1y' },
  configFields: [
    { key: 'keyType', label: 'Key Type', type: 'select', options: [{ label: 'Symmetric', value: 'symmetric' }, { label: 'Asymmetric', value: 'asymmetric' }] },
    { key: 'rotationPeriod', label: 'Rotation Period', type: 'select', options: [{ label: '1 Year', value: '1y' }, { label: '2 Years', value: '2y' }, { label: '5 Years', value: '5y' }] },
  ],
}
