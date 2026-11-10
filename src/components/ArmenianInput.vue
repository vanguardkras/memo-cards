<script setup>
import { ref, nextTick } from 'vue'
import ArmenianKeyboard from './ArmenianKeyboard.vue'

const model = defineModel({ type: String, default: '' })
const props = defineProps({
  placeholder: { type: String, default: '' },
  inputClass: { type: String, default: '' },
  readonly: Boolean,
  keyboardOpen: Boolean,
})

const el = ref(null)
const open = ref(props.keyboardOpen)

function replaceSelection(build) {
  const input = el.value
  const value = model.value || ''
  const start = input?.selectionStart ?? value.length
  const end = input?.selectionEnd ?? value.length
  const { text, caret } = build(value, start, end)
  model.value = text
  nextTick(() => {
    input?.focus()
    input?.setSelectionRange(caret, caret)
  })
}

function insert(ch) {
  if (props.readonly) return
  replaceSelection((v, s, e) => ({ text: v.slice(0, s) + ch + v.slice(e), caret: s + ch.length }))
}

function backspace() {
  if (props.readonly) return
  replaceSelection((v, s, e) =>
    s !== e ? { text: v.slice(0, s) + v.slice(e), caret: s } : { text: v.slice(0, Math.max(0, s - 1)) + v.slice(s), caret: Math.max(0, s - 1) },
  )
}

defineExpose({ focus: () => el.value?.focus() })
</script>

<template>
  <div>
    <div class="relative">
      <input
        ref="el"
        v-model="model"
        lang="hy"
        :placeholder="placeholder"
        :readonly="readonly"
        class="input pr-14"
        :class="inputClass"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button
        type="button"
        tabindex="-1"
        class="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-semibold transition"
        :class="open ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
        :title="open ? 'Hide Armenian keyboard' : 'Show Armenian keyboard'"
        @mousedown.prevent
        @click="open = !open"
      >
        Աբգ
      </button>
    </div>
    <ArmenianKeyboard v-if="open && !readonly" class="mt-2" @insert="insert" @backspace="backspace" />
  </div>
</template>
