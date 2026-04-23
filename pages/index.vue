<script setup lang="ts">
/**
 * pages/index.vue – Dashboard
 *
 * Nielsen H1 – Visibility of system status: summary cards for all statuses.
 * Nielsen H2 – Match between system and real world: plain language, no RDF jargon.
 * Nielsen H6 – Recognition rather than recall: current role always shown; tasks listed.
 * Nielsen H7 – Flexibility and efficiency: quick-action links throughout.
 * Nielsen H10 – Help and documentation: inline glossary panel.
 */
import type { Entity, User } from '~/types/index'

useHead({ title: 'Dashboard' })

const { currentUser, setUser } = useAuth()

// Auto-select first user if none chosen yet
const { data: usersData } = await useFetch<{ data: User[] }>('/api/users')
const users = computed(() => usersData.value?.data ?? [])

if (!currentUser.value && users.value.length > 0) {
  setUser(users.value[0]!)
}

const { data: entitiesData, refresh } = await useFetch<{ data: Entity[] }>('/api/entities')
const entities = computed(() => entitiesData.value?.data ?? [])

// Summary counts
const counts = computed(() => ({
  total: entities.value.length,
  pendingReview: entities.value.filter((e) => e.status === 'pending-review').length,
  draft: entities.value.filter((e) => e.status === 'draft').length,
  approved: entities.value.filter((e) => e.status === 'approved').length,
  rejected: entities.value.filter((e) => e.status === 'rejected').length
}))

// Open tasks for the current user's role
const openTasks = computed(() => {
  const role = currentUser.value?.role
  if (!role) return []
  if (role === 'domain-expert') {
    return entities.value.filter((e) => e.status === 'draft' || e.status === 'rejected')
  }
  if (role === 'curator' || role === 'ontology-engineer') {
    return entities.value.filter((e) => e.status === 'pending-review')
  }
  return []
})

// Glossary toggle (Nielsen H10)
const showGlossary = ref(false)

const glossary: Array<{ term: string; definition: string }> = [
  { term: 'Entity', definition: 'A node in the knowledge graph, e.g. a Material, Component, or Recycling Process.' },
  { term: 'Provenance', definition: 'Information about where data came from and who is responsible for it.' },
  { term: 'Review', definition: 'A process in which a Curator checks proposed changes before they become official.' },
  { term: 'Constraint / Shape', definition: 'A rule that defines what values a field may contain and who can edit it.' },
  { term: 'Pending changes', definition: 'Edits staged by a Domain Expert that are waiting for curator approval.' },
  { term: 'Draft', definition: 'A record with unsaved or unreviewed changes that has not yet been submitted.' },
  { term: 'Confidence', definition: 'A curator assessment of how reliable this data is (low / medium / high / verified).' }
]

const roleDescriptions: Record<string, string> = {
  'domain-expert': 'You can edit permitted fields and submit changes for review.',
  'curator': 'You can review pending changes, approve or reject them, and lock records.',
  'ontology-engineer': 'You have full access including shape/config management.'
}

const uxHelperContext = 'This dashboard helps users orient themselves quickly, see current workload, and jump to their next high-value task by role.'
const uxHelperHeuristics = [
  { id: 'H1', label: 'Visibility of system status', reason: 'Summary cards and open task counts keep system state visible at a glance.' },
  { id: 'H6', label: 'Recognition rather than recall', reason: 'Role, tasks, and status labels are always visible so users do not need to remember context.' },
  { id: 'H7', label: 'Flexibility and efficiency', reason: 'Quick links and persona shortcuts reduce navigation effort for frequent actions.' }
]
</script>

