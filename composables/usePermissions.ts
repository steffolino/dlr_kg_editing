/**
 * composables/usePermissions.ts
 *
 * Answers permission questions for the current user/role.
 * All permission logic is centralised here so components never need to
 * hard-code role checks inline.
 *
 * Nielsen H6 – Recognition rather than recall:
 *   canEditField returns a human-readable explanation of WHY a field is
 *   locked, not just a boolean, so the UI can surface it to the user.
 */
import type { UserRole, FieldShape } from '~/types/index'

export interface FieldPermission {
  editable: boolean
  /** Human-readable reason shown when a field is read-only (Nielsen H6 + H9). */
  reason: string | null
}

export const usePermissions = () => {
  const { currentUser } = useAuth()

  const role = computed<UserRole | null>(() => currentUser.value?.role ?? null)

  /** True if the user can perform reviews (Curator / Ontology-Engineer). */
  const canReview = computed(() =>
    role.value === 'curator' || role.value === 'ontology-engineer'
  )

  /** True if the user can lock / unlock records. */
  const canLock = computed(() =>
    role.value === 'curator' || role.value === 'ontology-engineer'
  )

  /** True if the user can edit shape / config metadata. */
  const canEditShapes = computed(() => role.value === 'ontology-engineer')

  /**
   * Returns whether the current role can edit a specific field, plus an
   * explanation that can be shown to the user.
   */
  const canEditField = (fieldShape: FieldShape): FieldPermission => {
    if (!role.value) {
      return {
        editable: false,
        reason: 'You are not signed in. Select a user from the role switcher.'
      }
    }

    if (fieldShape.editableByRoles.includes(role.value)) {
      return { editable: true, reason: null }
    }

    const allowedLabels = fieldShape.editableByRoles.map(roleLabel).join(' or ')
    return {
      editable: false,
      reason: `This field can only be edited by ${allowedLabels}. You are currently acting as ${roleLabel(role.value)}.`
    }
  }

  return { role, canReview, canLock, canEditShapes, canEditField }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    'domain-expert': 'Domain Expert',
    'curator': 'Curator',
    'ontology-engineer': 'Ontology Engineer'
  }
  return labels[role] ?? role
}
