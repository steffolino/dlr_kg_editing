<script setup lang="ts">
/**
 * pages/entities/index.vue – Record list
 *
 * Nielsen H3 – User control and freedom: filters are clearable; filter state
 *              is shown so users know what's active.
 * Nielsen H7 – Flexibility and efficiency: filter by type, status, role;
 *              search by label/id; keyboard-friendly table.
 */
import type { Entity, EntityType, EntityStatus, UserRole } from '~/types/index'

useHead({ title: 'Records' })

const route = useRoute()
const router = useRouter()

// ── Filter state (synced to URL query for shareability) ───────────────────────
const filterType = ref<string>((route.query.type as string) ?? '')
const filterStatus = ref<string>((route.query.status as string) ?? '')
const filterRole = ref<string>((route.query.role as string) ?? '')
const searchQ = ref<string>((route.query.q as string) ?? '')

const queryParams = computed(() => {
  const p: Record<string, string> = {}
  if (filterType.value) p.type = filterType.value
  if (filterStatus.value) p.status = filterStatus.value
  if (filterRole.value) p.role = filterRole.value
  if (searchQ.value) p.q = searchQ.value
  return p
})

// Fetch entities from server (re-fetches when filter params change)
const { data, pending, refresh } = await useFetch<{ data: Entity[] }>('/api/entities', {
  query: queryParams
})
const entities = computed(() => data.value?.data ?? [])

// Update URL when filters change (without reloading)
watch(queryParams, (params) => {
  router.replace({ query: params })
})

function clearFilters(): void {
  filterType.value = ''
  filterStatus.value = ''
  filterRole.value = ''
  searchQ.value = ''
}

const hasActiveFilters = computed(
  () => filterType.value || filterStatus.value || filterRole.value || searchQ.value
)

const entityTypes: EntityType[] = ['Material', 'Component', 'SupplierStatement', 'RecyclingProcess', 'EvidenceDocument']
const statusOptions: EntityStatus[] = ['draft', 'pending-review', 'approved', 'rejected', 'locked']
const roleOptions: UserRole[] = ['domain-expert', 'curator', 'ontology-engineer']

const uxHelperContext = 'This page is the working index for records. It helps users find the right entity fast using filters and then move to edit or review actions.'
const uxHelperHeuristics = [
  { id: 'H3', label: 'User control and freedom', reason: 'Active filters are visible and removable so users can recover from narrow searches immediately.' },
  { id: 'H7', label: 'Flexibility and efficiency', reason: 'Combined filters and free-text search support both broad scanning and precise lookup.' },
  { id: 'H1', label: 'Visibility of system status', reason: 'Result counts and loading states clarify what the system is doing.' }
]
</script>

<template>
  <div class="space-y-6">

    <!-- Page header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-900">Records</h1>
      <span class="text-sm text-slate-500">{{ entities.length }} result{{ entities.length !== 1 ? 's' : '' }}</span>
    </div>

    <UxHelper
      title="Records page context"
      :page-context="uxHelperContext"
      :heuristics="uxHelperHeuristics"
    />

    <GraphOverviewCard
      :entities="entities"
      :focal-id="entities[0]?.id ?? null"
      title="Graph visual"
      variant="ocean"
    />

    <!-- Filter bar -->
    <div
      class="rounded-lg border border-slate-200 bg-white px-5 py-4"
      role="search"
      aria-label="Filter records"
    >
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Search -->
        <div>
          <label for="search-q" class="block text-xs font-medium text-slate-600 mb-1">Search</label>
          <input
            id="search-q"
            v-model="searchQ"
            type="search"
            placeholder="Label or ID…"
            class="block w-full rounded-md border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <!-- Type filter -->
        <div>
          <label for="filter-type" class="block text-xs font-medium text-slate-600 mb-1">Entity type</label>
          <select
            id="filter-type"
            v-model="filterType"
            class="block w-full rounded-md border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="">All types</option>
            <option v-for="t in entityTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <!-- Status filter -->
        <div>
          <label for="filter-status" class="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            id="filter-status"
            v-model="filterStatus"
            class="block w-full rounded-md border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="">All statuses</option>
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <!-- Role filter -->
        <div>
          <label for="filter-role" class="block text-xs font-medium text-slate-600 mb-1">Owner role</label>
          <select
            id="filter-role"
            v-model="filterRole"
            class="block w-full rounded-md border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="">All roles</option>
            <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
      </div>

      <!-- Active filter chips + clear (Nielsen H3) -->
      <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-slate-500">Active filters:</span>
        <span v-if="filterType" class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          Type: {{ filterType }}
          <button type="button" class="hover:text-brand-900 focus:outline-none" aria-label="Remove type filter" @click="filterType = ''">×</button>
        </span>
        <span v-if="filterStatus" class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          Status: {{ filterStatus }}
          <button type="button" class="hover:text-brand-900 focus:outline-none" aria-label="Remove status filter" @click="filterStatus = ''">×</button>
        </span>
        <span v-if="filterRole" class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          Role: {{ filterRole }}
          <button type="button" class="hover:text-brand-900 focus:outline-none" aria-label="Remove role filter" @click="filterRole = ''">×</button>
        </span>
        <button
          type="button"
          class="text-xs text-slate-500 underline hover:text-slate-700"
          @click="clearFilters"
        >
          Clear all
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
      <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading records…
    </div>

    <!-- Empty state -->
    <div
      v-else-if="entities.length === 0"
      class="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center"
    >
      <p class="text-slate-500">No records match your filters.</p>
      <button type="button" class="mt-2 text-sm text-brand-600 hover:underline" @click="clearFilters">
        Clear filters
      </button>
    </div>

    <!-- Entity table -->
    <div v-else class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600">Label</th>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Type</th>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Owner role</th>
            <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 hidden lg:table-cell">Last reviewed</th>
            <th scope="col" class="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="entity in entities"
            :key="entity.id"
            class="hover:bg-slate-50 transition-colors"
          >
            <td class="px-4 py-3">
              <NuxtLink
                :to="`/entities/${entity.id}`"
                class="font-medium text-brand-700 hover:underline"
              >
                {{ entity.label }}
              </NuxtLink>
              <p class="text-xs text-slate-400">{{ entity.id }}</p>
            </td>
            <td class="px-4 py-3 text-slate-500 hidden sm:table-cell">{{ entity.type }}</td>
            <td class="px-4 py-3"><StatusBadge :status="entity.status" /></td>
            <td class="px-4 py-3 text-slate-500 hidden md:table-cell capitalize">{{ entity.ownerRole.replace('-', ' ') }}</td>
            <td class="px-4 py-3 text-slate-400 hidden lg:table-cell">{{ entity.lastReviewedAt ?? '—' }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <NuxtLink
                :to="`/entities/${entity.id}`"
                class="mr-2 text-xs font-medium text-brand-600 hover:underline"
              >
                Edit
              </NuxtLink>
              <NuxtLink
                v-if="entity.status === 'pending-review'"
                :to="`/review?entity=${entity.id}`"
                class="text-xs font-medium text-amber-600 hover:underline"
              >
                Review
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
