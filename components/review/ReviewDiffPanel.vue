<script setup lang="ts">
/**
 * ReviewDiffPanel.vue
 *
 * Side-by-side comparison of the current approved field values versus the
 * proposed (pending) changes, with approve / reject actions.
 *
 * Nielsen H1 – Visibility of system status: shows which fields changed.
 * Nielsen H5 – Error prevention: reject requires a reason; approve button
 *              shows confirmation tooltip.
 * Nielsen H9 – Error recovery: reject reason is surfaced back to submitter.
 */
import type { Entity, Shape, AuditEntry } from '~/types/index'

const props = defineProps<{
  entity: Entity
  shape: Shape
  audit: AuditEntry[]
}>()

const emit = defineEmits<{
  approved: [entity: Entity]
  rejected: [entity: Entity]
}>()

const { currentUser } = useAuth()
const { canReview } = usePermissions()

// ── Diff computation ──────────────────────────────────────────────────────────

interface DiffRow {
  key: string
  label: string
  oldValue: string
  newValue: string
  changed: boolean
}

const diffRows = computed<DiffRow[]>(() => {
  if (!props.entity.pendingChanges) return []
  return props.shape.fields.map((f) => {
    const oldVal = formatValue(props.entity.fields[f.key] ?? null)
    const newVal = formatValue((props.entity.pendingChanges ?? {})[f.key] ?? props.entity.fields[f.key] ?? null)
    return {
      key: f.key,
      label: f.label,
      oldValue: oldVal,
      newValue: newVal,
      changed:
        JSON.stringify(props.entity.fields[f.key]) !==
        JSON.stringify((props.entity.pendingChanges ?? {})[f.key])
    }
  })
})

const changedCount = computed(() => diffRows.value.filter((r) => r.changed).length)

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

// ── Decision form ──────────────────────────────────────────────────────────────
const decisionState = ref<'idle' | 'processing' | 'done' | 'error'>('idle')
const rejectReason = ref('')
const rejectReasonError = ref('')
const showRejectForm = ref(false)
const serverError = ref<string | null>(null)

function openRejectForm(): void {
  showRejectForm.value = true
  rejectReason.value = ''
  rejectReasonError.value = ''
}

async function approve(): Promise<void> {
  if (!currentUser.value || !canReview.value) return
  decisionState.value = 'processing'
  serverError.value = null

  try {
    const result = await $fetch<{ data: Entity }>('/api/review/decision', {
      method: 'POST',
      body: {
        entityId: props.entity.id,
        decision: 'approve',
        reason: '',
        userId: currentUser.value.id
      }
    })
    decisionState.value = 'done'
    emit('approved', result.data)
  } catch (err: unknown) {
    decisionState.value = 'error'
    serverError.value = extractMsg(err)
  }
}

async function reject(): Promise<void> {
  if (!currentUser.value || !canReview.value) return

  // Reason is required on rejection (Nielsen H5 – prevent un-actionable feedback)
  if (!rejectReason.value.trim()) {
    rejectReasonError.value = 'A reason is required so the submitter knows what to fix.'
    return
  }
  rejectReasonError.value = ''

  decisionState.value = 'processing'
  serverError.value = null

  try {
    const result = await $fetch<{ data: Entity }>('/api/review/decision', {
      method: 'POST',
      body: {
        entityId: props.entity.id,
        decision: 'reject',
        reason: rejectReason.value.trim(),
        userId: currentUser.value.id
      }
    })
    decisionState.value = 'done'
    showRejectForm.value = false
    emit('rejected', result.data)
  } catch (err: unknown) {
    decisionState.value = 'error'
    serverError.value = extractMsg(err)
  }
}

function extractMsg(err: unknown): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const d = (err as { data: unknown }).data
    if (d && typeof d === 'object' && 'message' in d) return String((d as { message: unknown }).message)
  }
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'Unexpected error. Please try again.'
}

