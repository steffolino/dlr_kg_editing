<script setup lang="ts">
import type { Entity, Relation } from '~/types/index'

type GraphMode = 'local' | 'full'
type GraphVariant = 'teal' | 'sunset' | 'ocean' | 'forest' | 'slate'
type GraphLayout = 'radial' | 'spiral' | 'arc' | 'grid'

interface PositionedNode {
  id: string
  label: string
  type: string
  x: number
  y: number
  isFocal: boolean
}

const props = withDefaults(defineProps<{
  focalId: string
  localNodes: Entity[]
  localEdges: Relation[]
  fullNodes: Entity[]
  fullEdges: Relation[]
  variant?: GraphVariant
  contextNote?: string
}>(), {
  variant: 'teal'
})

const router = useRouter()
const mode = ref<GraphMode>('local')
const width = 360
const height = 240
const pad = 28

const variantTheme = computed(() => {
  const themes: Record<GraphVariant, {
    panelBg: string
    edge: string
    marker: string
    node: string
    focal: string
    label: string
    layout: GraphLayout
  }> = {
    teal: {
      panelBg: '#f1f5f9',
      edge: '#94a3b8',
      marker: '#94a3b8',
      node: '#1e293b',
      focal: '#0f766e',
      label: '#475569',
      layout: 'radial'
    },
    sunset: {
      panelBg: '#fff7ed',
      edge: '#fb923c',
      marker: '#fb923c',
      node: '#9a3412',
      focal: '#dc2626',
      label: '#7c2d12',
      layout: 'spiral'
    },
    ocean: {
      panelBg: '#ecfeff',
      edge: '#0891b2',
      marker: '#0891b2',
      node: '#0e7490',
      focal: '#1d4ed8',
      label: '#0f766e',
      layout: 'arc'
    },
    forest: {
      panelBg: '#f0fdf4',
      edge: '#4ade80',
      marker: '#4ade80',
      node: '#166534',
      focal: '#15803d',
      label: '#14532d',
      layout: 'grid'
    },
    slate: {
      panelBg: '#f8fafc',
      edge: '#64748b',
      marker: '#64748b',
      node: '#334155',
      focal: '#0f172a',
      label: '#475569',
      layout: 'radial'
    }
  }
  return themes[props.variant]
})

const markerId = computed(() => `graph-arrow-${props.variant}-${props.focalId.replace(/[^a-zA-Z0-9_-]/g, '')}`)

const activeNodes = computed(() => mode.value === 'local' ? props.localNodes : props.fullNodes)
const activeEdges = computed(() => mode.value === 'local' ? props.localEdges : props.fullEdges)

const positionedNodes = computed<PositionedNode[]>(() => {
  const nodes = activeNodes.value
  if (nodes.length === 0) return []

  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.max(56, Math.min(width, height) / 2 - pad)

  const focal = nodes.find((node) => node.id === props.focalId)
  const others = nodes.filter((node) => node.id !== props.focalId).sort((a, b) => a.id.localeCompare(b.id))
  const ordered = focal ? [focal, ...others] : [...nodes].sort((a, b) => a.id.localeCompare(b.id))

  return ordered.map((node, index) => {
    if (node.id === props.focalId) {
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        x: centerX,
        y: centerY,
        isFocal: true
      }
    }

    const nonFocalCount = Math.max(1, ordered.length - (focal ? 1 : 0))
    const nonFocalIndex = focal ? Math.max(0, index - 1) : index

    if (variantTheme.value.layout === 'spiral') {
      const t = nonFocalIndex / nonFocalCount
      const spiralRadius = Math.max(40, radius * (0.45 + t * 0.55))
      const spiralAngle = (3.4 * Math.PI * t) - Math.PI / 2
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        x: centerX + spiralRadius * Math.cos(spiralAngle),
        y: centerY + spiralRadius * Math.sin(spiralAngle),
        isFocal: false
      }
    }

    if (variantTheme.value.layout === 'arc') {
      const arcAngle = (-Math.PI * 0.85) + ((1.7 * Math.PI) * (nonFocalIndex / Math.max(1, nonFocalCount - 1)))
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        x: centerX + radius * Math.cos(arcAngle),
        y: centerY + (radius * 0.7) * Math.sin(arcAngle),
        isFocal: false
      }
    }

    if (variantTheme.value.layout === 'grid') {
      const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(nonFocalCount))))
      const rows = Math.max(1, Math.ceil(nonFocalCount / cols))
      const col = nonFocalIndex % cols
      const row = Math.floor(nonFocalIndex / cols)
      const spanX = width - pad * 2
      const spanY = height - pad * 2
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        x: pad + ((col + 0.5) * spanX) / cols,
        y: pad + ((row + 0.5) * spanY) / rows,
        isFocal: false
      }
    }

    const angle = (2 * Math.PI * nonFocalIndex) / nonFocalCount - Math.PI / 2

    return {
      id: node.id,
      label: node.label,
      type: node.type,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      isFocal: node.id === props.focalId
    }
  })
})

