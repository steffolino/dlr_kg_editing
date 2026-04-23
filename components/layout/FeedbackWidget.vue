<script setup lang="ts">
import type { FeedbackCategory, FeedbackEntry } from '~/composables/useFeedbackStore'

const route = useRoute()
const { currentUser } = useAuth()
const { loadFeedback, addFeedback, categoryLabel } = useFeedbackStore()

const isOpen = ref(false)
const submitState = ref<'idle' | 'submitting' | 'submitted'>('idle')

const form = reactive({
  category: 'ui-ux' as FeedbackCategory,
  title: '',
  message: '',
  referenceId: '',
  contact: ''
})

const formError = ref<string | null>(null)
const recentFeedback = ref<FeedbackEntry[]>([])

function loadRecentFeedback(): void {
  recentFeedback.value = loadFeedback().slice(0, 5)
}

function resetForm(): void {
  form.category = 'ui-ux'
  form.title = ''
  form.message = ''
  form.referenceId = ''
  form.contact = ''
  formError.value = null
}

function nowIso(): string {
  return new Date().toISOString()
}

function formatWhen(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16)
}

function buildEntry(): FeedbackEntry {
  return {
    id: `FDB-${Date.now()}`,
    createdAt: nowIso(),
    pagePath: route.fullPath,
    category: form.category,
    title: form.title.trim(),
    message: form.message.trim(),
    referenceId: form.referenceId.trim() || null,
    contact: form.contact.trim() || null
  }
}

async function submitFeedback(): Promise<void> {
  formError.value = null

  if (!form.title.trim() || !form.message.trim()) {
    formError.value = 'Please add a short title and message so the team can act on your feedback.'
    return
  }

  submitState.value = 'submitting'

  const entry = buildEntry()

  try {
    const next = addFeedback(entry)
    recentFeedback.value = next.slice(0, 5)
    submitState.value = 'submitted'
    resetForm()
    setTimeout(() => {
      submitState.value = 'idle'
    }, 2000)
  } catch {
    formError.value = 'Could not save your feedback locally. Please try again.'
    submitState.value = 'idle'
  }
}

onMounted(() => {
  loadRecentFeedback()
})

watch(() => route.fullPath, () => {
  if (!isOpen.value) return
  formError.value = null
})
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50">
    <button
      type="button"
      class="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      :aria-expanded="isOpen"
      aria-controls="feedback-panel"
      @click="isOpen = !isOpen"
    >
      {{ isOpen ? 'Close feedback' : 'Feedback' }}
    </button>

    <section
      v-if="isOpen"
      id="feedback-panel"
      class="mt-3 w-[min(92vw,26rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
      aria-label="Feedback panel"
    >
      <div class="mb-3">
        <h2 class="text-sm font-semibold text-slate-900">Share feedback</h2>
        <p class="mt-1 text-xs text-slate-500">
          Tell us about dataset quality, UI, workflows, or feature ideas. This demo stores feedback locally.
        </p>
      </div>

      <form class="space-y-3" @submit.prevent="submitFeedback">
        <div>
          <label for="feedback-category" class="block text-xs font-medium text-slate-600">Type</label>
          <select
            id="feedback-category"
            v-model="form.category"
            class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="dataset-quality">Dataset quality</option>
            <option value="ui-ux">UI / UX</option>
            <option value="workflow">Workflow</option>
            <option value="bug">Bug</option>
            <option value="feature-request">Feature request</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label for="feedback-title" class="block text-xs font-medium text-slate-600">Title</label>
          <input
            id="feedback-title"
            v-model="form.title"
            type="text"
            maxlength="120"
            placeholder="Short summary"
            class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
        </div>

        <div>
          <label for="feedback-message" class="block text-xs font-medium text-slate-600">Details</label>
          <textarea
            id="feedback-message"
            v-model="form.message"
            rows="4"
            maxlength="1200"
            placeholder="What happened? What did you expect?"
            class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label for="feedback-ref" class="block text-xs font-medium text-slate-600">Reference ID</label>
            <input
              id="feedback-ref"
              v-model="form.referenceId"
              type="text"
              maxlength="60"
              placeholder="MAT-003 / REL-001"
              class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            >
          </div>
          <div>
            <label for="feedback-contact" class="block text-xs font-medium text-slate-600">Contact (optional)</label>
            <input
              id="feedback-contact"
              v-model="form.contact"
              type="text"
              maxlength="120"
              :placeholder="currentUser?.email ?? 'email@team.example'"
              class="mt-1 block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            >
          </div>
        </div>

        <p class="text-[11px] text-slate-500">Current page: <span class="font-mono">{{ route.fullPath }}</span></p>

        <div v-if="formError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {{ formError }}
        </div>

        <div class="flex items-center justify-between gap-2">
          <p v-if="submitState === 'submitted'" class="text-xs font-medium text-emerald-700">Feedback captured for the team.</p>
          <span v-else class="text-xs text-slate-400">No email integration in this demo.</span>
          <button
            type="submit"
            :disabled="submitState === 'submitting'"
            class="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <span v-if="submitState === 'submitting'">Sending...</span>
            <span v-else>Send feedback</span>
          </button>
        </div>
      </form>

      <div v-if="recentFeedback.length > 0" class="mt-4 border-t border-slate-100 pt-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent feedback</h3>
        <ul class="mt-2 space-y-2">
          <li
            v-for="entry in recentFeedback"
            :key="entry.id"
            class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <p class="text-xs font-medium text-slate-700">{{ entry.title }}</p>
            <p class="text-[11px] text-slate-500">
              {{ categoryLabel(entry.category) }} · {{ entry.pagePath }} · {{ formatWhen(entry.createdAt) }}
            </p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
