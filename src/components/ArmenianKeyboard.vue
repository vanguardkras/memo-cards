<script setup>
import { ref } from 'vue'

const emit = defineEmits(['insert', 'backspace'])
const shift = ref(false)

const ROWS = [
  ['ա', 'բ', 'գ', 'դ', 'ե', 'զ', 'է', 'ը', 'թ', 'ժ'],
  ['ի', 'լ', 'խ', 'ծ', 'կ', 'հ', 'ձ', 'ղ', 'ճ', 'մ'],
  ['յ', 'ն', 'շ', 'ո', 'չ', 'պ', 'ջ', 'ռ', 'ս', 'վ'],
  ['տ', 'ր', 'ց', 'ւ', 'փ', 'ք', 'օ', 'ֆ', 'և', 'ու'],
]

function label(ch) {
  if (!shift.value || ch === 'և') return ch
  if (ch === 'ու') return 'Ու'
  return ch.toUpperCase()
}

function press(ch) {
  emit('insert', label(ch))
  shift.value = false
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-slate-50 p-1.5 select-none sm:p-2" @mousedown.prevent>
    <div v-for="(row, i) in ROWS" :key="i" class="mb-1 grid grid-cols-10 gap-1">
      <button
        v-for="ch in row"
        :key="ch"
        type="button"
        tabindex="-1"
        class="h-10 rounded-lg border border-slate-200 bg-white text-lg text-slate-700 shadow-sm active:bg-indigo-100 sm:hover:bg-indigo-50"
        @click="press(ch)"
      >
        {{ label(ch) }}
      </button>
    </div>
    <div class="grid grid-cols-10 gap-1">
      <button
        type="button"
        tabindex="-1"
        class="col-span-2 h-10 rounded-lg border text-sm font-medium"
        :class="shift ? 'border-indigo-300 bg-indigo-100 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'"
        @click="shift = !shift"
      >
        ⇧ Shift
      </button>
      <button type="button" tabindex="-1" class="col-span-1 h-10 rounded-lg border border-slate-200 bg-white text-lg" @click="emit('insert', '՞')">՞</button>
      <button type="button" tabindex="-1" class="col-span-5 h-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-400" @click="emit('insert', ' ')">space</button>
      <button type="button" tabindex="-1" class="col-span-2 h-10 rounded-lg border border-slate-200 bg-white text-slate-600" @click="emit('backspace')">⌫</button>
    </div>
  </div>
</template>
