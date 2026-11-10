<script setup>
defineProps({ label: String, value: [String, Number], hint: String, valueClass: { type: String, default: 'text-slate-800' } })
</script>

<template>
  <div class="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/50">
    <div class="text-xs font-medium tracking-wide text-slate-400 uppercase">{{ label }}</div>
    <div class="mt-1 text-2xl font-semibold tabular-nums" :class="valueClass">{{ value }}</div>
    <div v-if="hint" class="mt-0.5 text-xs text-slate-400">{{ hint }}</div>
  </div>
</template>