const positionedLookup = computed(() => {
  return new Map(positionedNodes.value.map((node) => [node.id, node]))
})

const visibleEdges = computed(() => {
  return activeEdges.value.filter((edge) =>
    positionedLookup.value.has(edge.sourceId) && positionedLookup.value.has(edge.targetId)
  )
})

function nodeTitle(node: PositionedNode): string {
  return `${node.id} (${node.type})`
}

function shortLabel(label: string): string {
  return label.length > 16 ? `${label.slice(0, 16)}...` : label
}

function openEntity(id: string): void {
  router.push(`/entities/${id}`)
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Graph preview</h2>
      <div class="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
        <button
          type="button"
          class="rounded px-2 py-1 transition"
          :class="mode === 'local' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="mode = 'local'"
        >
          1-hop
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 transition"
          :class="mode === 'full' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="mode = 'full'"
        >
          Connected
        </button>
      </div>
    </div>

    <p class="text-xs text-slate-500">
      {{ positionedNodes.length }} node{{ positionedNodes.length === 1 ? '' : 's' }}
      and {{ visibleEdges.length }} relation{{ visibleEdges.length === 1 ? '' : 's' }} shown.
    </p>
    <p v-if="props.contextNote" class="text-[11px] text-slate-500">
      {{ props.contextNote }}
    </p>

    <div class="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        class="block h-60 w-full"
        role="img"
        aria-label="Entity relation network preview"
        :style="{ backgroundColor: variantTheme.panelBg }"
      >
        <defs>
          <marker :id="markerId" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <path d="M0,0 L7,2.5 L0,5 Z" :fill="variantTheme.marker" />
          </marker>
        </defs>

        <line
          v-for="edge in visibleEdges"
          :key="edge.id"
          :x1="positionedLookup.get(edge.sourceId)?.x ?? 0"
          :y1="positionedLookup.get(edge.sourceId)?.y ?? 0"
          :x2="positionedLookup.get(edge.targetId)?.x ?? 0"
          :y2="positionedLookup.get(edge.targetId)?.y ?? 0"
          :stroke="variantTheme.edge"
          stroke-width="1.5"
          :marker-end="`url(#${markerId})`"
          stroke-linecap="round"
          opacity="0.8"
        />

        <g v-for="node in positionedNodes" :key="node.id">
          <circle
            :cx="node.x"
            :cy="node.y"
            :r="node.isFocal ? 14 : 10"
            :fill="node.isFocal ? variantTheme.focal : variantTheme.node"
            class="cursor-pointer transition-opacity hover:opacity-80"
            @click="openEntity(node.id)"
          />
          <title>{{ nodeTitle(node) }}</title>
          <text
            :x="node.x"
            :y="node.y + (node.isFocal ? 28 : 24)"
            text-anchor="middle"
            class="text-[9px]"
            :style="{ fill: variantTheme.label }"
          >
            {{ shortLabel(node.id) }}
          </text>
        </g>
      </svg>
    </div>

    <p class="text-[11px] text-slate-500">
      Center node is the current preview focus.
    </p>
  </section>
</template>
