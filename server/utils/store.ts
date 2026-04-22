/**
 * server/utils/store.ts
 *
 * In-memory store initialised once from the data/ JSON files.
 * In a real app this would be a database; for this PoC, module-level Maps
 * survive across requests within a single Nitro process.
 */
import type {
  Entity,
  AuditEntry,
  Shape,
  User,
  Permission,
  FieldValue
} from '../../types/index'

// ── Raw JSON imports ─────────────────────────────────────────────────────────
import entitiesRaw from '../../data/entities.json'
import auditRaw from '../../data/audit-log.json'
import shapesRaw from '../../data/shapes.json'
import usersRaw from '../../data/users.json'
import permissionsRaw from '../../data/permissions.json'

// ── Typed stores ─────────────────────────────────────────────────────────────

export const entityStore = new Map<string, Entity>(
  (entitiesRaw as Entity[]).map((e) => [e.id, structuredClone(e)])
)

export const auditStore: AuditEntry[] = structuredClone(auditRaw) as AuditEntry[]

export const shapeStore: Shape[] = structuredClone(shapesRaw) as Shape[]

export const userStore: User[] = structuredClone(usersRaw) as User[]

export const permissionStore: Permission[] = structuredClone(permissionsRaw) as Permission[]

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Appends an audit entry to the in-memory log. */
export function appendAudit(entry: AuditEntry): void {
  auditStore.push(entry)
}

/** Returns all audit entries for a given entity, newest-first. */
export function auditForEntity(entityId: string): AuditEntry[] {
  return auditStore
    .filter((e) => e.entityId === entityId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

/** Generate a simple sequential audit id. */
export function nextAuditId(): string {
  return `AUD-${String(auditStore.length + 1).padStart(3, '0')}`
}

/** Returns the shape for a given entity type, or undefined. */
export function shapeFor(entityType: string): Shape | undefined {
  return shapeStore.find((s) => s.entityType === entityType)
}

/**
 * Server-side field validation mirror of the client-side composable.
 * Returns error messages keyed by field name.
 */
export function validateFields(
  entityType: string,
  fields: Record<string, FieldValue>
): Record<string, string> {
  const shape = shapeFor(entityType)
  if (!shape) return {}

  const errors: Record<string, string> = {}

  for (const fs of shape.fields) {
    const value = fields[fs.key]

    if (fs.required) {
      const missing =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      if (missing) {
        errors[fs.key] = `${fs.label} is required.`
        continue
      }
    }

    if (value === null || value === undefined || value === '') continue

    if (fs.datatype === 'number') {
      const num = Number(value)
      if (isNaN(num)) {
        errors[fs.key] = `${fs.label} must be a number.`
      } else if (fs.min !== undefined && num < fs.min) {
        errors[fs.key] = `${fs.label} must be at least ${fs.min}.`
      } else if (fs.max !== undefined && num > fs.max) {
        errors[fs.key] = `${fs.label} must be at most ${fs.max}.`
      }
    }

    if (
      (fs.datatype === 'select') &&
      fs.allowedValues &&
      typeof value === 'string' &&
      !fs.allowedValues.includes(value)
    ) {
      errors[fs.key] = `${fs.label} has an invalid value. Allowed: ${fs.allowedValues.join(', ')}.`
    }

    if (fs.datatype === 'multiselect' && Array.isArray(value) && fs.allowedValues) {
      const invalid = value.filter((v) => !fs.allowedValues!.includes(v))
      if (invalid.length > 0) {
        errors[fs.key] = `${fs.label} contains invalid values: ${invalid.join(', ')}.`
      }
    }
  }

  return errors
}
