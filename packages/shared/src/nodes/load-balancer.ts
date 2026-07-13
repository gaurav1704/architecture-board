import type { NodeTypeDefinition, NodeConfig } from './base.js'
import { capacityPlanningDefault, capacityPlanningFields } from './capacity.js'

export interface LoadBalancerConfig extends NodeConfig {
  type: 'alb' | 'nlb'
  autoscaling: {
    minCount: number
    maxCount: number
    desiredCount: number
    scaleUpThreshold: number
    scaleDownThreshold: number
    cooldownSeconds: number
  }
  routes: RouteRule[]
}

export interface RouteRule {
  id: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ANY'
  targetPort: number
  targetProtocol: 'HTTP' | 'HTTPS' | 'gRPC'
  healthCheckPath: string
  isActive: boolean
}

export const loadBalancerDefinition: NodeTypeDefinition<LoadBalancerConfig> = {
  type: 'load-balancer',
  label: 'Load Balancer',
  color: '#e67e22',
  icon: '⚖️',
  category: 'load-balancer',
  ports: [
    { id: 'inbound', label: 'Inbound', type: 'input', acceptedTypes: ['vpc'] },
    { id: 'outbound', label: 'Outbound', type: 'output' },
  ],
  defaultConfig: {
    type: 'alb',
    autoscaling: {
      minCount: 1,
      maxCount: 10,
      desiredCount: 2,
      scaleUpThreshold: 70,
      scaleDownThreshold: 30,
      cooldownSeconds: 300,
    },
    routes: [],
    capacityPlanning: { ...capacityPlanningDefault, instanceCount: 2, scalingMode: 'auto', minInstances: 2, maxInstances: 10, instanceType: 't3.medium' },
  },
  configFields: [
    {
      key: 'type',
      label: 'Load Balancer Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Application Load Balancer (ALB)', value: 'alb' },
        { label: 'Network Load Balancer (NLB)', value: 'nlb' },
      ],
    },
    {
      key: 'autoscaling',
      label: 'Autoscaling Group',
      type: 'group',
      fields: [
        { key: 'minCount', label: 'Min Instances', type: 'number', defaultValue: 1 },
        { key: 'maxCount', label: 'Max Instances', type: 'number', defaultValue: 10 },
        { key: 'desiredCount', label: 'Desired Instances', type: 'number', defaultValue: 2 },
        { key: 'scaleUpThreshold', label: 'Scale Up CPU %', type: 'number', defaultValue: 70 },
        { key: 'scaleDownThreshold', label: 'Scale Down CPU %', type: 'number', defaultValue: 30 },
        { key: 'cooldownSeconds', label: 'Cooldown (s)', type: 'number', defaultValue: 300 },
      ],
    },
    {
      key: 'routes',
      label: 'Route Matching Rules',
      type: 'array',
      fields: [
        { key: 'path', label: 'Path Pattern', type: 'text', placeholder: '/api/*' },
        {
          key: 'method',
          label: 'HTTP Method',
          type: 'select',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'ANY', value: 'ANY' },
          ],
        },
        { key: 'targetPort', label: 'Target Port', type: 'number', defaultValue: 80 },
        {
          key: 'targetProtocol',
          label: 'Protocol',
          type: 'select',
          options: [
            { label: 'HTTP', value: 'HTTP' },
            { label: 'HTTPS', value: 'HTTPS' },
            { label: 'gRPC', value: 'gRPC' },
          ],
        },
        { key: 'healthCheckPath', label: 'Health Check Path', type: 'text', placeholder: '/health' },
        { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
      ],
    },
    capacityPlanningFields,
  ],
}
