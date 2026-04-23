<script setup lang="ts">
/**
 * pages/entities/[id].vue – Record detail editor
 *
 * Loads the entity and its shape, then renders RecordEditor.
 * Also shows an audit sidebar and lock/unlock controls for curators.
 *
 * Nielsen H1 – Visibility of system status: status badge, lock state in header.
 * Nielsen H3 – User control and freedom: breadcrumb back link, lock/unlock.
 * Nielsen H4 – Consistency: same header pattern as all detail pages.
 */
import type { Entity, Shape, AuditEntry } from '~/types/index'

const route = useRoute()
const id = route.params.id as string

useHead({ title: `Editing ${id}` })

const { currentUser } = useAuth()
const { canLock, canReview } = usePermissions()

// ── Fetch entity + shapes ─────────────────────────────────────────────────────
const { data: entityData, refresh: refreshEntity, error: entityError } = await useFetch<{
  data: Entity
  audit: AuditEntry[]
}>(`/api/entities/${id}`)

const entity = ref<Entity | null>(entityData.value?.data ?? null)
const audit = ref<AuditEntry[]>(entityData.value?.audit ?? [])

const { data: shapesData } = await useFetch<{ data: Shape[] }>('/api/shapes')
const { data: allEntitiesData } = await useFetch<{ data: Entity[] }>('/api/entities')
const allEntities = computed(() => allEntitiesData.value?.data ?? [])

const shape = computed<Shape | null>(() => {
  if (!entity.value) return null
  return shapesData.value?.data.find((s) => s.entityType === entity.value!.type) ?? null
})

// ── Lock / unlock ─────────────────────────────────────────────────────────────
const lockState = ref<'idle' | 'loading' | 'error'>('idle')
const lockError = ref<string | null>(null)

async function toggleLock(lock: boolean): Promise<void> {
  if (!currentUser.value || !entity.value) return
  lockState.value = 'loading'
  lockError.value = null

  try {
    const result = await $fetch<{ data: Entity }>(`/api/entities/${id}/lock`, {
      method: 'POST',
      body: { userId: currentUser.value.id, lock }
    })
    entity.value = result.data
    lockState.value = 'idle'
    await refreshEntity()
    audit.value = entityData.value?.audit ?? []
  } catch (err: unknown) {
    lockState.value = 'error'
    lockError.value = extractMsg(err)
  }
}

function onSaved(updated: Entity): void {
  entity.value = updated
  refreshEntity().then(() => {
    audit.value = entityData.value?.audit ?? []
  })
}

function onSubmitted(updated: Entity): void {
  entity.value = updated
  refreshEntity().then(() => {
    audit.value = entityData.value?.audit ?? []
  })
}

function extractMsg(err: unknown): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const d = (err as { data: unknown }).data
    if (d && typeof d === 'object' && 'message' in d) return String((d as { message: unknown }).message)
  }
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'Unexpected error.'
}

const uxHelperContext = 'This detail page supports safe editing of a single record, with permission-aware fields, validation feedback, status controls, and audit context.'
const uxHelperHeuristics = [
  { id: 'H1', label: 'Visibility of system status', reason: 'Status chips, lock states, save feedback, and audit entries keep progress explicit.' },
  { id: 'H3', label: 'User control and freedom', reason: 'Breadcrumbs, field resets, and discard actions make it easy to undo or change direction.' },
  { id: 'H9', label: 'Help users recover from errors', reason: 'Validation and server-error messaging are designed to guide correction quickly.' }
]
</script>

