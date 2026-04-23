<script setup lang="ts">
import relationsRaw from '~/data/relations.json'
import type { Entity, Relation } from '~/types/index'

type GraphVariant = 'teal' | 'sunset' | 'ocean' | 'forest' | 'slate'

const props = defineProps<{
  entities: Entity[]
  focalId?: string | null
  title?: string
  variant?: GraphVariant
  preferConnectedFocal?: boolean
}>()

const allRelations = relationsRaw as Relation[]

const connectedCandidateByDegree = computed(() => {
  const ids = new Set(props.entities.map((entity) => entity.id))
  const degree = new Map<string, number>()

  for (const entityId of ids) degree.set(entityId, 0)

  for (const rel of allRelations) {
    if (ids.has(rel.sourceId)) degree.set(rel.sourceId, (degree.get(rel.sourceId) ?? 0) + 1)
    if (ids.has(rel.targetId)) degree.set(rel.targetId, (degree.get(rel.targetId) ?? 0) + 1)
  }

  let bestId: string | null = null
  let bestDegree = 0

  for (const [entityId, value] of degree.entries()) {
    if (value > bestDegree) {
      bestDegree = value
      bestId = entityId
    }
  }

  return bestDegree > 0 ? bestId : null
})

const resolvedFocalId = computed(() => {
  const requestedId = props.focalId && props.entities.some((entity) => entity.id === props.focalId)
    ? props.focalId
    : props.entities[0]?.id ?? null

  if (!requestedId) return null

  if (props.preferConnectedFocal) {
    const fallbackId = connectedCandidateByDegree.value
    if (fallbackId) return fallbackId
  }

  return requestedId
})

const focalSelectionContext = computed(() => {
  const resolved = resolvedFocalId.value
  if (!resolved) return ''

  const requestedId = props.focalId
  const hasRequestedId = typeof requestedId === 'string' && requestedId.length > 0
  const requestedExists = hasRequestedId && props.entities.some((entity) => entity.id === requestedId)
  const connectedFallback = connectedCandidateByDegree.value

  if (props.preferConnectedFocal && connectedFallback && connectedFallback !== requestedId && connectedFallback === resolved) {
    return `Focus is ${resolved}, auto-selected as the most connected node in this page dataset.`
  }

  if (requestedExists && requestedId === resolved) {
    return `Focus is ${resolved}, provided by the current page context.`
  }

  if (hasRequestedId && !requestedExists) {
    return `Requested focus ${requestedId} is not in the loaded dataset; using ${resolved} from visible records.`
  }

  return `Focus is ${resolved}, auto-selected from the current page result set.`
})

const graphScopeContext = computed(() => {
  const total = props.entities.length
  if (total === 0) return ''
  return `Scope is limited to ${total} record${total === 1 ? '' : 's'} currently loaded on this page.`
})

const previewContextNote = computed(() => {
  if (!resolvedFocalId.value) return ''
  return `${focalSelectionContext.value} 1-hop shows direct neighbors; Connected shows the full reachable subgraph within this scope. ${graphScopeContext.value}`
})

const localEdges = computed(() => {
  const focal = resolvedFocalId.value
  if (!focal) return []
  return allRelations.filter((rel) => rel.sourceId === focal || rel.targetId === focal)
})

const localNodes = computed(() => {
  const focal = resolvedFocalId.value
  if (!focal) return []
  const ids = new Set<string>([focal])
  for (const rel of localEdges.value) {
    ids.add(rel.sourceId)
    ids.add(rel.targetId)
  }
  return props.entities.filter((entity) => ids.has(entity.id))
})

const fullEdges = computed(() => {
  const focal = resolvedFocalId.value
  if (!focal) return []

  const adjacency = new Map<string, Set<string>>()
  const allowedEntityIds = new Set(props.entities.map((entity) => entity.id))

  for (const rel of allRelations) {
    if (!allowedEntityIds.has(rel.sourceId) || !allowedEntityIds.has(rel.targetId)) continue
    if (!adjacency.has(rel.sourceId)) adjacency.set(rel.sourceId, new Set())
    if (!adjacency.has(rel.targetId)) adjacency.set(rel.targetId, new Set())
    adjacency.get(rel.sourceId)!.add(rel.targetId)
    adjacency.get(rel.targetId)!.add(rel.sourceId)
  }

  const visited = new Set<string>([focal])
  const queue: string[] = [focal]

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adjacency.get(current)
    if (!neighbors) continue

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      queue.push(neighbor)
    }
  }

  return allRelations.filter(
    (rel) => visited.has(rel.sourceId) && visited.has(rel.targetId)
  )
})

const fullNodes = computed(() => {
  if (!resolvedFocalId.value) return []
  const ids = new Set<string>()
  ids.add(resolvedFocalId.value)
  for (const rel of fullEdges.value) {
    ids.add(rel.sourceId)
    ids.add(rel.targetId)
  }
  return props.entities.filter((entity) => ids.has(entity.id))
})
</script>

<template>
  <div class="space-y-2">
    <p v-if="title" class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ title }}</p>
    <div v-if="resolvedFocalId">
      <EntityGraphPreview
        :focal-id="resolvedFocalId"
        :local-nodes="localNodes"
        :local-edges="localEdges"
        :full-nodes="fullNodes"
        :full-edges="fullEdges"
        :variant="variant ?? 'teal'"
        :context-note="previewContextNote"
      />
    </div>
    <div v-else class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
      Graph preview unavailable: no entities loaded.
    </div>
  </div>
</template>
