<script setup lang="ts">
import type { Entity } from '~/types/index'
import type { FeedbackCategory, FeedbackEntry } from '~/composables/useFeedbackStore'

useHead({ title: 'Feedback inbox' })

const { loadFeedback, clearFeedback, categoryLabel } = useFeedbackStore()
const { currentUser } = useAuth()

const { data: entitiesData } = await useFetch<{ data: Entity[] }>('/api/entities')
const entities = computed(() => entitiesData.value?.data ?? [])
const entityById = computed(() => new Map(entities.value.map((entity) => [entity.id, entity])))

const feedbackEntries = ref<FeedbackEntry[]>([])
const search = ref('')
const filterCategory = ref<'' | FeedbackCategory>('')

function refreshInbox(): void {
  feedbackEntries.value = loadFeedback()
}

const filteredEntries = computed(() => {
  const term = search.value.trim().toLowerCase()
  return feedbackEntries.value.filter((entry) => {
    if (filterCategory.value && entry.category !== filterCategory.value) return false
    if (!term) return true
    return (
      entry.title.toLowerCase().includes(term) ||
      entry.message.toLowerCase().includes(term) ||
      entry.pagePath.toLowerCase().includes(term) ||
      (entry.referenceId?.toLowerCase().includes(term) ?? false)
    )
  })
})

function formatWhen(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16)
}

function linkedEntities(entry: FeedbackEntry): Entity[] {
  if (!entry.referenceId) return []
  const raw = entry.referenceId.toUpperCase()
  const matches = raw.match(/[A-Z]+-\d+/g) ?? []
  const seen = new Set<string>()
  const linked: Entity[] = []

  for (const match of matches) {
    if (seen.has(match)) continue
    seen.add(match)
    const entity = entityById.value.get(match)
    if (entity) linked.push(entity)
  }

  return linked
}

function clearInbox(): void {
  clearFeedback()
  refreshInbox()
}

onMounted(() => {
  refreshInbox()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Feedback inbox</h1>
        <p class="mt-1 text-sm text-slate-500">
          Review team feedback from the in-app widget and jump to related records quickly.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          @click="refreshInbox"
        >
          Refresh
        </button>
        <button
          type="button"
          class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
          @click="clearInbox"
        >
          Clear local inbox
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
      Inbox is local to this browser/device for demo purposes. No server email delivery is enabled.
      <span v-if="currentUser"> Signed in as {{ currentUser.name }}.</span>
    </div>

    <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
      <div class="md:col-span-2">
        <label for="feedback-search" class="block text-xs font-medium text-slate-600">Search</label>
        <input
          id="feedback-search"
          v-model="search"
          type="search"
          placeholder="title, message, page, or reference id"
          class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        >
      </div>
      <div>
        <label for="feedback-category-filter" class="block text-xs font-medium text-slate-600">Category</label>
        <select
          id="feedback-category-filter"
          v-model="filterCategory"
          class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        >
          <option value="">All categories</option>
          <option value="dataset-quality">Dataset quality</option>
          <option value="ui-ux">UI / UX</option>
          <option value="workflow">Workflow</option>
          <option value="bug">Bug</option>
          <option value="feature-request">Feature request</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>

    <div v-if="filteredEntries.length === 0" class="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
      No feedback entries match the current filters.
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="rounded-lg border border-slate-200 bg-white p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">{{ entry.title }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ categoryLabel(entry.category) }} · {{ formatWhen(entry.createdAt) }} · {{ entry.id }}
            </p>
          </div>
          <NuxtLink
            :to="entry.pagePath"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Open source page
          </NuxtLink>
        </div>

        <p class="mt-3 whitespace-pre-wrap text-sm text-slate-700">{{ entry.message }}</p>

        <div class="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
          <div>
            <p class="font-medium text-slate-700">Reference</p>
            <p>{{ entry.referenceId ?? 'none' }}</p>
          </div>
          <div>
            <p class="font-medium text-slate-700">Contact</p>
            <p>{{ entry.contact ?? 'not provided' }}</p>
          </div>
        </div>

        <div v-if="linkedEntities(entry).length > 0" class="mt-3">
          <p class="text-xs font-medium text-slate-700">Linked records</p>
          <div class="mt-1 flex flex-wrap gap-2">
            <NuxtLink
              v-for="entity in linkedEntities(entry)"
              :key="`${entry.id}-${entity.id}`"
              :to="`/entities/${entity.id}`"
              class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              {{ entity.id }} · {{ entity.label }}
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
