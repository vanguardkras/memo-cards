<script setup>
import { ref, onBeforeUnmount } from 'vue'

// Same key arrangement as the iPhone's built-in Armenian keyboard.
const emit = defineEmits(['insert', 'backspace', 'enter'])

const LETTERS = [
  ['է', 'թ', 'փ', 'ձ', 'ջ', 'և', 'ր', 'չ', 'ճ', 'ժ', 'շ'],
  ['ք', 'ո', 'ե', 'ռ', 'տ', 'ը', 'ւ', 'ի', 'օ', 'պ', 'խ'],
  ['ա', 'ս', 'դ', 'ֆ', 'գ', 'հ', 'յ', 'կ', 'լ', 'ծ'],
  ['զ', 'ղ', 'ց', 'վ', 'բ', 'ն', 'մ'],
]
const SYMBOLS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
  ['/', '։', ';', '(', ')', '֏', '&', '@', '"', '«', '»'],
  ['.', ',', '?', '!', "'", '՝', '՞', '՜', '…', ':'],
  ['*', '+', '=', '%', '#', '_', '$'],
]

const shift = ref(false)
const symbols = ref(false)

// և has no capital form, so it stays as is with Shift on.
const label = (ch) => (shift.value && !symbols.value && ch !== 'և' ? ch.toUpperCase() : ch)

function press(ch) {
  emit('insert', label(ch))
  shift.value = false
}

// ── backspace: tap deletes one character, holding repeats ──
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

onBeforeUnmount(stopRepeat)
</script>

<template>
  <div class="ios-kb rounded-xl bg-[#d3d6dd] px-[3px] pt-2 pb-1.5 select-none" @mousedown.prevent @contextmenu.prevent>
    <!-- Rows 1–3 -->
    <div v-for="(row, r) in (symbols ? SYMBOLS : LETTERS).slice(0, 3)" :key="(symbols ? 's' : 'l') + r" class="row">
      <button v-for="ch in row" :key="ch" type="button" tabindex="-1" class="key key-char kw" @click="press(ch)">
        {{ label(ch) }}
      </button>
    </div>

    <!-- Row 4: shift · letters · delete -->
    <div class="row">
      <button
        type="button"
        tabindex="-1"
        class="key key-fn kw-wide"
        :class="{ 'key-on': shift && !symbols }"
        :disabled="symbols"
        :aria-label="shift ? 'Shift on' : 'Shift'"
        @click="shift = !shift"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" :fill="shift && !symbols ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <path d="M12 4 3.5 12.5H8V20h8v-7.5h4.5z" />
        </svg>
      </button>
      <div class="flex-1"></div>
      <button
        v-for="ch in (symbols ? SYMBOLS : LETTERS)[3]"
        :key="ch"
        type="button"
        tabindex="-1"
        class="key key-char kw"
        @click="press(ch)"
      >
        {{ label(ch) }}
      </button>
      <div class="flex-1"></div>
      <button
        type="button"
        tabindex="-1"
        class="key key-fn kw-wide"
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

    <!-- Row 5: 123 · ։ · space · return -->
    <div class="row">
      <button type="button" tabindex="-1" class="key key-fn kw-wide text-[15px]" @click="toggleSymbols">
        {{ symbols ? 'Աբգ' : '123' }}
      </button>
      <button type="button" tabindex="-1" class="key key-fn kw-wide text-xl" title="Armenian full stop" @click="emit('insert', '։')">։</button>
      <button type="button" tabindex="-1" class="key key-char flex-1 text-[15px] text-slate-500" @click="emit('insert', ' ')">space</button>
      <button type="button" tabindex="-1" class="key key-fn w-[27%]" aria-label="Return" @click="emit('enter')">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
          <path d="M20 6v5a3 3 0 0 1-3 3H5" />
          <path d="m9 10-4 4 4 4" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.row {
  @apply mb-[9px] flex justify-center gap-[5px] last:mb-0;
}
.key {
  @apply grid h-[42px] shrink-0 cursor-pointer place-items-center rounded-[5px] text-slate-900 shadow-[0_1px_0_#898a8d] transition-colors duration-75;
  touch-action: manipulation;
}
/* 11 keys + 10 gaps fill the widest row */
.kw {
  width: calc((100% - 50px) / 11);
}
.kw-wide {
  width: calc((100% - 50px) / 11 * 1.35);
}
.key-char {
  @apply bg-white text-[21px] active:bg-[#aeb3be];
}
.key-fn {
  @apply bg-[#abb0bc] active:bg-white disabled:opacity-40;
}
.key-on {
  @apply bg-white;
}
</style>
