<script setup lang="ts">
/**
 * AppHeader.vue
 *
 * Nielsen H1  – Visibility of system status: shows current role badge always.
 * Nielsen H2  – Match between system and real world: role names in plain language.
 * Nielsen H4  – Consistency: nav items always in the same order and style.
 * Nielsen H6  – Recognition rather than recall: role + user name are persistent.
 */
import type { User } from '~/types/index'

const { currentUser, setUser } = useAuth()

const { data: usersData } = await useFetch<{ data: User[] }>('/api/users')
const users = computed(() => usersData.value?.data ?? [])

const mobileOpen = ref(false)

const roleBadgeClass = computed(() => {
  const map: Record<string, string> = {
    'domain-expert': 'bg-sky-100 text-sky-800',
    'curator': 'bg-amber-100 text-amber-800',
    'ontology-engineer': 'bg-violet-100 text-violet-800'
  }
  return map[currentUser.value?.role ?? ''] ?? 'bg-slate-100 text-slate-700'
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    'domain-expert': 'Domain Expert',
    'curator': 'Curator',
    'ontology-engineer': 'Ontology Engineer'
  }
  return map[currentUser.value?.role ?? ''] ?? 'No role'
})

function selectUser(user: User): void {
  setUser(user)
  mobileOpen.value = false
}

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/entities', label: 'Records' },
  { to: '/review', label: 'Review queue' },
  { to: '/admin/shapes', label: 'Shape inspector' }
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
    <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <!-- Brand -->
      <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
        <span class="text-lg font-bold text-brand-600 tracking-tight">KG&nbsp;Editor</span>
        <span class="hidden sm:inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">PoC</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav
        aria-label="Main navigation"
        class="hidden md:flex items-center gap-1 ml-4"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          active-class="bg-brand-50 text-brand-700"
          :exact="link.to === '/'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Role switcher (Nielsen H6: role always visible) -->
      <div class="relative flex items-center gap-2">
        <label
          for="role-switcher"
          class="hidden sm:block text-xs text-slate-500 whitespace-nowrap"
        >
          Active persona:
        </label>
        <div class="flex items-center gap-2">
          <!-- Role badge (Nielsen H1) -->
          <span
            v-if="currentUser"
            :class="['hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', roleBadgeClass]"
            aria-label="Current role"
          >
            {{ roleLabel }}
          </span>

          <select
            id="role-switcher"
            class="rounded border border-slate-300 bg-white py-1 pl-2 pr-8 text-sm text-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            aria-label="Switch active user / role"
            :value="currentUser?.id ?? ''"
            @change="selectUser(users.find(u => u.id === ($event.target as HTMLSelectElement).value)!)"
          >
            <option value="" disabled>Select persona…</option>
            <option
              v-for="u in users"
              :key="u.id"
              :value="u.id"
            >
              {{ u.name }} ({{ u.role }})
            </option>
          </select>
        </div>
      </div>

      <!-- User avatar -->
      <div
        v-if="currentUser"
        class="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white select-none"
        :title="currentUser.name"
        aria-hidden="true"
      >
        {{ currentUser.initials }}
      </div>

      <!-- Mobile menu button -->
      <button
        class="md:hidden rounded p-1.5 text-slate-600 hover:bg-slate-100"
        :aria-expanded="mobileOpen"
        aria-controls="mobile-nav"
        aria-label="Toggle navigation menu"
        @click="mobileOpen = !mobileOpen"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Mobile nav -->
    <nav
      v-if="mobileOpen"
      id="mobile-nav"
      aria-label="Mobile navigation"
      class="md:hidden border-t border-slate-200 bg-white px-4 pb-3 pt-2"
    >
      <NuxtLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        active-class="text-brand-600"
        :exact="link.to === '/'"
        @click="mobileOpen = false"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </header>
</template>