<template>
  <div class="space-y-8">

    <!-- Page header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p v-if="currentUser" class="mt-1 text-sm text-slate-500">
          Signed in as <strong>{{ currentUser.name }}</strong> ·
          <span class="capitalize">{{ currentUser.role.replace('-', ' ') }}</span>
          · {{ roleDescriptions[currentUser.role] }}
        </p>
        <p v-else class="mt-1 text-sm text-amber-600">
          Select a persona from the header to get started.
        </p>
      </div>

      <!-- Role switcher shortcut (Nielsen H7) -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="u in users"
          :key="u.id"
          type="button"
          :class="[
            'rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors',
            currentUser?.id === u.id
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
          ]"
          @click="setUser(u)"
        >
          {{ u.initials }} · {{ u.role }}
        </button>
      </div>
    </div>

    <UxHelper
      title="Dashboard context"
      :page-context="uxHelperContext"
      :heuristics="uxHelperHeuristics"
    />

    <GraphOverviewCard
      :entities="entities"
      :focal-id="openTasks[0]?.id ?? entities[0]?.id ?? null"
      title="Graph visual"
      variant="sunset"
      :prefer-connected-focal="true"
    />

    <!-- Summary cards (Nielsen H1) -->
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" class="sr-only">Record summary</h2>
      <dl class="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div class="rounded-lg border border-slate-200 bg-white px-4 py-4 text-center">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Total</dt>
          <dd class="mt-1 text-3xl font-bold text-slate-900">{{ counts.total }}</dd>
        </div>
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <dt class="text-xs font-medium uppercase tracking-wide text-amber-700">Pending review</dt>
          <dd class="mt-1 text-3xl font-bold text-amber-800">{{ counts.pendingReview }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-center">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Draft</dt>
          <dd class="mt-1 text-3xl font-bold text-slate-700">{{ counts.draft }}</dd>
        </div>
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
          <dt class="text-xs font-medium uppercase tracking-wide text-emerald-700">Approved</dt>
          <dd class="mt-1 text-3xl font-bold text-emerald-800">{{ counts.approved }}</dd>
        </div>
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center">
          <dt class="text-xs font-medium uppercase tracking-wide text-red-600">Rejected</dt>
          <dd class="mt-1 text-3xl font-bold text-red-700">{{ counts.rejected }}</dd>
        </div>
      </dl>
    </section>

    <!-- Open tasks for current role -->
    <section aria-labelledby="tasks-heading">
      <div class="mb-3 flex items-center justify-between">
        <h2 id="tasks-heading" class="text-base font-semibold text-slate-900">
          Your open tasks
          <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {{ openTasks.length }}
          </span>
        </h2>
        <NuxtLink to="/review" class="text-sm text-brand-600 hover:underline">
          View review queue →
        </NuxtLink>
      </div>

      <div v-if="openTasks.length === 0" class="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
        No open tasks for your current role. 🎉
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="entity in openTasks"
          :key="entity.id"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-3"
        >
          <div class="min-w-0">
            <NuxtLink
              :to="`/entities/${entity.id}`"
              class="text-sm font-medium text-brand-700 hover:underline"
            >
              {{ entity.label }}
            </NuxtLink>
            <p class="mt-0.5 text-xs text-slate-500">{{ entity.type }} · {{ entity.id }}</p>
            <p v-if="entity.reviewNotes" class="mt-0.5 text-xs text-red-600 truncate max-w-xs">
              ⚠ {{ entity.reviewNotes }}
            </p>
          </div>
          <StatusBadge :status="entity.status" />
        </li>
      </ul>
    </section>

    <!-- All records quick list -->
    <section aria-labelledby="all-records-heading">
      <div class="mb-3 flex items-center justify-between">
        <h2 id="all-records-heading" class="text-base font-semibold text-slate-900">All records</h2>
        <NuxtLink to="/entities" class="text-sm text-brand-600 hover:underline">
          Browse & filter →
        </NuxtLink>
      </div>
      <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600">Label</th>
              <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
              <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Last reviewed</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="entity in entities"
              :key="entity.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-slate-800">{{ entity.label }}</td>
              <td class="px-4 py-3 text-slate-500">{{ entity.type }}</td>
              <td class="px-4 py-3"><StatusBadge :status="entity.status" /></td>
              <td class="px-4 py-3 text-slate-400 hidden sm:table-cell">{{ entity.lastReviewedAt ?? '—' }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="entity.status === 'pending-review' ? `/review?entity=${entity.id}` : `/entities/${entity.id}`"
                  class="text-xs font-medium text-brand-600 hover:underline"
                >
                  {{ entity.status === 'pending-review' ? 'Review' : 'Edit' }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Glossary (Nielsen H10) -->
    <section aria-labelledby="glossary-heading">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        :aria-expanded="showGlossary"
        @click="showGlossary = !showGlossary"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <span id="glossary-heading">Terminology glossary</span>
        <svg :class="['h-3 w-3 transition-transform', showGlossary ? 'rotate-180' : '']" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>
      </button>
      <dl
        v-if="showGlossary"
        class="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2"
      >
        <div v-for="item in glossary" :key="item.term">
          <dt class="text-xs font-semibold text-slate-700">{{ item.term }}</dt>
          <dd class="text-xs text-slate-500">{{ item.definition }}</dd>
        </div>
      </dl>
    </section>

  </div>
</template>
