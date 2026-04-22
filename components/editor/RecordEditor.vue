<script setup lang="ts">
/**
 * RecordEditor.vue
 *
 * The main editing form.  Drives FieldRenderer for each field in the shape,
 * groups fields visually, and orchestrates save-draft / submit-for-review.
 *
 * Nielsen H1  – Visibility of system status: save/submit state clearly shown.
 * Nielsen H3  – User control and freedom: cancel discards changes; reset field.
 * Nielsen H5  – Error prevention: validates on blur + all fields on submit.
 * Nielsen H7  – Flexibility and efficiency: keyboard-accessible, logical tab order.
 * Nielsen H8  – Aesthetic and minimalist: advanced provenance/audit in expandable panel.
 * Nielsen H9  – Error recovery: ValidationSummary + first-field focus on submit.
 */
import type { Entity, Shape, FieldShape, FieldValue, ValidationError } from '~/types/index'

const props = defineProps<{
  entity: Entity
  shape: Shape
}>()

const emit = defineEmits<{
  saved: [entity: Entity]
  submitted: [entity: Entity]
}>()

// ── Auth + permissions ───────────────────────────────────────────────────────
const { currentUser } = useAuth()
const { canEditField } = usePermissions()

// ── Validation ───────────────────────────────────────────────────────────────
const { errors, validateField, validateAll, clearErrors } = useValidation()
const showSummary = ref(false)

// ── Local draft values ───────────────────────────────────────────────────────
// Initialise from pendingChanges if present, otherwise from fields
function initialValues(): Record<string, FieldValue> {
  const base = { ...props.entity.fields }
  const pending = props.entity.pendingChanges ?? {}
  return { ...base, ...pending }
}

const draftValues = ref<Record<string, FieldValue>>(initialValues())
const isDirty = ref(false)

// Persist draft to localStorage so edits survive a page refresh
const storageKey = computed(() => `kg-draft-${props.entity.id}`)

onMounted(() => {
  const saved = localStorage.getItem(storageKey.value)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Record<string, FieldValue>
      draftValues.value = parsed
      isDirty.value = true
    } catch {
      // ignore corrupt storage
    }
  }
})

function persistDraft(): void {
  localStorage.setItem(storageKey.value, JSON.stringify(draftValues.value))
}

function clearDraft(): void {
  localStorage.removeItem(storageKey.value)
}

// ── Field update handler ──────────────────────────────────────────────────────
function onFieldUpdate(key: string, value: FieldValue): void {
  draftValues.value = { ...draftValues.value, [key]: value }
  isDirty.value = true
  persistDraft()
}

function onFieldBlur(shape: FieldShape): void {
  const perm = canEditField(shape)
  if (!perm.editable) return
  validateField(shape, draftValues.value[shape.key] ?? null)
}

// ── Reset a single field ──────────────────────────────────────────────────────
function resetField(key: string): void {
  const original = props.entity.fields[key] ?? null
  draftValues.value = { ...draftValues.value, [key]: original }
  persistDraft()
}

// ── Cancel all edits ──────────────────────────────────────────────────────────
function cancelEdits(): void {
  draftValues.value = initialValues()
  isDirty.value = false
  clearErrors()
  showSummary.value = false
  clearDraft()
}

// ── Field groups ──────────────────────────────────────────────────────────────
const fieldGroups = computed(() => {
  const groups: Map<string, FieldShape[]> = new Map()
  for (const field of props.shape.fields) {
    if (!groups.has(field.group)) groups.set(field.group, [])
    groups.get(field.group)!.push(field)
  }
  return groups
})

// ── Status helpers ────────────────────────────────────────────────────────────
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const submitState = ref<'idle' | 'submitting' | 'submitted' | 'error'>('idle')
const serverError = ref<string | null>(null)

