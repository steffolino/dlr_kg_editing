/**
 * POST /api/entities/:id/lock
 * Toggles lock/unlock on an entity. Only curators and ontology-engineers can do this.
 * Body: { userId: string, lock: boolean }
 */
import { entityStore, userStore, permissionStore, appendAudit, nextAuditId } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing entity id.' })

  const entity = entityStore.get(id)
  if (!entity) throw createError({ statusCode: 404, message: `Entity '${id}' not found.` })

  const body = (await readBody<{ userId: string; lock: boolean }>(event)) ?? {}
  const { userId, lock } = body

  if (!userId) throw createError({ statusCode: 400, message: 'userId is required.' })

  const user = userStore.find((u) => u.id === userId)
  if (!user) throw createError({ statusCode: 403, message: 'Unknown userId.' })

  const permission = permissionStore.find((p) => p.role === user.role)
  if (!permission?.canLock) {
    throw createError({ statusCode: 403, message: 'Your role cannot lock or unlock records.' })
  }

  const wasLocked = entity.status === 'locked'
  if (lock) {
    entity.status = 'locked'
    entity.lockedBy = user.id
  } else {
    entity.status = 'approved'
    entity.lockedBy = null
  }

  appendAudit({
    id: nextAuditId(),
    entityId: id,
    action: lock ? 'locked' : 'unlocked',
    userId: user.id,
    userName: user.name,
    timestamp: new Date().toISOString(),
    before: { status: wasLocked ? 'locked' : 'approved' },
    after: { status: entity.status },
    note: null
  })

  return { data: entity }
})
