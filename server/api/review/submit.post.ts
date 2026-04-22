/**
 * POST /api/review/submit
 *
 * Moves an entity from 'draft' to 'pending-review'.
 * Only domain-experts (and curators) can submit; entity must have pending changes.
 *
 * Body: { entityId: string, userId: string }
 */
import { entityStore, userStore, appendAudit, nextAuditId } from '../../utils/store'
import type { SubmitReviewBody } from '../../../types/index'

export default defineEventHandler(async (event) => {
  const body = (await readBody<SubmitReviewBody>(event)) ?? {}
  const { entityId, userId } = body

  if (!entityId) throw createError({ statusCode: 400, message: 'entityId is required.' })
  if (!userId) throw createError({ statusCode: 400, message: 'userId is required.' })

  const entity = entityStore.get(entityId)
  if (!entity) throw createError({ statusCode: 404, message: `Entity '${entityId}' not found.` })

  const user = userStore.find((u) => u.id === userId)
  if (!user) throw createError({ statusCode: 403, message: 'Unknown userId.' })

  if (entity.status === 'locked') {
    throw createError({ statusCode: 409, message: 'Record is locked and cannot be submitted.' })
  }

  if (entity.status === 'pending-review') {
    throw createError({ statusCode: 409, message: 'Record is already pending review.' })
  }

  if (!entity.pendingChanges || Object.keys(entity.pendingChanges).length === 0) {
    throw createError({
      statusCode: 422,
      message: 'No pending changes to submit. Make and save some edits first.'
    })
  }

  entity.status = 'pending-review'

  appendAudit({
    id: nextAuditId(),
    entityId,
    action: 'submitted',
    userId: user.id,
    userName: user.name,
    timestamp: new Date().toISOString(),
    before: { status: 'draft' },
    after: { status: 'pending-review' },
    note: null
  })

  return { data: entity, message: 'Record submitted for review.' }
})
