<script setup lang="ts">
interface HeuristicItem {
  id: string
  label: string
  reason: string
}

const props = defineProps<{
  pageContext: string
  heuristics: HeuristicItem[]
  title?: string
}>()

const isOpen = ref(false)
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white px-4 py-3">
    <button
      type="button"
      class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span>{{ isOpen ? 'Hide' : 'Show' }} UX helper</span>
      <svg
        :class="['h-3.5 w-3.5 transition-transform', isOpen ? 'rotate-180' : '']"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>
    </button>

    <div v-if="isOpen" class="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <div>
        <p class="text-xs font-semibold text-slate-700">{{ props.title ?? 'Page context' }}</p>
        <p class="mt-1 text-xs text-slate-600">{{ pageContext }}</p>
      </div>

      <div>
        <p class="text-xs font-semibold text-slate-700">Primary heuristics</p>
        <ul class="mt-1 space-y-1.5 text-xs text-slate-600">
          <li v-for="item in heuristics" :key="item.id">
            <span class="font-semibold text-slate-700">{{ item.id }} - {{ item.label }}:</span>
            {{ item.reason }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
