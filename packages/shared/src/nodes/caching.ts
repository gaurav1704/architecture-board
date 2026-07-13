import type { NodeTypeDefinition, NodeConfig } from './base.js'

export type CachingEngine = 'redis' | 'in-memory'

export type RedisUseCase = 'cache' | 'pubsub' | 'streams' | 'geolocation'

export interface CacheConfig extends NodeConfig {
  engine: CachingEngine
  version: string
  useCases: RedisUseCase[]
  maxMemory: string
  evictionPolicy: 'noeviction' | 'allkeys-lru' | 'volatile-lru' | 'allkeys-random' | 'volatile-ttl'
  persistence: 'none' | 'rdb' | 'aof' | 'both'
}

export const cachingDefinition: NodeTypeDefinition<CacheConfig> = {
  type: 'caching',
  label: 'Cache / Redis',
  color: '#e74c3c',
  icon: '⚡',
  category: 'cache',
  ports: [
    { id: 'inbound', label: 'Inbound', type: 'input', acceptedTypes: ['vpc', 'application-server'] },
    { id: 'outbound', label: 'Outbound', type: 'output' },
  ],
  defaultConfig: {
    engine: 'redis',
    version: '7.2',
    useCases: ['cache'],
    maxMemory: '512mb',
    evictionPolicy: 'allkeys-lru',
    persistence: 'rdb',
  },
  configFields: [
    {
      key: 'engine',
      label: 'Engine',
      type: 'select',
      required: true,
      options: [
        { label: 'Redis', value: 'redis' },
        { label: 'In-Memory Cache', value: 'in-memory' },
      ],
    },
    { key: 'version', label: 'Version', type: 'text', required: true, placeholder: '7.2' },
    {
      key: 'useCases',
      label: 'Use Cases',
      type: 'array',
      fields: [
        {
          key: 'value',
          label: 'Use Case',
          type: 'select',
          options: [
            { label: 'Cache', value: 'cache' },
            { label: 'Pub/Sub', value: 'pubsub' },
            { label: 'Streams', value: 'streams' },
            { label: 'Geolocation Database', value: 'geolocation' },
          ],
        },
      ],
    },
    { key: 'maxMemory', label: 'Max Memory', type: 'text', defaultValue: '512mb', placeholder: '512mb' },
    {
      key: 'evictionPolicy',
      label: 'Eviction Policy',
      type: 'select',
      options: [
        { label: 'No Eviction', value: 'noeviction' },
        { label: 'All Keys LRU', value: 'allkeys-lru' },
        { label: 'Volatile LRU', value: 'volatile-lru' },
        { label: 'All Keys Random', value: 'allkeys-random' },
        { label: 'Volatile TTL', value: 'volatile-ttl' },
      ],
    },
    {
      key: 'persistence',
      label: 'Persistence',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'RDB Snapshot', value: 'rdb' },
        { label: 'AOF', value: 'aof' },
        { label: 'Both RDB + AOF', value: 'both' },
      ],
    },
  ],
}