// ── Save draft ────────────────────────────────────────────────────────────────
async function saveDraft(): Promise<void> {
  if (!currentUser.value) return
  showSummary.value = false

  // Only validate editable fields
  const editableShapes = props.shape.fields.filter(
    (f) => canEditField(f).editable
  )
  const valid = validateAll(editableShapes, draftValues.value)
  if (!valid) {
    showSummary.value = true
    // Focus first invalid field (Nielsen H9)
    const firstKey = Object.keys(errors.value)[0]
    if (firstKey) {
      const el = document.getElementById(`field-${firstKey}`)
      el?.focus()
    }
    return
  }

  saveState.value = 'saving'
  serverError.value = null

  // Only send fields this role can edit
  const editableKeys = editableShapes.map((f) => f.key)
  const fieldsToSend: Record<string, FieldValue> = {}
  for (const key of editableKeys) {
    fieldsToSend[key] = draftValues.value[key] ?? null
  }

  try {
    const result = await $fetch<{ data: Entity }>(`/api/entities/${props.entity.id}`, {
      method: 'PATCH',
      body: { fields: fieldsToSend, userId: currentUser.value.id }
    })
    emit('saved', result.data)
    saveState.value = 'saved'
    isDirty.value = false
    clearDraft()
    setTimeout(() => { saveState.value = 'idle' }, 3000)
  } catch (err: unknown) {
    saveState.value = 'error'
    serverError.value = extractErrorMessage(err)
  }
}

// ── Submit for review ─────────────────────────────────────────────────────────
async function submitForReview(): Promise<void> {
  if (!currentUser.value) return
  // Save draft first so pending changes are persisted server-side
  await saveDraft()
  if (saveState.value === 'error') return

  submitState.value = 'submitting'
  serverError.value = null

  try {
    const result = await $fetch<{ data: Entity }>('/api/review/submit', {
      method: 'POST',
      body: { entityId: props.entity.id, userId: currentUser.value.id }
    })
    emit('submitted', result.data)
    submitState.value = 'submitted'
  } catch (err: unknown) {
    submitState.value = 'error'
    serverError.value = extractErrorMessage(err)
  }
}

// ── Pending-changes diff: which fields were changed? ──────────────────────────
const changedFields = computed(() => {
  if (!props.entity.pendingChanges) return []
  return Object.keys(props.entity.pendingChanges).filter(
    (k) =>
      JSON.stringify(props.entity.pendingChanges![k]) !==
      JSON.stringify(props.entity.fields[k])
  )
})

// ── Show/hide advanced provenance panel (Nielsen H8) ──────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data: unknown }).data
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message: unknown }).message)
    }
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'An unexpected error occurred. Please try again.'
}
</script>

