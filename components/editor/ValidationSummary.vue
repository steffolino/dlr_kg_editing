<script setup lang="ts">
/**
 * ValidationSummary.vue
 *
 * Shows a consolidated list of all current validation errors at the top
 * of the form.  Each item links to the relevant field so users can jump
 * straight to it.
 *
 * Nielsen H9 – Help users recognise, diagnose, and recover from errors:
 *   - All errors collected in one visible place
 *   - Each error links to the offending field
 *   - Actionable suggestions included
 * Nielsen H5 – Error prevention: the summary appears only after a failed
 *   submit attempt, not on page load.
 */
import type { ValidationError } from '~/types/index'

const props = defineProps<{
  errors: Record<string, ValidationError>
}>()

const errorList = computed(() => Object.values(props.errors))
const hasErrors = computed(() => errorList.value.length > 0)

function scrollToField(fieldKey: string): void {
  const el = document.getElementById(`field-${fieldKey}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus()
  }
}
</script>

<template>
  <div
    v-if="hasErrors"
    role="alert"
    aria-live="assertive"
    class="rounded-lg border border-red-300 bg-red-50 p-4"
  >
    <div class="flex items-start gap-3">
      <svg class="mt-0.5 h-5 w-5 shrink-0 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
      </svg>
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-red-800">
          {{ errorList.length }} issue{{ errorList.length > 1 ? 's' : '' }} need{{ errorList.length === 1 ? 's' : '' }} your attention
        </h3>
        <ul class="mt-2 list-none space-y-1">
          <li
            v-for="error in errorList"
            :key="error.field"
            class="text-sm text-red-700"
          >
            <button
              type="button"
              class="underline decoration-dotted hover:decoration-solid focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
              @click="scrollToField(error.field)"
            >
              {{ error.fieldLabel }}
            </button>
            : {{ error.message }}
            <span v-if="error.suggestion" class="ml-1 text-red-600 italic">{{ error.suggestion }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
