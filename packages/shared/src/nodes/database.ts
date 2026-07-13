import type { NodeTypeDefinition, NodeConfig } from './base.js'

export type DatabaseEngine = 'mongodb' | 'postgres' | 'clickhouse'

export interface ColumnDefinition {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignKeyRef?: string
  isIndexed: boolean
  isNullable: boolean
  defaultValue?: string
}

export interface TableDefinition {
  id: string
  name: string
  columns: ColumnDefinition[]
}

export interface RelationDefinition {
  id: string
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  type: 'oneToOne' | 'oneToMany' | 'manyToMany'
}

export interface DatabaseConfig extends NodeConfig {
  engine: DatabaseEngine
  version: string
  storage: number
  tables: TableDefinition[]
  relations: RelationDefinition[]
}

export const databaseDefinition: NodeTypeDefinition<DatabaseConfig> = {
  type: 'database',
  label: 'Database',
  color: '#2980b9',
  icon: '🗄️',
  category: 'databases',
  ports: [
    { id: 'inbound', label: 'Inbound', type: 'input', acceptedTypes: ['vpc', 'application-server'] },
    { id: 'outbound', label: 'Outbound', type: 'output' },
  ],
  defaultConfig: {
    engine: 'postgres',
    version: '16',
    storage: 100,
    tables: [],
    relations: [],
  },
  configFields: [
    {
      key: 'engine',
      label: 'Database Engine',
      type: 'select',
      required: true,
      options: [
        { label: 'MongoDB', value: 'mongodb' },
        { label: 'PostgreSQL', value: 'postgres' },
        { label: 'ClickHouse', value: 'clickhouse' },
      ],
    },
    { key: 'version', label: 'Version', type: 'text', required: true, placeholder: '16' },
    { key: 'storage', label: 'Storage (GB)', type: 'number', defaultValue: 100 },
    {
      key: 'tables',
      label: 'Tables / Collections',
      type: 'array',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        {
          key: 'columns',
          label: 'Columns',
          type: 'array',
          fields: [
            { key: 'name', label: 'Column Name', type: 'text', required: true },
            {
              key: 'type',
              label: 'Type',
              type: 'text',
              required: true,
              placeholder: 'VARCHAR(255) / ObjectId / String',
            },
            { key: 'isPrimaryKey', label: 'Primary Key', type: 'boolean', defaultValue: false },
            { key: 'isForeignKey', label: 'Foreign Key', type: 'boolean', defaultValue: false },
            { key: 'foreignKeyRef', label: 'FK Reference (table.column)', type: 'text' },
            { key: 'isIndexed', label: 'Indexed', type: 'boolean', defaultValue: false },
            { key: 'isNullable', label: 'Nullable', type: 'boolean', defaultValue: true },
            { key: 'defaultValue', label: 'Default Value', type: 'text' },
          ],
        },
      ],
    },
    {
      key: 'relations',
      label: 'Relations',
      type: 'array',
      fields: [
        { key: 'fromTable', label: 'From Table', type: 'text', required: true },
        { key: 'fromColumn', label: 'From Column', type: 'text', required: true },
        { key: 'toTable', label: 'To Table', type: 'text', required: true },
        { key: 'toColumn', label: 'To Column', type: 'text', required: true },
        {
          key: 'type',
          label: 'Relation Type',
          type: 'select',
          options: [
            { label: 'One to One', value: 'oneToOne' },
            { label: 'One to Many', value: 'oneToMany' },
            { label: 'Many to Many', value: 'manyToMany' },
          ],
        },
      ],
    },
  ],
}
