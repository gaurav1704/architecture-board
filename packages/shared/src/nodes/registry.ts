import type { NodeTypeDefinition, NodeConfig } from './base.js'

const registry = new Map<string, NodeTypeDefinition>()

export function registerNodeType<T extends NodeConfig>(definition: NodeTypeDefinition<T>): void {
  if (registry.has(definition.type)) {
    throw new Error(`Node type "${definition.type}" is already registered`)
  }
  registry.set(definition.type, definition as unknown as NodeTypeDefinition)
}

export function getNodeType(type: string): NodeTypeDefinition | undefined {
  return registry.get(type)
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Array.from(registry.values())
}

export function getNodeTypesByCategory(category: string): NodeTypeDefinition[] {
  return Array.from(registry.values()).filter((d) => d.category === category)
}
