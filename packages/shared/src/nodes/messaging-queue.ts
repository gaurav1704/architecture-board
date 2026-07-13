import type { NodeTypeDefinition, NodeConfig } from './base.js'

export type MessagingEngine = 'kafka' | 'rabbitmq'

export interface KafkaTopic {
  name: string
  partitions: number
  replicationFactor: number
  retentionMs: number
  cleanupPolicy: 'delete' | 'compact' | 'compact_delete'
}

export interface MessagingQueueConfig extends NodeConfig {
  engine: MessagingEngine
  version: string
  brokers: number
  topics: KafkaTopic[]
  zookeeperEnsemble: number
}

export const messagingQueueDefinition: NodeTypeDefinition<MessagingQueueConfig> = {
  type: 'messaging-queue',
  label: 'Messaging Queue',
  color: '#f39c12',
  icon: '📨',
  category: 'messaging-queues',
  ports: [
    { id: 'inbound', label: 'Inbound', type: 'input', acceptedTypes: ['vpc', 'application-server'] },
    { id: 'outbound', label: 'Outbound', type: 'output' },
    { id: 'producer', label: 'Producer Connection', type: 'input' },
    { id: 'consumer', label: 'Consumer Connection', type: 'output' },
  ],
  defaultConfig: {
    engine: 'kafka',
    version: '3.6',
    brokers: 3,
    topics: [],
    zookeeperEnsemble: 3,
  },
  configFields: [
    {
      key: 'engine',
      label: 'Engine',
      type: 'select',
      required: true,
      options: [
        { label: 'Apache Kafka', value: 'kafka' },
        { label: 'RabbitMQ', value: 'rabbitmq' },
      ],
    },
    { key: 'version', label: 'Version', type: 'text', required: true, placeholder: '3.6' },
    { key: 'brokers', label: 'Broker Count', type: 'number', defaultValue: 3 },
    { key: 'zookeeperEnsemble', label: 'ZooKeeper Ensemble Size', type: 'number', defaultValue: 3 },
    {
      key: 'topics',
      label: 'Topics',
      type: 'array',
      fields: [
        { key: 'name', label: 'Topic Name', type: 'text', required: true, placeholder: 'order-events' },
        { key: 'partitions', label: 'Partitions', type: 'number', defaultValue: 3 },
        { key: 'replicationFactor', label: 'Replication Factor', type: 'number', defaultValue: 2 },
        {
          key: 'retentionMs',
          label: 'Retention (ms)',
          type: 'number',
          defaultValue: 604800000,
          description: 'Default: 7 days',
        },
        {
          key: 'cleanupPolicy',
          label: 'Cleanup Policy',
          type: 'select',
          options: [
            { label: 'Delete', value: 'delete' },
            { label: 'Compact', value: 'compact' },
            { label: 'Compact + Delete', value: 'compact_delete' },
          ],
        },
      ],
    },
  ],
}
