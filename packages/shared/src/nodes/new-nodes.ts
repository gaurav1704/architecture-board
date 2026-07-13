import type { NodeTypeDefinition, NodeConfig } from './base.js'

// ── MySQL ──

export const mysqlDefinition: NodeTypeDefinition = {
  type: 'mysql',
  label: 'MySQL',
  color: '#00758f',
  icon: '🐬',
  category: 'databases',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { version: '8.0', storage: 100 },
  configFields: [
    { key: 'version', label: 'Version', type: 'text', defaultValue: '8.0' },
    { key: 'storage', label: 'Storage (GB)', type: 'number', defaultValue: 100 },
  ],
}

// ── In-Memory Cache ──

export const inMemoryCacheDefinition: NodeTypeDefinition = {
  type: 'in-memory-cache',
  label: 'In-Memory Cache',
  color: '#e67e22',
  icon: '🧠',
  category: 'cache',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { maxSize: '512mb', ttl: 3600 },
  configFields: [
    { key: 'maxSize', label: 'Max Size', type: 'text', defaultValue: '512mb' },
    { key: 'ttl', label: 'TTL (seconds)', type: 'number', defaultValue: 3600 },
  ],
}

// ── Transit Gateway ──

export const transitGatewayDefinition: NodeTypeDefinition = {
  type: 'transit-gateway',
  label: 'Transit Gateway',
  color: '#8e44ad',
  icon: '🔀',
  category: 'network',
  ports: [
    { id: 'in1', label: 'Attachment 1', type: 'input' },
    { id: 'in2', label: 'Attachment 2', type: 'input' },
    { id: 'out1', label: 'Route 1', type: 'output' },
    { id: 'out2', label: 'Route 2', type: 'output' },
  ],
  defaultConfig: { region: 'us-east-1' },
  configFields: [
    { key: 'region', label: 'Region', type: 'text', defaultValue: 'us-east-1' },
  ],
}

// ── Proxy ──

export const proxyDefinition: NodeTypeDefinition = {
  type: 'proxy',
  label: 'Proxy',
  color: '#2c3e50',
  icon: '🔄',
  category: 'network',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { targetUrl: '', protocol: 'HTTP' },
  configFields: [
    { key: 'targetUrl', label: 'Target URL', type: 'text' },
    { key: 'protocol', label: 'Protocol', type: 'select', options: [{ label: 'HTTP', value: 'HTTP' }, { label: 'HTTPS', value: 'HTTPS' }, { label: 'SOCKS5', value: 'SOCKS5' }] },
  ],
}

// ── Reverse Proxy ──

export const reverseProxyDefinition: NodeTypeDefinition = {
  type: 'reverse-proxy',
  label: 'Reverse Proxy',
  color: '#16a085',
  icon: '🔁',
  category: 'network',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { upstreams: [], sslTermination: true },
  configFields: [
    { key: 'upstreams', label: 'Upstream Servers', type: 'array', fields: [{ key: 'host', label: 'Host', type: 'text' }, { key: 'port', label: 'Port', type: 'number' }] },
    { key: 'sslTermination', label: 'SSL Termination', type: 'boolean', defaultValue: true },
  ],
}

// ── Mesh Load Balancer ──

export const meshLbDefinition: NodeTypeDefinition = {
  type: 'mesh-lb',
  label: 'Mesh LB',
  color: '#d35400',
  icon: '🔮',
  category: 'load-balancer',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { meshName: '', sidecarProxy: 'envoy' },
  configFields: [
    { key: 'meshName', label: 'Mesh Name', type: 'text' },
    { key: 'sidecarProxy', label: 'Sidecar Proxy', type: 'select', options: [{ label: 'Envoy', value: 'envoy' }, { label: 'Linkerd', value: 'linkerd' }, { label: 'Istio', value: 'istio' }] },
  ],
}

// ── Shape Nodes (containers) ──

function shapeConfig(width: number, height: number) {
  return {
    type: 'rectangle' as const,
    width,
    height,
    borderRadius: 0,
  }
}

const shapeFields = [
  { key: 'width', label: 'Width', type: 'number' as const, defaultValue: 300 },
  { key: 'height', label: 'Height', type: 'number' as const, defaultValue: 200 },
]

export const rectangleDefinition: NodeTypeDefinition = {
  type: 'rectangle',
  label: 'Rectangle',
  color: '#7f8c8d',
  icon: '▬',
  category: 'shapes',
  isContainer: true,
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: shapeConfig(300, 200),
  configFields: shapeFields,
}

export const squareDefinition: NodeTypeDefinition = {
  type: 'square',
  label: 'Square',
  color: '#95a5a6',
  icon: '⬜',
  category: 'shapes',
  isContainer: true,
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: shapeConfig(250, 250),
  configFields: shapeFields,
}

