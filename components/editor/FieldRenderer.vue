<script setup lang="ts">
/**
 * FieldRenderer.vue
 *
 * Renders a single entity field based on its shape configuration.
 * Handles all datatypes: string, number, boolean, date, select,
 * multiselect, textarea.
 *
 * Nielsen H3 – User control and freedom: inputs are always clearable.
 * Nielsen H5 – Error prevention: constrained inputs (select, date picker)
 *              instead of free-text where possible.
 * Nielsen H6 – Recognition rather than recall: allowed values shown; locked
 *              fields show WHY they are read-only.
 * Nielsen H9 – Error recovery: inline error + actionable suggestion per field.
 */
import type { FieldShape, FieldValue, ValidationError } from '~/types/index'

const props = defineProps<{
  shape: FieldShape
  modelValue: FieldValue
  error: ValidationError | null
  readonly: boolean
  /** Human-readable reason why this field is read-only, if applicable. */
  lockedReason: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FieldValue]
  'blur': []
}>()

// ── Local value ──────────────────────────────────────────────────────────────

const localValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

// Coerce string from <input type="number"> back to a JS number
function onNumberInput(e: Event): void {
  const raw = (e.target as HTMLInputElement).value
  emit('update:modelValue', raw === '' ? null : parseFloat(raw))
}

function onBlur(): void {
  emit('blur')
}

// For multiselect: toggle a value in the array
function toggleMulti(option: string): void {
  const current = Array.isArray(localValue.value) ? [...localValue.value] : []
  const idx = current.indexOf(option)
  if (idx === -1) {
    current.push(option)
  } else {
    current.splice(idx, 1)
  }
  emit('update:modelValue', current)
  emit('blur')
}

function isChecked(option: string): boolean {
  return Array.isArray(localValue.value) && localValue.value.includes(option)
}

// ── IDs for accessibility ────────────────────────────────────────────────────
const fieldId = computed(() => `field-${props.shape.key}`)
const errorId = computed(() => `error-${props.shape.key}`)
const helpId = computed(() => `help-${props.shape.key}`)

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.shape.helpText) ids.push(helpId.value)
  if (props.error) ids.push(errorId.value)
  return ids.length ? ids.join(' ') : undefined
})

const baseInputClass =
  'block w-full rounded-md border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

const errorInputClass = 'border-red-400 focus:border-red-500 focus:ring-red-500'
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Label row -->
    <div class="flex items-center gap-2">
      <label
        :for="shape.datatype === 'multiselect' ? undefined : fieldId"
        class="text-sm font-medium text-slate-700"
      >
        {{ shape.label }}
        <span v-if="shape.required" class="ml-0.5 text-red-600" aria-label="required">*</span>
      </label>

      <!-- Lock icon + tooltip when field is read-only due to role (Nielsen H6) -->
      <span
        v-if="readonly && lockedReason"
        class="group relative inline-flex items-center"
      >
        <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
        </svg>
        <span class="sr-only">This field is locked: {{ lockedReason }}</span>
        <!-- Visible tooltip on hover/focus -->
        <span
          role="tooltip"
          class="pointer-events-none absolute left-6 top-0 z-10 hidden w-64 rounded-md bg-slate-800 px-2 py-1.5 text-xs leading-snug text-white shadow-lg group-hover:block group-focus-within:block"
        >
          {{ lockedReason }}
        </span>
      </span>
    </div>

    <!-- Help text (shown before error – Nielsen H5 error prevention) -->
    <p
      v-if="shape.helpText"
      :id="helpId"
      class="text-xs text-slate-500"
    >
      {{ shape.helpText }}
    </p>

    <!-- ── Read-only display ── -->
    <template v-if="readonly">
      <div
        class="min-h-[2rem] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
        :aria-describedby="describedBy"
      >
        <template v-if="shape.datatype === 'multiselect' && Array.isArray(modelValue)">
          <span
            v-for="v in modelValue"
            :key="v"
            class="mr-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-xs"
          >{{ v }}</span>
          <span v-if="(modelValue as string[]).length === 0" class="text-slate-400 italic">—</span>
        </template>
        <span v-else>{{ modelValue !== null && modelValue !== '' ? modelValue : '—' }}</span>
      </div>
    </template>

    <!-- ── Editable inputs ── -->
    <template v-else>

      <!-- string / textarea -->
      <textarea
        v-if="shape.datatype === 'textarea'"
        :id="fieldId"
        :value="(localValue as string) ?? ''"
        rows="3"
        :class="[baseInputClass, error ? errorInputClass : '']"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        @input="localValue = ($event.target as HTMLTextAreaElement).value"
        @blur="onBlur"
      />

      <!-- number -->
      <input
        v-else-if="shape.datatype === 'number'"
        :id="fieldId"
        type="number"
        :value="localValue as number | null"
        :min="shape.min"
        :max="shape.max"
        :class="[baseInputClass, error ? errorInputClass : '']"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        @input="onNumberInput"
        @blur="onBlur"
      />

      <!-- date -->
      <input
        v-else-if="shape.datatype === 'date'"
        :id="fieldId"
        type="date"
        :value="(localValue as string) ?? ''"
        :class="[baseInputClass, error ? errorInputClass : '']"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        @input="localValue = ($event.target as HTMLInputElement).value"
        @blur="onBlur"
      />

      <!-- boolean -->
      <div
        v-else-if="shape.datatype === 'boolean'"
        class="flex items-center gap-2"
      >
        <input
          :id="fieldId"
          type="checkbox"
          :checked="!!localValue"
          class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          :aria-describedby="describedBy"
          @change="localValue = ($event.target as HTMLInputElement).checked; onBlur()"
        />
        <span class="text-sm text-slate-600">{{ shape.label }}</span>
      </div>

      <!-- select (Nielsen H5: constrained input – no free text) -->
      <select
        v-else-if="shape.datatype === 'select'"
        :id="fieldId"
        :value="(localValue as string) ?? ''"
        :class="[baseInputClass, error ? errorInputClass : '']"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        @change="localValue = ($event.target as HTMLSelectElement).value; onBlur()"
      >
        <option value="">— Select —</option>
        <option
          v-for="opt in shape.allowedValues"
          :key="opt"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>

      <!-- multiselect as checkboxes (more accessible than <select multiple>) -->
      <fieldset
        v-else-if="shape.datatype === 'multiselect'"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        class="space-y-1"
      >
        <legend class="sr-only">{{ shape.label }}</legend>
        <label
          v-for="opt in shape.allowedValues"
          :key="opt"
          class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="isChecked(opt)"
            class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            @change="toggleMulti(opt)"
          />
          {{ opt }}
        </label>
      </fieldset>

      <!-- default: string input -->
      <input
        v-else
        :id="fieldId"
        type="text"
        :value="(localValue as string) ?? ''"
        :class="[baseInputClass, error ? errorInputClass : '']"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        @input="localValue = ($event.target as HTMLInputElement).value"
        @blur="onBlur"
      />
    </template>

    <!-- Inline error (Nielsen H9: specific + actionable) -->
    <p
      v-if="error"
      :id="errorId"
      class="flex items-start gap-1 text-xs text-red-700"
      role="alert"
    >
      <!-- Icon – NOT the only error indicator (Nielsen H5) -->
      <svg class="mt-px h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
      <span>
        <strong class="font-semibold">{{ error.message }}</strong>
        <span v-if="error.suggestion" class="ml-1 text-red-600">{{ error.suggestion }}</span>
      </span>
    </p>
  </div>
</template>