<template>
  <div class="space-y-6">

    <!-- Rejection notice (Nielsen H9: recognise and recover from errors) -->
    <div
      v-if="entity.status === 'rejected' && entity.reviewNotes"
      class="rounded-lg border border-red-300 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-sm font-semibold text-red-800">This record was rejected by a curator:</p>
      <p class="mt-1 text-sm text-red-700">{{ entity.reviewNotes }}</p>
      <p class="mt-1 text-xs text-red-600">Address the issues below and re-submit for review.</p>
    </div>

    <!-- Pending-changes notice -->
    <div
      v-if="changedFields.length > 0 && entity.status === 'pending-review'"
      class="rounded-lg border border-amber-300 bg-amber-50 p-4"
    >
      <p class="text-sm font-semibold text-amber-800">This record has changes awaiting curator review.</p>
      <p class="mt-1 text-xs text-amber-700">
        {{ changedFields.length }} field{{ changedFields.length > 1 ? 's' : '' }} changed:
        {{ changedFields.join(', ') }}
      </p>
    </div>

    <!-- Locked notice -->
    <div
      v-if="entity.status === 'locked'"
      class="rounded-lg border border-slate-300 bg-slate-100 p-4"
      role="alert"
    >
      <p class="text-sm font-semibold text-slate-700">🔒 This record is locked.</p>
      <p class="text-sm text-slate-600">Editing is disabled. Contact a Curator to unlock it.</p>
    </div>

    <!-- Validation summary (appears only after a failed submit attempt) -->
    <ValidationSummary :errors="errors" />

    <!-- Server error -->
    <div
      v-if="serverError"
      class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
      role="alert"
    >
      <strong>Save failed:</strong> {{ serverError }}
      <button
        type="button"
        class="ml-2 underline text-red-700 hover:text-red-900"
        @click="serverError = null"
      >
        Dismiss
      </button>
    </div>

    <!-- Field groups -->
    <section
      v-for="[groupName, fields] in fieldGroups"
      :key="groupName"
      aria-labelledby="`group-${groupName}`"
      class="rounded-lg border border-slate-200 bg-white"
    >
      <div class="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h3
          :id="`group-${groupName}`"
          class="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {{ groupName }}
        </h3>
      </div>
      <div class="divide-y divide-slate-100">
        <div
          v-for="fieldShape in fields"
          :key="fieldShape.key"
          class="px-5 py-4"
        >
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <FieldRenderer
                :shape="fieldShape"
                :model-value="draftValues[fieldShape.key] ?? null"
                :error="errors[fieldShape.key] ?? null"
                :readonly="entity.status === 'locked' || !canEditField(fieldShape).editable"
                :locked-reason="canEditField(fieldShape).reason"
                @update:model-value="onFieldUpdate(fieldShape.key, $event)"
                @blur="onFieldBlur(fieldShape)"
              />
            </div>

            <!-- Reset individual field (Nielsen H3: user control) -->
            <div class="shrink-0 pt-6">
              <button
                v-if="canEditField(fieldShape).editable && entity.status !== 'locked'"
                type="button"
                class="rounded p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                :title="`Reset '${fieldShape.label}' to saved value`"
                :aria-label="`Reset ${fieldShape.label} to saved value`"
                @click="resetField(fieldShape.key)"
              >
                ↺
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Action bar ─────────────────────────────────────────────────────── -->
    <div
      v-if="entity.status !== 'locked'"
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4"
    >
      <!-- Save status indicator (Nielsen H1) -->
      <div class="flex items-center gap-2 text-sm">
        <template v-if="saveState === 'saving'">
          <svg class="h-4 w-4 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span class="text-slate-600">Saving…</span>
        </template>
        <template v-else-if="saveState === 'saved'">
          <svg class="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
          </svg>
          <span class="text-emerald-700 font-medium">Saved</span>
        </template>
        <template v-else-if="isDirty">
          <span class="text-amber-600">Unsaved changes</span>
        </template>
        <template v-else>
          <span class="text-slate-400">No changes</span>
        </template>
      </div>

      <div class="flex items-center gap-2">
        <!-- Cancel (Nielsen H3) -->
        <button
          v-if="isDirty"
          type="button"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          @click="cancelEdits"
        >
          Discard changes
        </button>

        <!-- Save draft -->
        <button
          type="button"
          :disabled="saveState === 'saving'"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          @click="saveDraft"
        >
          Save draft
        </button>

        <!-- Submit for review – only for domain-experts (Nielsen H5: disabled if no changes) -->
        <button
          v-if="currentUser?.role === 'domain-expert'"
          type="button"
          :disabled="submitState === 'submitting' || entity.status === 'pending-review'"
          class="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
          @click="submitForReview"
        >
          <span v-if="submitState === 'submitting'">Submitting…</span>
          <span v-else-if="entity.status === 'pending-review'">Already in review</span>
          <span v-else>Submit for review</span>
        </button>
      </div>
    </div>

    <!-- Submit success -->
    <div
      v-if="submitState === 'submitted'"
      class="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
      role="status"
    >
      Record submitted for curator review. You will be notified once a decision is made.
    </div>

  </div>
</template>
