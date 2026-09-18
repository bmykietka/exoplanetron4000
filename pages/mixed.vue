<script setup lang="ts">
const DEFAULT_LEFT = ['TRAPPIST-1', 'Kepler-90', 'HD 40307']
const DEFAULT_RIGHT = ['Proxima Cen', 'TOI-700', '55 Cnc']

const route = useRoute()
const router = useRouter()

function parseList(value: unknown, fallback: string[]): string[] {
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',').map((s) => decodeURIComponent(s))
  }
  return fallback
}

const left = ref<string[]>(parseList(route.query.left, DEFAULT_LEFT))
const right = ref<string[]>(parseList(route.query.right, DEFAULT_RIGHT))
const focused = ref<string>(typeof route.query.focus === 'string' ? route.query.focus : left.value[0])

watch(
  [left, right, focused],
  () => {
    router.replace({
      query: {
        left: left.value.map(encodeURIComponent).join(','),
        right: right.value.map(encodeURIComponent).join(','),
        focus: encodeURIComponent(focused.value)
      }
    })
  },
  { deep: true }
)

const { detail: focusedDetail, pending: focusedPending, error: focusedError } = useSystemDetail(focused)

function updateLeft(index: number, name: string) {
  left.value = left.value.map((h, i) => (i === index ? name : h))
}

function updateRight(index: number, name: string) {
  right.value = right.value.map((h, i) => (i === index ? name : h))
}

function focusOn(name: string) {
  focused.value = name
}

// Resizable side columns. Widths are a per-device preference (not part of
// the shareable URL state above) so they live in localStorage instead.
const MIN_COL_WIDTH = 260
const MAX_COL_WIDTH = 640
const DEFAULT_COL_WIDTH = 380
const WIDTH_STORAGE_KEY = { left: 'exoplanetron-mixed-left-width', right: 'exoplanetron-mixed-right-width' } as const

const leftWidth = ref(DEFAULT_COL_WIDTH)
const rightWidth = ref(DEFAULT_COL_WIDTH)

function clampWidth(w: number): number {
  const viewportMax = typeof window !== 'undefined' ? window.innerWidth * 0.45 : MAX_COL_WIDTH
  return Math.min(Math.max(w, MIN_COL_WIDTH), Math.min(MAX_COL_WIDTH, viewportMax))
}

onMounted(() => {
  try {
    const savedLeft = localStorage.getItem(WIDTH_STORAGE_KEY.left)
    const savedRight = localStorage.getItem(WIDTH_STORAGE_KEY.right)
    if (savedLeft) leftWidth.value = clampWidth(Number(savedLeft))
    if (savedRight) rightWidth.value = clampWidth(Number(savedRight))
  } catch {
    // localStorage may be unavailable (private browsing, etc.) — defaults are fine.
  }
})

function persistWidths() {
  try {
    localStorage.setItem(WIDTH_STORAGE_KEY.left, String(leftWidth.value))
    localStorage.setItem(WIDTH_STORAGE_KEY.right, String(rightWidth.value))
  } catch {
    // ignore
  }
}

let dragSide: 'left' | 'right' | null = null
let dragStartX = 0
let dragStartWidth = 0

function startResize(side: 'left' | 'right', event: PointerEvent) {
  event.preventDefault()
  dragSide = side
  dragStartX = event.clientX
  dragStartWidth = side === 'left' ? leftWidth.value : rightWidth.value
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(event: PointerEvent) {
  if (!dragSide) return
  const delta = event.clientX - dragStartX
  const next = clampWidth(dragStartWidth + (dragSide === 'left' ? delta : -delta))
  if (dragSide === 'left') leftWidth.value = next
  else rightWidth.value = next
}

function onResizeEnd() {
  dragSide = null
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
  persistWidths()
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
})
</script>

<template>
  <div class="mixed-page">
    <NuxtLink to="/" class="back-link">← Exoplanetron 4000</NuxtLink>

    <div class="backdrop">
      <ClientOnly>
        <SystemViewer3D v-if="focusedDetail" :system="focusedDetail" />
        <template #fallback>
          <div class="backdrop-state">Loading 3D view…</div>
        </template>
      </ClientOnly>
      <div v-if="!focusedDetail && focusedPending" class="backdrop-state">Loading {{ focused }}…</div>
      <div v-else-if="focusedError" class="backdrop-state error">{{ focusedError }}</div>
    </div>

    <aside class="side-column left scrollbar-thin" :style="{ '--col-width': leftWidth + 'px' }">
      <MixedSystemPanel
        v-for="(name, i) in left"
        :key="`left-${i}-${name}`"
        :hostname="name"
        :focused="name === focused"
        @update:hostname="updateLeft(i, $event)"
        @focus="focusOn(name)"
      />
      <div class="resize-handle" title="Drag to resize" @pointerdown="startResize('left', $event)" />
    </aside>

    <aside class="side-column right scrollbar-thin" :style="{ '--col-width': rightWidth + 'px' }">
      <MixedSystemPanel
        v-for="(name, i) in right"
        :key="`right-${i}-${name}`"
        :hostname="name"
        :focused="name === focused"
        @update:hostname="updateRight(i, $event)"
        @focus="focusOn(name)"
      />
      <div class="resize-handle" title="Drag to resize" @pointerdown="startResize('right', $event)" />
    </aside>
  </div>
</template>

<style scoped>
.mixed-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #03050a;
}

.back-link {
  position: absolute;
  top: 0.9rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  background: rgba(5, 7, 13, 0.65);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.78rem;
  color: var(--text-dim);
  text-decoration: none;
  backdrop-filter: blur(4px);
}

.back-link:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.backdrop :deep(.viewer-3d) {
  border-radius: 0;
}

.backdrop-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-dim);
  font-size: 0.95rem;
  z-index: 1;
}

.backdrop-state.error {
  color: var(--danger);
}

.side-column {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--col-width, 380px);
  padding: 3.5rem 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  z-index: 2;
  /* Let clicks in the gaps between panels fall through to the 3D canvas
     behind, so OrbitControls dragging still works there; panels themselves
     opt back in below. */
  pointer-events: none;
}

.side-column :deep(.mixed-panel) {
  pointer-events: auto;
}

.side-column.left {
  left: 0;
  background: linear-gradient(to right, rgba(3, 5, 10, 0.35), transparent);
}

.side-column.right {
  right: 0;
  background: linear-gradient(to left, rgba(3, 5, 10, 0.35), transparent);
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: ew-resize;
  pointer-events: auto;
  z-index: 3;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: transparent;
  transition: background 0.15s ease;
}

.resize-handle:hover::after {
  background: var(--accent);
}

.side-column.left .resize-handle {
  right: 0;
}

.side-column.right .resize-handle {
  left: 0;
}

@media (max-width: 900px) {
  .mixed-page {
    position: static;
    overflow: visible;
  }

  .backdrop {
    position: relative;
    height: 60vh;
    min-height: 360px;
  }

  .back-link {
    position: sticky;
    top: 0.75rem;
    margin: 0.75rem auto 0;
    display: table;
  }

  .side-column {
    position: static;
    width: 100% !important;
    padding: 1rem;
    background: none;
  }

  .resize-handle {
    display: none;
  }
}
</style>
