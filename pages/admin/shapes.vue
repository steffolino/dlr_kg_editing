<script setup lang="ts">
/**
 * pages/admin/shapes.vue – Shape / constraint inspector
 *
 * Allows Ontology Engineers (and anyone curious) to inspect the simplified
 * SHACL-inspired constraint definitions that drive the editor.
 *
 * Nielsen H6 – Recognition rather than recall: all constraints, roles, and
 *              allowed values are visible without needing to read code.
 * Nielsen H8 – Aesthetic and minimalist design: each entity type collapsed
 *              by default; details expandable on demand.
 * Nielsen H10 – Help and documentation: explains what each constraint means.
 */
import type { Shape, Entity } from '~/types/index'

useHead({ title: 'Shape inspector' })

const { canEditShapes } = usePermissions()
const { data } = await useFetch<{ data: Shape[] }>('/api/shapes')
const shapes = computed(() => data.value?.data ?? [])
const { data: entitiesData } = await useFetch<{ data: Entity[] }>('/api/entities')
const entities = computed(() => entitiesData.value?.data ?? [])

const openTypes = ref<Set<string>>(new Set(['Material']))

function toggleType(entityType: string): void {
  if (openTypes.value.has(entityType)) {
    openTypes.value.delete(entityType)
  } else {
    openTypes.value.add(entityType)
  }
  // Trigger reactivity
  openTypes.value = new Set(openTypes.value)
}

function isOpen(entityType: string): boolean {
  return openTypes.value.has(entityType)
}

function roleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    'domain-expert': 'bg-sky-100 text-sky-800',
    'curator': 'bg-amber-100 text-amber-800',
    'ontology-engineer': 'bg-violet-100 text-violet-800'
  }
  return map[role] ?? 'bg-slate-100 text-slate-700'
}

function datatypeLabel(datatype: string): string {
  const map: Record<string, string> = {
    string: 'Text',
    number: 'Number',
    boolean: 'Yes / No',
    date: 'Date',
    select: 'Single choice',
    multiselect: 'Multiple choice',
    textarea: 'Long text'
  }
  return map[datatype] ?? datatype
}

const uxHelperContext = 'This inspector explains the shape constraints that drive field behavior, validation, and role-based editability across records.'
const uxHelperHeuristics = [
  { id: 'H6', label: 'Recognition rather than recall', reason: 'Constraint details are visible in one place, reducing the need to infer rules from code.' },
  { id: 'H8', label: 'Aesthetic and minimalist design', reason: 'Collapsed-by-default sections reduce noise while keeping deep detail available on demand.' },
  { id: 'H10', label: 'Help and documentation', reason: 'Terminology and constraints are explained directly on the page for non-technical users.' }
]
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Shape inspector</h1>
      <p class="mt-1 text-sm text-slate-500">
        Simplified constraint definitions (inspired by SHACL) that govern which fields
        exist, what values they accept, and which roles may edit them.
      </p>
    </div>

    <UxHelper
      title="Shape inspector context"
      :page-context="uxHelperContext"
      :heuristics="uxHelperHeuristics"
    />

    <GraphOverviewCard
      :entities="entities"
      :focal-id="entities[0]?.id ?? null"
      title="Graph visual"
      variant="slate"
    />

    <!-- Role notice -->
    <div
      v-if="!canEditShapes"
      class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600"
    >
      You are in <strong>read-only</strong> mode. Only Ontology Engineers can modify shapes.
    </div>

    <!-- Shape list -->
    <div class="space-y-4">
      <div
        v-for="shape in shapes"
        :key="shape.entityType"
        class="rounded-lg border border-slate-200 bg-white overflow-hidden"
      >
        <!-- Type header / toggle -->
        <button
          type="button"
          class="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
          :aria-expanded="isOpen(shape.entityType)"
          @click="toggleType(shape.entityType)"
        >
          <div>
            <h2 class="text-base font-semibold text-slate-900">{{ shape.label }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ shape.description }}</p>
          </div>
          <div class="flex items-center gap-3 ml-4 shrink-0">
            <span class="text-xs text-slate-400">{{ shape.fields.length }} fields</span>
            <svg
              :class="['h-4 w-4 text-slate-400 transition-transform', isOpen(shape.entityType) ? 'rotate-180' : '']"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
            >
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>

        <!-- Field table -->
        <div v-if="isOpen(shape.entityType)" class="border-t border-slate-100">
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-2.5 text-left font-semibold text-slate-600">Field</th>
                  <th scope="col" class="px-4 py-2.5 text-left font-semibold text-slate-600">Type</th>
                  <th scope="col" class="px-4 py-2.5 text-left font-semibold text-slate-600">Required</th>
                  <th scope="col" class="px-4 py-2.5 text-left font-semibold text-slate-600">Editable by</th>
                  <th scope="col" class="px-4 py-2.5 text-left font-semibold text-slate-600">Constraints</th>
                  <th scope="col" class="px-4 py-2.5 text-left font-semibold text-slate-600">Help text</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="field in shape.fields"
                  :key="field.key"
                  class="hover:bg-slate-50"
                >
                  <!-- Field name -->
                  <td class="px-4 py-3">
                    <span class="font-medium text-slate-800">{{ field.label }}</span>
                    <p class="mt-0.5 font-mono text-slate-400">{{ field.key }}</p>
                  </td>

                  <!-- Datatype -->
                  <td class="px-4 py-3 text-slate-600">{{ datatypeLabel(field.datatype) }}</td>

                  <!-- Required -->
                  <td class="px-4 py-3">
                    <span
                      :class="field.required ? 'text-red-700 font-semibold' : 'text-slate-400'"
                    >
                      {{ field.required ? 'Yes' : 'No' }}
                    </span>
                  </td>

                  <!-- Roles -->
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="role in field.editableByRoles"
                        :key="role"
                        :class="['inline-block rounded-full px-2 py-0.5 text-xs font-medium', roleBadgeClass(role)]"
                      >
                        {{ role }}
                      </span>
                    </div>
                  </td>

                  <!-- Constraints -->
                  <td class="px-4 py-3">
                    <ul class="space-y-0.5">
                      <li v-if="field.min !== undefined" class="text-slate-600">
                        Min: {{ field.min }}
                      </li>
                      <li v-if="field.max !== undefined" class="text-slate-600">
                        Max: {{ field.max }}
                      </li>
                      <li v-if="field.allowedValues" class="text-slate-600">
                        <span class="font-medium">Allowed:</span>
                        <div class="flex flex-wrap gap-0.5 mt-0.5">
                          <span
                            v-for="v in field.allowedValues"
                            :key="v"
                            class="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-700"
                          >{{ v }}</span>
                        </div>
                      </li>
                      <li v-if="!field.min && field.min !== 0 && !field.max && !field.allowedValues" class="text-slate-400 italic">
                        None
                      </li>
                    </ul>
                  </td>

                  <!-- Help text -->
                  <td class="px-4 py-3 text-slate-500 max-w-xs">{{ field.helpText ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
