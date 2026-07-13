import { registerNodeType } from './nodes/registry.js'
import { loadBalancerDefinition } from './nodes/load-balancer.js'
import { databaseDefinition } from './nodes/database.js'
import { applicationServerDefinition } from './nodes/application-server.js'
import { cachingDefinition } from './nodes/caching.js'
import { externalSystemDefinition } from './nodes/external-system.js'
import { messagingQueueDefinition } from './nodes/messaging-queue.js'
import { vpcDefinition } from './nodes/vpc.js'
import { vpcPeeringDefinition } from './nodes/vpc-peering.js'
import {
  mysqlDefinition,
  inMemoryCacheDefinition,
  transitGatewayDefinition,
  proxyDefinition,
  reverseProxyDefinition,
  meshLbDefinition,
  kubernetesClusterDefinition,
  elasticsearchDefinition,
  prometheusDefinition,
  grafanaDefinition,
  kibanaDefinition,
  s3Definition,
  gcsDefinition,
  rabbitMqDefinition,
  rectangleDefinition,
  squareDefinition,
  circleDefinition,
  cloudDefinition,
  cassandraDefinition,
  scyllaDbDefinition,
  dynamoDbDefinition,
  mariaDbDefinition,
  msSqlDefinition,
  oracleDbDefinition,
  snowflakeDefinition,
  bigQueryDefinition,
  timescaleDbDefinition,
  influxDbDefinition,
  neo4jDefinition,
} from './nodes/new-nodes.js'
import {
  cdnDefinition,
  firewallDefinition,
  keyVaultDefinition,
  dnsResolverDefinition,
  secretManagerDefinition,
  kmsDefinition,
} from './nodes/infrastructure.js'

registerNodeType(loadBalancerDefinition)
registerNodeType(databaseDefinition)
registerNodeType(applicationServerDefinition)
registerNodeType(cachingDefinition)
registerNodeType(externalSystemDefinition)
registerNodeType(messagingQueueDefinition)
registerNodeType(vpcDefinition)
registerNodeType(vpcPeeringDefinition)
registerNodeType(mysqlDefinition)
registerNodeType(inMemoryCacheDefinition)
registerNodeType(transitGatewayDefinition)
registerNodeType(proxyDefinition)
registerNodeType(reverseProxyDefinition)
registerNodeType(meshLbDefinition)
registerNodeType(kubernetesClusterDefinition)
registerNodeType(elasticsearchDefinition)
registerNodeType(prometheusDefinition)
registerNodeType(grafanaDefinition)
registerNodeType(kibanaDefinition)
registerNodeType(s3Definition)
registerNodeType(gcsDefinition)
registerNodeType(rabbitMqDefinition)
registerNodeType(rectangleDefinition)
registerNodeType(squareDefinition)
registerNodeType(circleDefinition)
registerNodeType(cloudDefinition)
registerNodeType(cassandraDefinition)
registerNodeType(scyllaDbDefinition)
registerNodeType(dynamoDbDefinition)
registerNodeType(mariaDbDefinition)
registerNodeType(msSqlDefinition)
registerNodeType(oracleDbDefinition)
registerNodeType(snowflakeDefinition)
registerNodeType(bigQueryDefinition)
registerNodeType(timescaleDbDefinition)
registerNodeType(influxDbDefinition)
registerNodeType(neo4jDefinition)
registerNodeType(cdnDefinition)
registerNodeType(firewallDefinition)
registerNodeType(keyVaultDefinition)
registerNodeType(dnsResolverDefinition)
registerNodeType(secretManagerDefinition)
registerNodeType(kmsDefinition)

export * from './nodes/base.js'
export * from './nodes/registry.js'
export * from './nodes/load-balancer.js'
export * from './nodes/database.js'
export * from './nodes/application-server.js'
export * from './nodes/caching.js'
export * from './nodes/external-system.js'
export * from './nodes/messaging-queue.js'
export * from './nodes/vpc.js'
export * from './nodes/vpc-peering.js'
export * from './nodes/new-nodes.js'
export * from './nodes/infrastructure.js'
export * from './nodes/capacity.js'
export * from './board.js'
export * from './collaboration.js'
export * from './chat.js'
export * from './layout.js'
