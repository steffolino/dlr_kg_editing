// ─────────────────────────────────────────────────────────────────────────────
// Shared type definitions for the KG Editing PoC
// All types are exported and used across client, composables, and server routes.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'domain-expert' | 'curator' | 'ontology-engineer'

export type EntityStatus =
  | 'draft'
  | 'pending-review'
  | 'approved'
  | 'rejected'
  | 'locked'

export type EntityType =
  | 'Material'
  | 'Component'
  | 'SupplierStatement'
  | 'RecyclingProcess'
  | 'EvidenceDocument'

export type FieldDatatype =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'textarea'

/** Scalar value that can live in a field or a pending-changes map. */
export type FieldValue = string | number | boolean | string[] | null

// ─── Domain model ────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  role: UserRole
  email: string
  initials: string
}

export interface Entity {
  id: string
  type: EntityType
  label: string
  status: EntityStatus
  ownerRole: UserRole
  provenanceSource: string
  lastReviewedAt: string | null
  createdAt: string
  lockedBy: string | null
  fields: Record<string, FieldValue>
  /** Staged changes waiting for curator review. */
  pendingChanges: Record<string, FieldValue> | null
  /** Curator's last review note (rejection reason etc.). */
  reviewNotes: string | null
}

// ─── Shape / constraint model (SHACL-inspired, JSON-only) ────────────────────

export interface FieldShape {
  key: string
  label: string
  datatype: FieldDatatype
  required: boolean
  /** Roles allowed to write this field. Others see it read-only. */
  editableByRoles: UserRole[]
  allowedValues?: string[]
  min?: number
  max?: number
  /** Displayed as inline hint before an error occurs (Nielsen H5). */
  helpText?: string
  /** Visual grouping header in the editor. */
  group: string
  defaultValue?: FieldValue
}

export interface Shape {
  entityType: EntityType
  label: string
  description: string
  fields: FieldShape[]
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export interface Permission {
  role: UserRole
  label: string
  description: string
  canEdit: boolean
  canSubmitForReview: boolean
  canReview: boolean
  canLock: boolean
  canEditShapes: boolean
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export type AuditAction =
  | 'created'
  | 'edited'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'unlocked'

export interface AuditEntry {
  id: string
  entityId: string
  action: AuditAction
  userId: string
  userName: string
  timestamp: string
  before: Record<string, FieldValue> | null
  after: Record<string, FieldValue> | null
  note: string | null
}

// ─── Relations ───────────────────────────────────────────────────────────────

export interface Relation {
  id: string
  sourceId: string
  targetId: string
  relationType: string
  label: string
  confidence: number
  createdAt: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string
  fieldLabel: string
  message: string
  severity: 'error' | 'warning'
  /** Actionable hint shown alongside the error (Nielsen H9). */
  suggestion?: string
}

// ─── API request / response shapes ───────────────────────────────────────────

export interface PatchEntityBody {
  fields: Record<string, FieldValue>
  userId: string
  saveAsDraft?: boolean
}

export interface SubmitReviewBody {
  entityId: string
  userId: string
}

export interface ReviewDecisionBody {
  entityId: string
  decision: 'approve' | 'reject'
  reason: string
  userId: string
}
