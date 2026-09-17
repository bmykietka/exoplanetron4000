<script setup lang="ts">
import type { SystemSummary } from '~~/shared/types/exoplanet'

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { systems, pending, error, ensureLoaded } = useSystemList()

const query = ref(props.modelValue ?? '')
const isOpen = ref(false)
const highlightedIndex = ref(0)
const rootEl = ref<HTMLElement | null>(null)

onMounted(() => {
  ensureLoaded()
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

function onClickOutside(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) isOpen.value = false
}

const results = computed<SystemSummary[]>(() => fuzzyFilter(query.value, systems.value, (s) => s.hostname, 40))

watch(results, () => {
  highlightedIndex.value = 0
})

watch(
  () => props.modelValue,
  (v) => {
    if (v !== null && v !== query.value) query.value = v
  }
)

function openList() {
  isOpen.value = true
}

function selectSystem(system: SystemSummary) {
  query.value = system.hostname
  isOpen.value = false
  emit('update:modelValue', system.hostname)
}

function onEnter() {
  const picked = results.value[highlightedIndex.value]
  if (picked) selectSystem(picked)
}

function moveHighlight(delta: number) {
  if (!isOpen.value) {
    isOpen.value = true
    return
  }
  const len = results.value.length
  if (len === 0) return
  highlightedIndex.value = (highlightedIndex.value + delta + len) % len
}

function formatDistance(pc: number | null): string {
  if (pc === null || !Number.isFinite(pc)) return 'distance unknown'
  return `${pc.toFixed(1)} pc away`
}
</script>

<template>
  <div ref="rootEl" class="system-search">
    <label class="visually-hidden" for="system-search-input">Search exoplanet systems</label>
    <div class="input-wrap">
      <svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <input
        id="system-search-input"
        v-model="query"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Search a star system, e.g. TRAPPIST-1"
        role="combobox"
        :aria-expanded="isOpen"
        aria-autocomplete="list"
        @focus="openList"
        @keydown.down.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="isOpen = false"
      />
      <span v-if="pending" class="spinner" aria-hidden="true" />
    </div>

    <ul v-if="isOpen && (results.length || error)" class="results scrollbar-thin">
      <li v-if="error" class="state-row error">{{ error }}</li>
      <li
        v-for="(system, i) in results"
        :key="system.hostname"
        class="result-row"
        :class="{ active: i === highlightedIndex }"
        @mouseenter="highlightedIndex = i"
        @mousedown.prevent="selectSystem(system)"
      >
        <span class="hostname">{{ system.hostname }}</span>
        <span class="meta">{{ system.numPlanets }} planet{{ system.numPlanets === 1 ? '' : 's' }} · {{ formatDistance(system.distancePc) }}</span>
      </li>
      <li v-if="!pending && results.length === 0 && !error" class="state-row">No systems match "{{ query }}"</li>
    </ul>
  </div>
</template>

<style scoped>
.system-search {
  position: relative;
  width: 100%;
  max-width: 420px;
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.55rem 0.8rem;
}

.input-wrap:focus-within {
  border-color: var(--accent);
}

.icon {
  color: var(--text-dim);
  flex-shrink: 0;
}

input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 0.95rem;
}

input::placeholder {
  color: var(--text-dim);
}

.spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  z-index: 30;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.result-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}

.result-row.active,
.result-row:hover {
  background: rgba(127, 215, 255, 0.12);
}

.hostname {
  font-weight: 600;
  font-size: 0.92rem;
}

.meta {
  font-size: 0.76rem;
  color: var(--text-dim);
}

.state-row {
  padding: 0.6rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.state-row.error {
  color: var(--danger);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
