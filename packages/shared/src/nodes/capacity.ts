import type { ConfigField } from './base.js'

export interface CapacityConfig {
  instanceCount: number
  scalingMode: 'auto' | 'fixed' | 'manual'
  minInstances: number
  maxInstances: number
  instanceType: string
}

export const capacityPlanningDefault: CapacityConfig = {
  instanceCount: 1,
  scalingMode: 'auto',
  minInstances: 1,
  maxInstances: 5,
  instanceType: 't3.medium',
}

export const capacityPlanningFields: ConfigField = {
  key: 'capacityPlanning',
  label: 'Capacity Planning',
  type: 'group',
  fields: [
    { key: 'instanceCount', label: 'Instance Count', type: 'number', defaultValue: 1 },
    {
      key: 'scalingMode',
      label: 'Scaling Mode',
      type: 'select',
      options: [
        { label: 'Auto Scale', value: 'auto' },
        { label: 'Fixed', value: 'fixed' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    { key: 'minInstances', label: 'Min Instances', type: 'number', defaultValue: 1 },
    { key: 'maxInstances', label: 'Max Instances', type: 'number', defaultValue: 5 },
    { key: 'instanceType', label: 'Instance Type', type: 'text', defaultValue: 't3.medium' },
  ],
}
