/**
 * GET /api/entities
 * Returns all entities, optionally filtered by query params:
 *   ?type=Material&status=approved&role=domain-expert&q=polyprop
 */
import { entityStore } from '../utils/store'
import type { Entity, EntityType, EntityStatus, UserRole } from '../../types/index'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  let results: Entity[] = Array.from(entityStore.values())

  if (query.type) {
    results = results.filter((e) => e.type === (query.type as EntityType))
  }
  if (query.status) {
    results = results.filter((e) => e.status === (query.status as EntityStatus))
  }
  if (query.role) {
    results = results.filter((e) => e.ownerRole === (query.role as UserRole))
  }
  if (query.q) {
    const term = String(query.q).toLowerCase()
    results = results.filter(
      (e) =>
        e.label.toLowerCase().includes(term) || e.id.toLowerCase().includes(term)
    )
  }

  // Sort: pending-review first, then draft, then approved, then others
  const order: EntityStatus[] = ['pending-review', 'draft', 'rejected', 'approved', 'locked']
  results.sort((a, b) => {
    const ai = order.indexOf(a.status)
    const bi = order.indexOf(b.status)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return { data: results }
})
