<script setup lang="ts">
/**
 * pages/review/index.vue – Review queue
 *
 * Lists all pending-review entities; clicking one opens ReviewDiffPanel.
 *
 * Nielsen H1 – Visibility of system status: queue size always visible.
 * Nielsen H2 – Match between system and real world: "Review queue" not "approval workflow".
 * Nielsen H6 – Recognition rather than recall: changed fields highlighted,
 *              submitter and submission date visible.
 */
import type { Entity, Shape, AuditEntry } from '~/types/index'

useHead({ title: 'Review queue' })

const route = useRoute()
const { canReview } = usePermissions()
const { currentUser } = useAuth()

// Load all pending-review entities
const { data, refresh } = await useFetch<{ data: Entity[] }>('/api/entities', {
  query: { status: 'pending-review' }
})
const queue = computed(() => data.value?.data ?? [])

// Active entity from URL param or first in queue
const activeId = ref<string | null>((route.query.entity as string) ?? null)

const activeEntity = ref<Entity | null>(null)
const activeAudit = ref<AuditEntry[]>([])

const { data: shapesData } = await useFetch<{ data: Shape[] }>('/api/shapes')

const activeShape = computed<Shape | null>(() => {
  if (!activeEntity.value) return null
  return shapesData.value?.data.find((s) => s.entityType === activeEntity.value!.type) ?? null
})

async function selectEntity(entity: Entity): Promise<void> {
  activeId.value = entity.id
  const result = await $fetch<{ data: Entity; audit: AuditEntry[] }>(`/api/entities/${entity.id}`)
  activeEntity.value = result.data
  activeAudit.value = result.audit
}

// Auto-select from URL param on mount
onMounted(async () => {
  if (activeId.value) {
    const found = queue.value.find((e) => e.id === activeId.value)
    if (found) await selectEntity(found)
  } else if (queue.value.length > 0) {
    await selectEntity(queue.value[0]!)
  }
})

function onDecision(updated: Entity): void {
  activeEntity.value = updated
  // Remove from queue and move to next
  refresh().then(async () => {
    if (queue.value.length > 0) {
      await selectEntity(queue.value[0]!)
    } else {
      activeEntity.value = null
    }
  })
}
</script>

<template>
  <div class="space-y-6">

    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Review queue</h1>
      <p class="mt-1 text-sm text-slate-500">
        {{ queue.length }} record{{ queue.length !== 1 ? 's' : '' }} awaiting curator review.
      </p>
    </div>

    <!-- Role warning -->
    <div
      v-if="!canReview"
      class="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
      role="alert"
    >
      You are acting as <strong>{{ currentUser?.role }}</strong>.
      Only Curators and Ontology Engineers can approve or reject changes.
      You can still view the diffs below.
    </div>

    <!-- Empty queue -->
    <div
      v-if="queue.length === 0"
      class="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center"
    >
      <p class="text-slate-500 text-sm">The review queue is empty. All records are up to date.</p>
      <NuxtLink to="/entities" class="mt-2 inline-block text-sm text-brand-600 hover:underline">
        Browse all records →
      </NuxtLink>
    </div>

    <!-- Split-pane: queue list + diff panel -->
    <div v-else class="flex gap-6 min-h-[28rem] flex-col lg:flex-row">

      <!-- Queue list (left) -->
      <aside class="w-full shrink-0 lg:w-72" aria-label="Pending review queue">
        <ul class="space-y-2">
          <li
            v-for="entity in queue"
            :key="entity.id"
          >
            <button
              type="button"
              :class="[
                'w-full rounded-lg border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500',
                activeId === entity.id
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              ]"
              :aria-current="activeId === entity.id ? 'true' : undefined"
              @click="selectEntity(entity)"
            >
              <p class="text-sm font-medium text-slate-800 truncate">{{ entity.label }}</p>
              <p class="mt-0.5 text-xs text-slate-500">{{ entity.type }} · {{ entity.id }}</p>
              <p class="mt-1">
                <StatusBadge :status="entity.status" />
              </p>
            </button>
          </li>
        </ul>
      </aside>

      <!-- Diff panel (right) -->
      <main class="flex-1 min-w-0">
        <div
          v-if="!activeEntity || !activeShape"
          class="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-400"
        >
          Select a record from the list to review it.
        </div>
        <ReviewDiffPanel
          v-else
          :entity="activeEntity"
          :shape="activeShape"
          :audit="activeAudit"
          @approved="onDecision"
          @rejected="onDecision"
        />
      </main>

    </div>

  </div>
</template>