export const circleDefinition: NodeTypeDefinition = {
  type: 'circle',
  label: 'Circle',
  color: '#bdc3c7',
  icon: '⭕',
  category: 'shapes',
  isContainer: true,
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { diameter: 250 },
  configFields: [{ key: 'diameter', label: 'Diameter', type: 'number', defaultValue: 250 }],
}

export const cloudDefinition: NodeTypeDefinition = {
  type: 'cloud',
  label: 'Cloud',
  color: '#ecf0f1',
  icon: '☁️',
  category: 'shapes',
  isContainer: true,
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { provider: 'aws', width: 350, height: 250 },
  configFields: [
    { key: 'provider', label: 'Provider', type: 'select', options: [{ label: 'AWS', value: 'aws' }, { label: 'GCP', value: 'gcp' }, { label: 'Azure', value: 'azure' }] },
    { key: 'width', label: 'Width', type: 'number', defaultValue: 350 },
    { key: 'height', label: 'Height', type: 'number', defaultValue: 250 },
  ],
}

// ── Kubernetes Cluster (container) ──

export const kubernetesClusterDefinition: NodeTypeDefinition = {
  type: 'kubernetes-cluster',
  label: 'K8s Cluster',
  color: '#326ce5',
  icon: '☸️',
  category: 'components',
  isContainer: true,
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { version: '1.29', nodeCount: 3, width: 500, height: 400, ingress: [], namespaces: [] },
  configFields: [
    { key: 'version', label: 'Version', type: 'text', defaultValue: '1.29' },
    { key: 'nodeCount', label: 'Node Count', type: 'number', defaultValue: 3 },
    { key: 'width', label: 'Width', type: 'number', defaultValue: 500 },
    { key: 'height', label: 'Height', type: 'number', defaultValue: 400 },
    {
      key: 'ingress',
      label: 'Ingress / VS / Mesh LB (Common)',
      type: 'array',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'api-gateway' },
        { key: 'type', label: 'Type', type: 'select', options: [{ label: 'Ingress', value: 'ingress' }, { label: 'VirtualService', value: 'virtualservice' }, { label: 'Mesh LB', value: 'mesh-lb' }] },
        { key: 'host', label: 'Host', type: 'text', placeholder: 'api.example.com' },
        { key: 'port', label: 'Port', type: 'number', defaultValue: 443 },
      ],
    },
    {
      key: 'namespaces',
      label: 'Namespaces',
      type: 'array',
      fields: [
        { key: 'name', label: 'Namespace', type: 'text', required: true, placeholder: 'production' },
        {
          key: 'virtualServices',
          label: 'Virtual Services',
          type: 'array',
          fields: [
            { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'user-vs' },
            { key: 'hosts', label: 'Hosts', type: 'text', placeholder: 'user.example.com' },
            { key: 'httpMatch', label: 'HTTP Match', type: 'text', placeholder: '/api/*' },
          ],
        },
        {
          key: 'destinationRules',
          label: 'Destination Rules',
          type: 'array',
          fields: [
            { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'user-dr' },
            { key: 'host', label: 'Host', type: 'text', placeholder: 'user-service' },
            { key: 'trafficPolicy', label: 'Traffic Policy', type: 'select', options: [{ label: 'Round Robin', value: 'round_robin' }, { label: 'Least Request', value: 'least_request' }, { label: 'Random', value: 'random' }] },
          ],
        },
        {
          key: 'services',
          label: 'Services',
          type: 'array',
          fields: [
            { key: 'name', label: 'Service Name', type: 'text', required: true, placeholder: 'user-service' },
            { key: 'type', label: 'Type', type: 'select', options: [{ label: 'ClusterIP', value: 'clusterip' }, { label: 'NodePort', value: 'nodeport' }, { label: 'LoadBalancer', value: 'loadbalancer' }] },
            { key: 'port', label: 'Port', type: 'number', defaultValue: 80 },
            { key: 'targetPort', label: 'Target Port', type: 'number', defaultValue: 8080 },
          ],
        },
        {
          key: 'applications',
          label: 'Applications (Deployments)',
          type: 'array',
          fields: [
            { key: 'name', label: 'Deployment Name', type: 'text', required: true, placeholder: 'user-api' },
            { key: 'app', label: 'App Label', type: 'text', placeholder: 'user-service' },
            { key: 'version', label: 'Version', type: 'text', defaultValue: 'v1', placeholder: 'v1' },
            { key: 'labels', label: 'Labels (key:val)', type: 'text', placeholder: 'tier:backend,env:prod' },
            { key: 'image', label: 'Image', type: 'text', placeholder: 'nginx:latest' },
            { key: 'replicas', label: 'Replicas', type: 'number', defaultValue: 2 },
            { key: 'cpu', label: 'CPU Request', type: 'text', defaultValue: '500m' },
            { key: 'memory', label: 'Memory Request', type: 'text', defaultValue: '512Mi' },
            {
              key: 'pods',
              label: 'Pods',
              type: 'array',
              fields: [
                { key: 'name', label: 'Pod Name', type: 'text', placeholder: 'user-api-7d8f9c' },
                { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Running', value: 'running' }, { label: 'Pending', value: 'pending' }, { label: 'CrashLoop', value: 'crashloop' }] },
                { key: 'ip', label: 'Pod IP', type: 'text', placeholder: '10.0.1.5' },
              ],
            },
          ],
        },
        {
          key: 'hpa',
          label: 'HPA (Autoscaling)',
          type: 'array',
          fields: [
            { key: 'target', label: 'Target App', type: 'text', placeholder: 'user-api' },
            { key: 'minReplicas', label: 'Min Replicas', type: 'number', defaultValue: 2 },
            { key: 'maxReplicas', label: 'Max Replicas', type: 'number', defaultValue: 10 },
            { key: 'cpuThreshold', label: 'CPU Threshold %', type: 'number', defaultValue: 70 },
          ],
        },
      ],
    },
  ],
}

