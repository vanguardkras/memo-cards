<script setup>
import { ref, computed, nextTick } from 'vue'
import ArmenianKeyboard from './ArmenianKeyboard.vue'

const model = defineModel({ type: String, default: '' })
const props = defineProps({
  placeholder: { type: String, default: '' },
  inputClass: { type: String, default: '' },
  readonly: Boolean,
})

// Web pages cannot switch the phone's system keyboard language, so on touch
// devices Armenian fields use the built-in Armenian keyboard by default and keep
// the system keyboard hidden. The choice is remembered across fields and visits.
const PREF_KEY = 'memo-cards.mobileKeyboard'
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function readPref() {
  try {
    return localStorage.getItem(PREF_KEY) === 'system' ? 'system' : 'armenian'
  } catch {
    return 'armenian'
  }
}

const el = ref(null)
const focused = ref(false)
const mobileMode = ref(readPref()) // 'armenian' | 'system' (touch devices only)
const desktopOpen = ref(false)

const useBuiltIn = computed(() => (isTouch ? mobileMode.value === 'armenian' : desktopOpen.value))
const showKeyboard = computed(() => !props.readonly && useBuiltIn.value && (!isTouch || focused.value))

let blurTimer
function onFocus() {
  clearTimeout(blurTimer)
  focused.value = true
}
function onBlur() {
  // Short delay so taps that move focus around the field do not flicker the keyboard.
  blurTimer = setTimeout(() => (focused.value = false), 150)
}

function toggle() {
  if (isTouch) {
    mobileMode.value = mobileMode.value === 'armenian' ? 'system' : 'armenian'
    try {
      localStorage.setItem(PREF_KEY, mobileMode.value)
    } catch {
      /* storage unavailable: keep the choice for this page only */
    }
    // Re-focus so the phone shows or hides its own keyboard right away.
    el.value?.blur()
    nextTick(() => el.value?.focus())
  } else {
    desktopOpen.value = !desktopOpen.value
  }
}

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
        :inputmode="isTouch && useBuiltIn ? 'none' : 'text'"
        :placeholder="placeholder"
        :readonly="readonly"
        class="input pr-16"
        :class="inputClass"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        @focus="onFocus"
        @blur="onBlur"
      />
      <button
        type="button"
        tabindex="-1"
        class="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-semibold transition"
        :class="useBuiltIn ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
        :title="
          isTouch
            ? useBuiltIn ? 'Use the phone keyboard' : 'Use the Armenian keyboard'
            : useBuiltIn ? 'Hide Armenian keyboard' : 'Show Armenian keyboard'
        "
        @mousedown.prevent
        @click="toggle"
      >
        {{ isTouch && useBuiltIn ? '⌨ ABC' : 'Աբգ' }}
      </button>
    </div>
    <ArmenianKeyboard v-if="showKeyboard" class="mt-2" @insert="insert" @backspace="backspace" @enter="el?.form?.requestSubmit()" />
  </div>
</template>
