/**
 * POST /api/review/decision
 *
 * Curator approves or rejects a pending-review entity.
 *
 * Body: { entityId: string, decision: 'approve' | 'reject', reason: string, userId: string }
 *
 * On approve: pendingChanges merged into fields, status → 'approved'
 * On reject:  pendingChanges cleared, status → 'rejected', reviewNotes set
 */
import {
  entityStore,
  userStore,
  permissionStore,
  appendAudit,
  nextAuditId
} from '../../utils/store'
import type { ReviewDecisionBody } from '../../../types/index'

export default defineEventHandler(async (event) => {
  const body = (await readBody<ReviewDecisionBody>(event)) ?? {}
  const { entityId, decision, reason, userId } = body

  if (!entityId) throw createError({ statusCode: 400, message: 'entityId is required.' })
  if (!userId) throw createError({ statusCode: 400, message: 'userId is required.' })
  if (decision !== 'approve' && decision !== 'reject') {
    throw createError({ statusCode: 400, message: "decision must be 'approve' or 'reject'." })
  }
  if (decision === 'reject' && !reason?.trim()) {
    throw createError({ statusCode: 422, message: 'A reason is required when rejecting.' })
  }

  const entity = entityStore.get(entityId)
  if (!entity) throw createError({ statusCode: 404, message: `Entity '${entityId}' not found.` })

  if (entity.status !== 'pending-review') {
    throw createError({
      statusCode: 409,
      message: 'Only records in pending-review status can receive a decision.'
    })
  }

  const user = userStore.find((u) => u.id === userId)
  if (!user) throw createError({ statusCode: 403, message: 'Unknown userId.' })

  const permission = permissionStore.find((p) => p.role === user.role)
  if (!permission?.canReview) {
    throw createError({ statusCode: 403, message: 'Your role cannot perform reviews.' })
  }

  if (decision === 'approve') {
    if (entity.pendingChanges) {
      entity.fields = { ...entity.fields, ...entity.pendingChanges }
    }
    entity.pendingChanges = null
    entity.reviewNotes = null
    entity.status = 'approved'
    entity.lastReviewedAt = new Date().toISOString().split('T')[0]

    appendAudit({
      id: nextAuditId(),
      entityId,
      action: 'approved',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      before: { status: 'pending-review' },
      after: { status: 'approved' },
      note: reason?.trim() || null
    })
  } else {
    entity.pendingChanges = null
    entity.reviewNotes = reason.trim()
    entity.status = 'rejected'

    appendAudit({
      id: nextAuditId(),
      entityId,
      action: 'rejected',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      before: { status: 'pending-review' },
      after: { status: 'rejected' },
      note: reason.trim()
    })
  }

  return {
    data: entity,
    message: decision === 'approve' ? 'Record approved.' : 'Record rejected.'
  }
})
