<script setup lang="ts">
/**
 * StatusBadge.vue – reusable entity-status badge.
 * Nielsen H4: consistent color + label mapping across all screens.
 */
import type { EntityStatus } from '~/types/index'

const props = defineProps<{ status: EntityStatus }>()

const config: Record<EntityStatus, { label: string; classes: string }> = {
  'draft': {
    label: 'Draft',
    classes: 'bg-slate-100 text-slate-700 ring-slate-200'
  },
  'pending-review': {
    label: 'Pending review',
    classes: 'bg-amber-100 text-amber-800 ring-amber-200'
  },
  'approved': {
    label: 'Approved',
    classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  },
  'rejected': {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-700 ring-red-200'
  },
  'locked': {
    label: 'Locked',
    classes: 'bg-slate-200 text-slate-600 ring-slate-300'
  }
}

const cfg = computed(() => config[props.status])
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
      cfg.classes
    ]"
  >
    <!-- Screen-reader-friendly prefix (never rely on color alone) -->
    <span class="sr-only">Status:</span>
    {{ cfg.label }}
  </span>
</template>