<template>
  <div class="space-y-6">

    <!-- Breadcrumb (Nielsen H3: always a way back) -->
    <nav aria-label="Breadcrumb">
      <ol class="flex items-center gap-1 text-sm text-slate-500">
        <li><NuxtLink to="/" class="hover:text-slate-700">Dashboard</NuxtLink></li>
        <li aria-hidden="true">›</li>
        <li><NuxtLink to="/entities" class="hover:text-slate-700">Records</NuxtLink></li>
        <li aria-hidden="true">›</li>
        <li class="text-slate-700 font-medium">{{ entity?.id ?? id }}</li>
      </ol>
    </nav>

    <UxHelper
      title="Record detail context"
      :page-context="uxHelperContext"
      :heuristics="uxHelperHeuristics"
    />

    <!-- Not found -->
    <div v-if="entityError" class="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800" role="alert">
      Record not found.
      <NuxtLink to="/entities" class="ml-2 underline">Back to records</NuxtLink>
    </div>

    <template v-else-if="entity && shape">

      <!-- Two-column grid on xl, single column below -->
      <div class="xl:grid xl:grid-cols-3 xl:items-start xl:gap-8">

        <!-- ── Left: editor (spans 2 of 3 columns) ───────────────────────── -->
        <div class="xl:col-span-2 space-y-4">
          <div>
            <h1 class="text-xl font-bold text-slate-900">{{ entity.label }}</h1>
            <p class="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{{ entity.type }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ entity.id }}</span>
            </p>
          </div>

          <RecordEditor
            :entity="entity"
            :shape="shape"
            @saved="onSaved"
            @submitted="onSubmitted"
          />
        </div>

        <!-- ── Right: metadata sidebar ────────────────────────────────────── -->
        <aside class="mt-6 xl:mt-0 space-y-4">

          <!-- Status card -->
          <div class="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</h2>
            <StatusBadge :status="entity.status" />

            <!-- Lock error -->
            <div v-if="lockError" class="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
              {{ lockError }}
            </div>

            <!-- Lock / unlock (Curator only) -->
            <div v-if="canLock" class="pt-1">
              <button
                v-if="entity.status !== 'locked'"
                type="button"
                class="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                :disabled="lockState === 'loading'"
                @click="toggleLock(true)"
              >
                🔒 Lock record
              </button>
              <button
                v-else
                type="button"
                class="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                :disabled="lockState === 'loading'"
                @click="toggleLock(false)"
              >
                🔓 Unlock record
              </button>
            </div>
          </div>

          <GraphOverviewCard
            :entities="allEntities"
            :focal-id="entity.id"
            title="Record graph view"
            variant="teal"
          />

          <!-- Curator review link if pending-review -->
          <div
            v-if="entity.status === 'pending-review' && canReview"
            class="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4"
          >
            <p class="text-sm text-amber-800">
              Awaiting review.
            </p>
            <NuxtLink
              :to="`/review?entity=${entity.id}`"
              class="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 underline hover:text-amber-900"
            >
              Open review panel →
            </NuxtLink>
          </div>

          <!-- Record metadata -->
          <div class="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-2 text-sm">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Record info</h2>
            <dl class="space-y-1.5">
              <div class="flex justify-between gap-2">
                <dt class="text-slate-500">ID</dt>
                <dd class="font-mono text-xs text-slate-700">{{ entity.id }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-slate-500">Type</dt>
                <dd class="text-slate-700">{{ entity.type }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-slate-500">Owner role</dt>
                <dd class="text-slate-700 capitalize">{{ entity.ownerRole }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-slate-500">Created</dt>
                <dd class="text-slate-700">{{ entity.createdAt }}</dd>
              </div>
              <div v-if="entity.lastReviewedAt" class="flex justify-between gap-2">
                <dt class="text-slate-500">Last reviewed</dt>
                <dd class="text-slate-700">{{ entity.lastReviewedAt }}</dd>
              </div>
              <div v-if="entity.provenanceSource" class="pt-1">
                <dt class="text-slate-500">Provenance</dt>
                <dd class="mt-0.5 text-xs text-slate-600 break-words">{{ entity.provenanceSource }}</dd>
              </div>
            </dl>
          </div>

          <!-- Audit trail -->
          <div v-if="audit.length > 0" class="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Audit trail</h2>
            <ol class="space-y-3">
              <li
                v-for="entry in audit"
                :key="entry.id"
                class="flex gap-3 text-xs"
              >
                <span class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-300 ring-2 ring-white" aria-hidden="true" />
                <div class="min-w-0">
                  <p class="font-medium text-slate-700 capitalize">{{ entry.action }}</p>
                  <p class="text-slate-500">{{ entry.userName }}</p>
                  <p class="text-slate-400">{{ entry.timestamp.replace('T', ' ').slice(0, 16) }}</p>
                  <p v-if="entry.note" class="mt-0.5 text-slate-500 italic">{{ entry.note }}</p>
                </div>
              </li>
            </ol>
          </div>

        </aside>
      </div>

    </template>

    <!-- Loading skeleton -->
    <template v-else>
      <div class="xl:grid xl:grid-cols-3 xl:gap-8">
        <div class="xl:col-span-2 space-y-4 animate-pulse">
          <div class="h-8 w-1/3 rounded bg-slate-200" />
          <div class="h-48 rounded-lg bg-slate-100" />
          <div class="h-48 rounded-lg bg-slate-100" />
        </div>
        <div class="mt-6 xl:mt-0 space-y-4 animate-pulse">
          <div class="h-24 rounded-lg bg-slate-100" />
          <div class="h-32 rounded-lg bg-slate-100" />
        </div>
      </div>
    </template>

  </div>
</template>
