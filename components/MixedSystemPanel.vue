<script setup lang="ts">
const props = defineProps<{ hostname: string; focused: boolean }>()
const emit = defineEmits<{
  'update:hostname': [name: string]
  focus: []
}>()

const hostnameRef = computed(() => props.hostname)
const { detail, pending, error } = useSystemDetail(hostnameRef)

const editing = ref(false)
const editValue = ref<string | null>(null)

function startEdit() {
  editValue.value = null
  editing.value = true
}

function confirmSwap(newHostname: string) {
  editing.value = false
  if (newHostname && newHostname !== props.hostname) {
    emit('update:hostname', newHostname)
  }
}

function cancelEdit() {
  editing.value = false
}
</script>

<template>
  <div class="mixed-panel" :class="{ focused }">
    <div v-if="editing" class="panel-edit">
      <SystemSearch v-model="editValue" @update:model-value="confirmSwap" />
      <button type="button" class="icon-btn" title="Cancel" @click="cancelEdit">✕</button>
    </div>

    <template v-else>
      <div class="panel-header">
        <div class="panel-title">
          <h3>{{ hostname }}</h3>
          <span v-if="detail" class="panel-subtitle">
            {{ detail.star.spectralType ?? 'Unknown type' }} · {{ detail.planets.length }} planet{{ detail.planets.length === 1 ? '' : 's' }}
            <template v-if="detail.star.distancePc"> · {{ formatDistance(detail.star.distancePc) }}</template>
          </span>
        </div>
        <button type="button" class="icon-btn" title="Swap for another system" @click="startEdit">⇄</button>
      </div>

      <div v-if="pending" class="panel-state">Loading…</div>
      <div v-else-if="error" class="panel-state error">{{ error }}</div>

      <template v-else-if="detail">
        <div class="mini-stats">
          <span>{{ formatTemperature(detail.star.effectiveTempK) ?? '—' }}</span>
          <span>{{ detail.star.radiusSolar ? `${detail.star.radiusSolar.toFixed(2)} R☉` : '—' }}</span>
          <span>{{ detail.star.massSolar ? `${detail.star.massSolar.toFixed(2)} M☉` : '—' }}</span>
          <span v-if="detail.habitableZone.conservativeInnerAu && detail.habitableZone.conservativeOuterAu">
            HZ {{ detail.habitableZone.conservativeInnerAu.toFixed(2) }}–{{ detail.habitableZone.conservativeOuterAu.toFixed(2) }} AU
          </span>
        </div>

        <SystemViewer2D :system="detail" compact />

        <button type="button" class="focus-btn" :disabled="focused" @click="emit('focus')">
          {{ focused ? 'Viewing in 3D' : 'View in 3D' }}
        </button>
      </template>
    </template>
  </div>
</template>

<style scoped>
.mixed-panel {
  background: rgba(9, 13, 24, 0.48);
  border: 1px solid rgba(31, 43, 69, 0.8);
  border-radius: var(--radius);
  padding: 0.65rem 0.75rem;
  backdrop-filter: blur(1.5px);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mixed-panel.focused {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(127, 215, 255, 0.35);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.panel-title h3 {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.2;
}

.panel-subtitle {
  display: block;
  font-size: 0.68rem;
  color: var(--text-dim);
  margin-top: 0.1rem;
}

.icon-btn {
  flex-shrink: 0;
  background: rgba(16, 25, 46, 0.8);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 6px;
  width: 26px;
  height: 26px;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.mini-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.68rem;
  color: var(--text-dim);
}

.panel-state {
  font-size: 0.75rem;
  color: var(--text-dim);
  padding: 0.5rem 0;
}

.panel-state.error {
  color: var(--danger);
}

.focus-btn {
  align-self: flex-start;
  background: var(--bg-panel-alt);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font-size: 0.72rem;
  cursor: pointer;
}

.focus-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.focus-btn:disabled {
  color: var(--accent);
  border-color: var(--accent);
  cursor: default;
  opacity: 0.8;
}

.panel-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-edit :deep(.system-search) {
  max-width: none;
  flex: 1;
}
</style>