// ── Audit timeline ────────────────────────────────────────────────────────────
const showAudit = ref(false)
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Review changes</h2>
        <p class="text-sm text-slate-500">
          <strong>{{ entity.label }}</strong> ·
          {{ changedCount }} field{{ changedCount !== 1 ? 's' : '' }} changed
        </p>
      </div>
      <StatusBadge :status="entity.status" />
    </div>

    <!-- Not a reviewer -->
    <div
      v-if="!canReview"
      class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600"
      role="alert"
    >
      You are acting as <strong>{{ currentUser?.role }}</strong>.
      Only Curators and Ontology Engineers can approve or reject changes.
    </div>

    <!-- Server error -->
    <div
      v-if="serverError"
      class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
      role="alert"
    >
      {{ serverError }}
    </div>

    <!-- Diff table -->
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 w-1/4">Field</th>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 w-[37.5%]">Current (approved)</th>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 w-[37.5%]">Proposed change</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="row in diffRows"
            :key="row.key"
            :class="row.changed ? 'bg-amber-50' : 'bg-white'"
          >
            <td class="px-4 py-3 font-medium text-slate-700">
              {{ row.label }}
              <span v-if="row.changed" class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="changed" title="Field changed" />
            </td>
            <td class="px-4 py-3 text-slate-600">{{ row.oldValue }}</td>
            <td
              class="px-4 py-3"
              :class="row.changed ? 'font-semibold text-amber-900' : 'text-slate-600'"
            >
              {{ row.newValue }}
            </td>
          </tr>
          <tr v-if="diffRows.length === 0">
            <td colspan="3" class="px-4 py-8 text-center text-slate-400 italic">No pending changes found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Approve / reject controls -->
    <div
      v-if="canReview && entity.status === 'pending-review' && decisionState !== 'done'"
      class="space-y-4"
    >
      <div class="flex flex-wrap gap-3">
        <!-- Approve -->
        <button
          type="button"
          :disabled="decisionState === 'processing'"
          class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          @click="approve"
        >
          <span v-if="decisionState === 'processing'">Processing…</span>
          <span v-else>✓ Approve changes</span>
        </button>

        <!-- Reject -->
        <button
          v-if="!showRejectForm"
          type="button"
          :disabled="decisionState === 'processing'"
          class="rounded-md border border-red-400 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          @click="openRejectForm"
        >
          ✕ Reject…
        </button>
      </div>

      <!-- Reject form (Nielsen H5: require reason before rejecting) -->
      <div
        v-if="showRejectForm"
        class="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3"
      >
        <label for="reject-reason" class="block text-sm font-medium text-red-800">
          Rejection reason <span class="text-red-600" aria-label="required">*</span>
        </label>
        <p class="text-xs text-red-600">
          This reason will be shown to the submitter so they know what to fix.
        </p>
        <textarea
          id="reject-reason"
          v-model="rejectReason"
          rows="3"
          class="block w-full rounded-md border-red-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
          placeholder="Explain what needs to be corrected…"
          :aria-invalid="!!rejectReasonError"
          aria-describedby="reject-reason-error"
        />
        <p
          v-if="rejectReasonError"
          id="reject-reason-error"
          class="text-xs text-red-700"
          role="alert"
        >
          {{ rejectReasonError }}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="decisionState === 'processing'"
            class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            @click="reject"
          >
            <span v-if="decisionState === 'processing'">Rejecting…</span>
            <span v-else>Confirm rejection</span>
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="showRejectForm = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Decision complete -->
    <div
      v-if="decisionState === 'done'"
      class="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
      role="status"
    >
      Decision recorded. The record has been updated.
    </div>

    <!-- ── Audit trail (Nielsen H8: details on demand) ─── -->
    <div class="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        class="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
        :aria-expanded="showAudit"
        @click="showAudit = !showAudit"
      >
        <span>Audit trail ({{ audit.length }} entries)</span>
        <svg
          :class="['h-4 w-4 text-slate-400 transition-transform', showAudit ? 'rotate-180' : '']"
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>
      </button>
      <ol
        v-if="showAudit"
        class="border-t border-slate-100 divide-y divide-slate-100"
        aria-label="Audit trail"
      >
        <li
          v-for="entry in audit"
          :key="entry.id"
          class="px-5 py-3 text-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="font-medium text-slate-700">{{ entry.userName }}</span>
            <time class="text-xs text-slate-400 shrink-0" :datetime="entry.timestamp">
              {{ new Date(entry.timestamp).toLocaleString() }}
            </time>
          </div>
          <p class="text-slate-500 capitalize">{{ entry.action }}</p>
          <p v-if="entry.note" class="mt-0.5 text-slate-600 italic">{{ entry.note }}</p>
        </li>
        <li v-if="audit.length === 0" class="px-5 py-4 text-sm text-slate-400 italic">
          No audit entries for this record.
        </li>
      </ol>
    </div>

  </div>
</template>