// ── Elasticsearch ──

export const elasticsearchDefinition: NodeTypeDefinition = {
  type: 'elasticsearch',
  label: 'Elasticsearch',
  color: '#00bfb3',
  icon: '🔍',
  category: 'components',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { version: '8.x', shards: 3, replicas: 1 },
  configFields: [
    { key: 'version', label: 'Version', type: 'text', defaultValue: '8.x' },
    { key: 'shards', label: 'Shards', type: 'number', defaultValue: 3 },
    { key: 'replicas', label: 'Replicas', type: 'number', defaultValue: 1 },
  ],
}

// ── Prometheus ──

export const prometheusDefinition: NodeTypeDefinition = {
  type: 'prometheus',
  label: 'Prometheus',
  color: '#e6522c',
  icon: '📊',
  category: 'components',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { retentionDays: 15, scrapeInterval: '15s' },
  configFields: [
    { key: 'retentionDays', label: 'Retention (days)', type: 'number', defaultValue: 15 },
    { key: 'scrapeInterval', label: 'Scrape Interval', type: 'text', defaultValue: '15s' },
  ],
}

// ── Grafana ──

export const grafanaDefinition: NodeTypeDefinition = {
  type: 'grafana',
  label: 'Grafana',
  color: '#f46800',
  icon: '📈',
  category: 'components',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { dashboards: ['default'] },
  configFields: [
    { key: 'dashboards', label: 'Dashboards', type: 'array', fields: [{ key: 'name', label: 'Name', type: 'text' }] },
  ],
}

// ── Kibana ──

export const kibanaDefinition: NodeTypeDefinition = {
  type: 'kibana',
  label: 'Kibana',
  color: '#005571',
  icon: '📉',
  category: 'components',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { version: '8.x' },
  configFields: [
    { key: 'version', label: 'Version', type: 'text', defaultValue: '8.x' },
  ],
}

// ── S3 ──

export const s3Definition: NodeTypeDefinition = {
  type: 's3',
  label: 'S3',
  color: '#ff9900',
  icon: '🗃️',
  category: 'components',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { bucketName: '', storageClass: 'STANDARD' },
  configFields: [
    { key: 'bucketName', label: 'Bucket Name', type: 'text' },
    { key: 'storageClass', label: 'Storage Class', type: 'select', options: [{ label: 'Standard', value: 'STANDARD' }, { label: 'Glacier', value: 'GLACIER' }, { label: 'Deep Archive', value: 'DEEP_ARCHIVE' }] },
  ],
}

// ── GCS ──

export const gcsDefinition: NodeTypeDefinition = {
  type: 'gcs',
  label: 'GCS',
  color: '#4285f4',
  icon: '☁️',
  category: 'components',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { bucketName: '', storageClass: 'STANDARD' },
  configFields: [
    { key: 'bucketName', label: 'Bucket Name', type: 'text' },
    { key: 'storageClass', label: 'Storage Class', type: 'select', options: [{ label: 'Standard', value: 'STANDARD' }, { label: 'Nearline', value: 'NEARLINE' }, { label: 'Coldline', value: 'COLDLINE' }] },
  ],
}

// ── RabbitMQ ──

export const rabbitMqDefinition: NodeTypeDefinition = {
  type: 'rabbitmq',
  label: 'RabbitMQ',
  color: '#ff6600',
  icon: '🐇',
  category: 'messaging-queues',
  ports: [{ id: 'in', label: 'In', type: 'input' }, { id: 'out', label: 'Out', type: 'output' }],
  defaultConfig: { version: '3.13', vhosts: ['/'] },
  configFields: [
    { key: 'version', label: 'Version', type: 'text', defaultValue: '3.13' },
    { key: 'vhosts', label: 'Virtual Hosts', type: 'array', fields: [{ key: 'name', label: 'Name', type: 'text' }] },
  ],
}
