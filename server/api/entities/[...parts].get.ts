/**
 * GET /api/entities/:id/graph
 * Catch-all route to support nested path under dynamic entity ids.
 */
import { entityStore, relationStore, relationsForEntity } from '../../utils/store'
import type { Entity, Relation } from '../../../types/index'

export default defineEventHandler((event) => {
  const raw = getRouterParam(event, 'parts')
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split('/').filter(Boolean)

  if (parts.length !== 2 || parts[1] !== 'graph') {
    throw createError({ statusCode: 404, message: 'Page not found.' })
  }

  const id = parts[0]!
  const focal = entityStore.get(id)
  if (!focal) {
    throw createError({ statusCode: 404, message: `Entity '${id}' not found.` })
  }

  const localRelations = relationsForEntity(id)
  const neighborIds = new Set<string>()

  for (const rel of localRelations) {
    if (rel.sourceId !== id) neighborIds.add(rel.sourceId)
    if (rel.targetId !== id) neighborIds.add(rel.targetId)
  }

  const localNodes = [
    focal,
    ...Array.from(neighborIds)
      .map((neighborId) => entityStore.get(neighborId))
      .filter((entity): entity is Entity => Boolean(entity))
  ]

  return {
    data: {
      focalId: id,
      local: {
        nodes: localNodes,
        edges: localRelations
      },
      full: {
        nodes: Array.from(entityStore.values()),
        edges: relationStore as Relation[]
      }
    }
  }
})
