/**
 * GET /api/entities/:id
 * Returns a single entity plus its audit history.
 */
import { entityStore, auditForEntity } from '../../utils/store'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing entity id.' })
  }

  const entity = entityStore.get(id)
  if (!entity) {
    throw createError({ statusCode: 404, message: `Entity '${id}' not found.` })
  }

  return {
    data: entity,
    audit: auditForEntity(id)
  }
})
