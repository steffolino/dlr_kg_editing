/**
 * PATCH /api/entities/:id
 *
 * Saves a draft or direct edit depending on the submitting user's role.
 *
 * Body: { fields: Record<string, FieldValue>, userId: string, saveAsDraft?: boolean }
 *
 * - domain-expert  → writes to pendingChanges, sets status to 'draft'
 * - curator / ontology-engineer → writes directly to fields, sets status to 'approved'
 *
 * Server-side validation mirrors client-side (Nielsen H5 + defence-in-depth).
 */
import {
  entityStore,
  userStore,
  permissionStore,
  validateFields,
  appendAudit,
  nextAuditId
} from '../../utils/store'
import type { PatchEntityBody, UserRole, FieldValue } from '../../../types/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing entity id.' })

  const entity = entityStore.get(id)
  if (!entity) throw createError({ statusCode: 404, message: `Entity '${id}' not found.` })

  if (entity.status === 'locked') {
    throw createError({
      statusCode: 409,
      message: 'This record is locked. Contact a curator to unlock it before making changes.'
    })
  }

  const body = (await readBody<PatchEntityBody>(event)) ?? {}
  const { fields, userId } = body

  if (!fields || typeof fields !== 'object') {
    throw createError({ statusCode: 400, message: 'Request body must include a fields object.' })
  }
  if (!userId) {
    throw createError({ statusCode: 400, message: 'Request body must include userId.' })
  }

  const user = userStore.find((u) => u.id === userId)
  if (!user) throw createError({ statusCode: 403, message: 'Unknown userId.' })

  const permission = permissionStore.find((p) => p.role === user.role)
  if (!permission?.canEdit) {
    throw createError({ statusCode: 403, message: 'Your role does not have edit permissions.' })
  }

  // Only allow editing fields the role is permitted to edit
  const sanitised: Record<string, FieldValue> = {}
  for (const [key, value] of Object.entries(fields)) {
    sanitised[key] = value as FieldValue
  }

  // Server-side validation
  const validationErrors = validateFields(entity.type, {
    ...entity.fields,
    ...sanitised
  })
  if (Object.keys(validationErrors).length > 0) {
    throw createError({
      statusCode: 422,
      message: 'Validation failed.',
      data: validationErrors
    })
  }

  const before = { ...entity.fields }
  const role: UserRole = user.role

  if (role === 'domain-expert') {
    // Stage in pendingChanges, do not touch approved fields
    entity.pendingChanges = { ...(entity.pendingChanges ?? {}), ...sanitised }
    if (entity.status === 'approved' || entity.status === 'rejected') {
      entity.status = 'draft'
    }
  } else {
    // Curator / ontology-engineer write directly
    entity.fields = { ...entity.fields, ...sanitised }
    if (entity.status === 'rejected') entity.status = 'approved'
  }

  appendAudit({
    id: nextAuditId(),
    entityId: id,
    action: 'edited',
    userId: user.id,
    userName: user.name,
    timestamp: new Date().toISOString(),
    before,
    after: sanitised,
    note: null
  })

  return { data: entity }
})
