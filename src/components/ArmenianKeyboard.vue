<script setup>
import { ref, onBeforeUnmount } from 'vue'

// Key arrangement of the iPhone's Armenian keyboard (և is a long-press on ե).
const emit = defineEmits(['insert', 'backspace'])

const LETTERS = [
  ['է', 'թ', 'փ', 'ձ', 'ջ', 'ր', 'չ', 'ճ', 'ժ', 'ծ'],
  ['ք', 'ո', 'ե', 'ռ', 'տ', 'ը', 'ւ', 'ի', 'օ', 'պ'],
  ['ա', 'ս', 'դ', 'ֆ', 'գ', 'հ', 'յ', 'կ', 'լ', 'խ'],
  ['զ', 'ղ', 'ց', 'վ', 'բ', 'ն', 'մ', 'շ'],
]
const SYMBOLS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', '։', ';', '(', ')', '֏', '&', '@', '"'],
  ['.', ',', '?', '!', "'", '՝', '՞', '՜', '…', '«'],
  ['»', ':', '*', '+', '=', '%', '#', '_'],
]
const LONG_PRESS = { ե: 'և', Ե: 'և' }

const shift = ref(false)
const symbols = ref(false)
const popup = ref(null) // key currently showing its long-press alternative

const label = (ch) => (shift.value && !symbols.value ? ch.toUpperCase() : ch)

// ── letters with long-press alternatives ──
let pressTimer = null
let longPressed = false

function onKeyDown(ch) {
  longPressed = false
  clearTimeout(pressTimer)
  const alt = LONG_PRESS[label(ch)]
  if (!alt) return
  pressTimer = setTimeout(() => {
    longPressed = true
    popup.value = ch
  }, 380)
}

function onKeyUp(ch) {
  clearTimeout(pressTimer)
  if (longPressed) {
    emit('insert', LONG_PRESS[label(ch)])
    shift.value = false
    popup.value = null
  }
}

function onKeyCancel() {
  clearTimeout(pressTimer)
  popup.value = null
}

function onKeyClick(ch) {
  if (longPressed) {
    longPressed = false
    return
  }
  emit('insert', label(ch))
  shift.value = false
}

// ── backspace: tap deletes one, hold repeats ──
let repeatDelay = null
let repeatTimer = null
let repeated = false

function backspaceDown() {
  repeated = false
  stopRepeat()
  repeatDelay = setTimeout(() => {
    repeated = true
    emit('backspace')
    repeatTimer = setInterval(() => emit('backspace'), 80)
  }, 400)
}

function stopRepeat() {
  clearTimeout(repeatDelay)
  clearInterval(repeatTimer)
}

function backspaceClick() {
  if (!repeated) emit('backspace')
  repeated = false
}

function toggleSymbols() {
  symbols.value = !symbols.value
  shift.value = false
}

onBeforeUnmount(() => {
  clearTimeout(pressTimer)
  stopRepeat()
})
</script>

<template>
  <div class="ios-kb rounded-xl bg-[#d3d6dd] p-1 pb-1.5 select-none" @mousedown.prevent @contextmenu.prevent>
    <div
      v-for="(row, r) in symbols ? SYMBOLS : LETTERS"
      :key="(symbols ? 's' : 'l') + r"
      class="mt-[7px] flex justify-center gap-[5px] first:mt-0.5"
    >
      <button
        v-if="r === 3"
        type="button"
        tabindex="-1"
        class="key key-fn kw"
        :class="{ 'key-on': shift && !symbols }"
        :disabled="symbols"
        :aria-label="shift ? 'Shift on' : 'Shift'"
        @click="shift = !shift"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" :fill="shift && !symbols ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <path d="M12 4 3.5 12.5H8V20h8v-7.5h4.5z" />
        </svg>
      </button>

      <button
        v-for="ch in row"
        :key="ch"
        type="button"
        tabindex="-1"
        class="key key-char kw relative"
        @pointerdown="onKeyDown(ch)"
        @pointerup="onKeyUp(ch)"
        @pointerleave="onKeyCancel"
        @pointercancel="onKeyCancel"
        @click="onKeyClick(ch)"
      >
        {{ label(ch) }}
        <span
          v-if="popup === ch"
          class="absolute -top-12 left-1/2 grid h-11 min-w-11 -translate-x-1/2 place-items-center rounded-lg bg-blue-500 px-2 text-xl text-white shadow-lg"
        >{{ LONG_PRESS[label(ch)] }}</span>
      </button>

      <button
        v-if="r === 3"
        type="button"
        tabindex="-1"
        class="key key-fn kw"
        aria-label="Delete"
        @pointerdown="backspaceDown"
        @pointerup="stopRepeat"
        @pointerleave="stopRepeat"
        @pointercancel="stopRepeat"
        @click="backspaceClick"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
          <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
          <path d="m12 9 6 6m0-6-6 6" />
        </svg>
      </button>
    </div>

    <div class="mt-[7px] flex gap-[5px]">
      <button type="button" tabindex="-1" class="key key-fn w-[22%] text-[15px]" @click="toggleSymbols">
        {{ symbols ? 'Աբգ' : '123' }}
      </button>
      <button type="button" tabindex="-1" class="key key-char flex-1 text-[15px] text-slate-500" @click="emit('insert', ' ')">space</button>
      <button type="button" tabindex="-1" class="key key-fn w-[22%] text-xl" @click="emit('insert', '։')">։</button>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.key {
  @apply grid h-[42px] cursor-pointer place-items-center rounded-[5px] text-slate-900 shadow-[0_1px_0_#898a8d] transition-colors duration-75;
  touch-action: manipulation;
}
.key-char {
  @apply bg-white text-[21px] active:bg-[#aeb3be];
}
.key-fn {
  @apply bg-[#abb0bc] active:bg-white disabled:opacity-40;
}
.kw {
  width: calc((100% - 45px) / 10);
}
.key-on {
  @apply bg-white;
}
</style>
