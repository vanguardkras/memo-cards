<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCollectionsStore } from '../stores/collections'
import { useCardsStore } from '../stores/cards'
import { useRunsStore } from '../stores/runs'
import ArmenianInput from '../components/ArmenianInput.vue'
import CardThumb from '../components/CardThumb.vue'
import { DEFAULT_SETTINGS, buildQuiz, checkTyped, normalize } from '../utils/quiz'
import { pctClass, formatDuration } from '../utils/format'

const props = defineProps({ id: { type: Number, required: true } })
const router = useRouter()
const collections = useCollectionsStore()
const cardsStore = useCardsStore()
const runsStore = useRunsStore()

const PROMPTS = [
  { value: 'hy', title: 'Armenian word', hint: 'You recall the translation' },
  { value: 'tr', title: 'Translation', hint: 'You recall the Armenian word' },
  { value: 'mixed', title: 'Mixed', hint: 'Random direction each time' },
]
const MODES = [
  { value: 'flip', title: 'Flip card', hint: 'Reveal and mark yourself' },
  { value: 'choice', title: 'Multiple choice', hint: 'Pick from 4 options' },
  { value: 'type', title: 'Type answer', hint: 'Write the answer' },
]

const collection = ref(null)
const settings = reactive({ ...DEFAULT_SETTINGS })
const phase = ref('loading') // loading | setup | quiz | done

const questions = ref([])
const index = ref(0)
const results = ref([]) // { cardId, correct } per question index
const revealed = ref(false)
const answered = ref(false)
const chosen = ref(null)
const typed = ref('')
const typeInput = ref(null)
const startedAt = ref(0)
const finishedRun = ref(null)
const isRetry = ref(false)
const shownAnswers = ref(new Set())
let advanceTimer = null

const playable = computed(() => cardsStore.cards.filter((c) => c.armenian && c.translation))
const withImages = computed(() => playable.value.filter((c) => c.imageUrl).length)
const current = computed(() => questions.value[index.value])
const last = computed(() => results.value[index.value])
const correctCount = computed(() => results.value.filter((r) => r.correct).length)
const progress = computed(() =>
  questions.value.length ? ((index.value + (answered.value ? 1 : 0)) / questions.value.length) * 100 : 0,
)
const choiceTooFew = computed(() => {
  if (settings.mode !== 'choice') return false
  const keys = settings.prompt === 'hy' ? ['translation'] : settings.prompt === 'tr' ? ['armenian'] : ['translation', 'armenian']
  return keys.some((k) => new Set(playable.value.map((c) => normalize(c[k]))).size < 2)
})
const missed = computed(() =>
  questions.value
    .map((q, i) => ({ ...q, i }))
    .filter((q) => results.value[q.i] && !results.value[q.i].correct),
)
const allShown = computed(() => missed.value.length > 0 && missed.value.every((q) => shownAnswers.value.has(q.i)))

onMounted(async () => {
  const c = await collections.get(props.id)
  if (!c) return router.replace('/')
  collection.value = c
  Object.assign(settings, DEFAULT_SETTINGS, c.runSettings || {})
  await cardsStore.load(props.id)
  phase.value = 'setup'
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(advanceTimer)
})

function clampCount() {
  const n = Math.floor(Number(settings.count))
  settings.count = Number.isFinite(n) && n > 0 ? Math.min(n, 500) : DEFAULT_SETTINGS.count
}

function start(cardIds = null) {
  clampCount()
  isRetry.value = !!cardIds
  const pool = cardIds ? playable.value.filter((c) => cardIds.includes(c.id)) : playable.value
  if (!pool.length) return
  if (!cardIds) collections.saveRunSettings(props.id, { ...settings })
  const count = cardIds ? pool.length : settings.count
  questions.value = buildQuiz(pool, { ...settings, count, weakFirst: cardIds ? false : settings.weakFirst }, playable.value)
  index.value = 0
  results.value = []
  finishedRun.value = null
  shownAnswers.value = new Set()
  startedAt.value = Date.now()
  resetQuestion()
  phase.value = 'quiz'
  window.scrollTo({ top: 0 })
  focusQuestion()
}

function resetQuestion() {
  revealed.value = false
  answered.value = false
  chosen.value = null
  typed.value = ''
}

async function focusQuestion() {
  await nextTick()
  if (settings.mode === 'type') typeInput.value?.focus()
  else document.activeElement?.blur?.()
}

function record(correct) {
  results.value[index.value] = { cardId: current.value.card.id, correct }
  answered.value = true
}

function reveal() {
  if (phase.value === 'quiz' && !revealed.value) revealed.value = true
}

function grade(correct) {
  if (!revealed.value || answered.value) return
  record(correct)
  next()
}

function choose(i) {
  if (answered.value) return
  chosen.value = i
  const ok = current.value.choices[i] === current.value.answer
  record(ok)
  if (ok) advanceTimer = setTimeout(next, 700)
}

function submitTyped() {
  if (answered.value) return next()
  if (!typed.value.trim()) return
  record(checkTyped(typed.value, current.value.answer))
}

function markTypedCorrect() {
  if (last.value && !last.value.correct) last.value.correct = true
  typeInput.value?.focus()
}

function next() {
  if (!answered.value) return
  clearTimeout(advanceTimer)
  if (index.value + 1 >= questions.value.length) return finish()
  index.value++
  resetQuestion()
  focusQuestion()
}

function quit() {
  if (results.value.length && !confirm('Stop this run? Results of an unfinished run are not saved.')) return
  clearTimeout(advanceTimer)
  phase.value = 'setup'
}

async function finish() {
  const finishedAt = Date.now()
  const total = results.value.length
  const correct = correctCount.value
  const run = {
    collectionId: props.id,
    startedAt: startedAt.value,
    finishedAt,
    durationMs: finishedAt - startedAt.value,
    total,
    correct,
    percent: Math.round((correct / total) * 100),
    settings: { prompt: settings.prompt, mode: settings.mode, showImage: settings.showImage },
    retry: isRetry.value,
    mistakes: [...new Set(results.value.filter((r) => !r.correct).map((r) => r.cardId))],
  }
  finishedRun.value = run
  phase.value = 'done'
  window.scrollTo({ top: 0 })
  await Promise.all([runsStore.save(run), cardsStore.recordResults(results.value)])
}

function toggleAnswer(i) {
  const s = new Set(shownAnswers.value)
  s.has(i) ? s.delete(i) : s.add(i)
  shownAnswers.value = s
}

function toggleAll() {
  shownAnswers.value = allShown.value ? new Set() : new Set(missed.value.map((q) => q.i))
}

function onKey(e) {
  if (phase.value !== 'quiz' || e.ctrlKey || e.metaKey || e.altKey) return
  const tag = e.target?.tagName
  const inField = tag === 'INPUT' || tag === 'TEXTAREA'
  if (settings.mode === 'type') {
    if (answered.value && e.key === 'Enter' && !inField) {
      e.preventDefault()
      next()
    }
    return
  }
  if (inField) return
  if (settings.mode === 'flip') {
    if (!revealed.value && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      reveal()
    } else if (revealed.value && (e.key === 'ArrowLeft' || e.key === '1')) {
      e.preventDefault()
      grade(false)
    } else if (revealed.value && (e.key === 'ArrowRight' || e.key === '2')) {
      e.preventDefault()
      grade(true)
    }
  } else if (settings.mode === 'choice') {
    const n = Number(e.key)
    if (!answered.value && n >= 1 && n <= current.value.choices.length) {
      e.preventDefault()
      choose(n - 1)
    } else if (answered.value && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      next()
    }
  }
}

const sideLabel = (dir, isPrompt) => ((dir === 'hy') === isPrompt ? 'Armenian' : 'Translation')
const showImg = (q) => settings.showImage && q?.card.imageUrl
</script>

<template>
  <div v-if="collection" class="space-y-5">
    <!-- ───────────── Setup ───────────── -->
    <template v-if="phase === 'setup'">
      <RouterLink :to="{ name: 'edit', params: { id } }" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        ← {{ collection.name }}
      </RouterLink>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800">Run “{{ collection.name }}”</h1>
        <p class="mt-1 text-sm text-slate-500">{{ playable.length }} cards · {{ withImages }} with images</p>
      </div>

      <div v-if="!playable.length" class="panel text-center text-slate-500">
        This collection has no cards yet.
        <RouterLink :to="{ name: 'edit', params: { id } }" class="font-medium text-indigo-600">Add some cards</RouterLink>.
      </div>

      <form v-else class="panel space-y-6" @submit.prevent="start()">
        <fieldset>
          <legend class="label">Show me</legend>
          <div class="seg grid-cols-1 sm:grid-cols-3">
            <label v-for="o in PROMPTS" :key="o.value" class="seg-item" :class="{ 'seg-item-active': settings.prompt === o.value }">
              <input v-model="settings.prompt" type="radio" :value="o.value" class="sr-only" />
              <span class="font-medium text-slate-800">{{ o.title }}</span>
              <span class="text-xs text-slate-500">{{ o.hint }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend class="label">How to answer</legend>
          <div class="seg grid-cols-1 sm:grid-cols-3">
            <label v-for="o in MODES" :key="o.value" class="seg-item" :class="{ 'seg-item-active': settings.mode === o.value }">
              <input v-model="settings.mode" type="radio" :value="o.value" class="sr-only" />
              <span class="font-medium text-slate-800">{{ o.title }}</span>
              <span class="text-xs text-slate-500">{{ o.hint }}</span>
            </label>
          </div>
          <p v-if="choiceTooFew" class="mt-2 text-xs text-amber-600">
            Multiple choice needs at least 2 different answers. Add more cards or choose another mode.
          </p>
        </fieldset>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class="label" for="count">Number of questions</label>
            <div class="flex gap-2">
              <input id="count" v-model.number="settings.count" type="number" min="1" max="500" inputmode="numeric" class="input w-24" @blur="clampCount" />
              <div class="flex flex-1 gap-1">
                <button
                  v-for="n in [10, 15, 25]"
                  :key="n"
                  type="button"
                  class="btn flex-1 px-2"
                  :class="settings.count === n ? 'btn-soft' : 'btn-ghost'"
                  @click="settings.count = n"
                >{{ n }}</button>
                <button
                  type="button"
                  class="btn flex-1 px-2"
                  :class="settings.count === playable.length ? 'btn-soft' : 'btn-ghost'"
                  @click="settings.count = playable.length"
                >All</button>
              </div>
            </div>
            <p v-if="settings.count > playable.length" class="mt-1 text-xs text-slate-400">Some cards will be asked more than once.</p>
          </div>

          <div class="space-y-3">
            <label class="flex cursor-pointer items-start gap-3">
              <input v-model="settings.showImage" type="checkbox" class="mt-0.5 h-5 w-5 rounded accent-indigo-500" />
              <span>
                <span class="block text-sm font-medium text-slate-700">Show images</span>
                <span class="block text-xs text-slate-500">
                  {{ withImages ? `Shown with the question for ${withImages} card(s)` : 'No cards in this collection have images yet' }}
                </span>
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-3">
              <input v-model="settings.weakFirst" type="checkbox" class="mt-0.5 h-5 w-5 rounded accent-indigo-500" />
              <span>
                <span class="block text-sm font-medium text-slate-700">Focus on weak cards</span>
                <span class="block text-xs text-slate-500">Words you often miss are picked more often</span>
              </span>
            </label>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-full py-3 text-base" :disabled="choiceTooFew">Start ▶</button>
      </form>
    </template>

    <!-- ───────────── Quiz ───────────── -->
    <template v-else-if="phase === 'quiz' && current">
      <div class="flex items-center justify-between gap-3 text-sm">
        <button class="btn btn-ghost -ml-3" @click="quit">✕ Stop</button>
        <span class="font-medium text-slate-500 tabular-nums">{{ index + 1 }} / {{ questions.length }}</span>
        <span class="font-medium text-emerald-600 tabular-nums">✓ {{ correctCount }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div class="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 transition-all duration-300" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="mx-auto max-w-xl">
        <div class="panel flex min-h-64 flex-col items-center justify-center gap-4 text-center sm:min-h-72">
          <CardThumb
            v-if="showImg(current)"
            :key="current.card.id + '-' + index"
            :src="current.card.imageUrl"
            class="max-h-56 w-auto max-w-full rounded-xl object-contain"
          />
          <div>
            <div class="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">{{ sideLabel(current.dir, true) }}</div>
            <div class="text-3xl font-semibold break-words text-slate-800 sm:text-4xl" :lang="current.dir === 'hy' ? 'hy' : undefined">
              {{ current.prompt }}
            </div>
          </div>

          <!-- Flip: answer -->
          <div v-if="settings.mode === 'flip' && revealed" class="w-full border-t border-dashed border-slate-200 pt-4">
            <div class="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">{{ sideLabel(current.dir, false) }}</div>
            <div class="text-2xl font-medium break-words text-indigo-600" :lang="current.dir === 'tr' ? 'hy' : undefined">{{ current.answer }}</div>
          </div>

          <!-- Feedback (choice/type) -->
          <div
            v-if="settings.mode !== 'flip' && answered"
            class="w-full rounded-xl px-4 py-3 text-sm"
            :class="last.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
          >
            <template v-if="last.correct">Correct!</template>
            <template v-else>
              Correct answer: <b class="text-base" :lang="current.dir === 'tr' ? 'hy' : undefined">{{ current.answer }}</b>
            </template>
          </div>
        </div>

        <!-- Controls -->
        <div class="mt-4">
          <template v-if="settings.mode === 'flip'">
            <button v-if="!revealed" class="btn btn-primary w-full py-3.5 text-base" @click="reveal">
              Show answer <span class="kbd hidden border-indigo-300 bg-indigo-400 text-white sm:inline">Space</span>
            </button>
            <div v-else class="grid grid-cols-2 gap-3">
              <button class="btn border border-rose-200 bg-rose-50 py-3.5 text-base text-rose-700 hover:bg-rose-100" @click="grade(false)">
                ✗ Didn't know <span class="kbd hidden sm:inline">←</span>
              </button>
              <button class="btn border border-emerald-200 bg-emerald-50 py-3.5 text-base text-emerald-700 hover:bg-emerald-100" @click="grade(true)">
                ✓ Knew it <span class="kbd hidden sm:inline">→</span>
              </button>
            </div>
          </template>

          <template v-else-if="settings.mode === 'choice'">
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="(choice, i) in current.choices"
                :key="i"
                class="btn justify-start border py-3.5 text-left text-base"
                :class="
                  !answered
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                    : choice === current.answer
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : chosen === i
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-400'
                "
                :lang="current.dir === 'tr' ? 'hy' : undefined"
                @click="choose(i)"
              >
                <span class="kbd hidden sm:inline">{{ i + 1 }}</span>
                <span class="break-words">{{ choice }}</span>
              </button>
            </div>
            <button v-if="answered" class="btn btn-primary mt-3 w-full py-3" @click="next">
              Next <span class="kbd hidden border-indigo-300 bg-indigo-400 text-white sm:inline">Enter</span>
            </button>
          </template>

          <form v-else class="space-y-3" @submit.prevent="submitTyped">
            <ArmenianInput
              v-if="current.dir === 'tr'"
              ref="typeInput"
              v-model="typed"
              :readonly="answered"
              placeholder="Type the Armenian word…"
              input-class="text-lg sm:text-lg"
            />
            <input
              v-else
              ref="typeInput"
              v-model="typed"
              :readonly="answered"
              class="input text-lg sm:text-lg"
              placeholder="Type the translation…"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
            <div class="flex gap-2">
              <button v-if="answered && !last.correct" type="button" class="btn btn-outline" @click="markTypedCorrect">I was right</button>
              <button type="submit" class="btn btn-primary flex-1 py-3" :disabled="!answered && !typed.trim()">
                {{ answered ? 'Next' : 'Check' }} <span class="kbd hidden border-indigo-300 bg-indigo-400 text-white sm:inline">Enter</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>

    <!-- ───────────── Results ───────────── -->
    <template v-else-if="phase === 'done' && finishedRun">
      <div class="panel text-center">
        <div class="text-sm font-medium text-slate-500">{{ isRetry ? 'Mistakes retry' : 'Run' }} finished</div>
        <div class="mt-1 text-6xl font-bold tabular-nums" :class="pctClass(finishedRun.percent)">{{ finishedRun.percent }}%</div>
        <div class="mt-2 text-slate-600">
          {{ finishedRun.correct }} of {{ finishedRun.total }} correct · {{ formatDuration(finishedRun.durationMs) }}
        </div>
        <div class="mt-5 grid gap-2 sm:flex sm:justify-center">
          <button v-if="missed.length" class="btn btn-primary" @click="start(finishedRun.mistakes)">↻ Retry {{ finishedRun.mistakes.length }} mistake{{ finishedRun.mistakes.length === 1 ? '' : 's' }}</button>
          <button class="btn" :class="missed.length ? 'btn-soft' : 'btn-primary'" @click="start()">Run again</button>
          <button class="btn btn-outline" @click="phase = 'setup'">Change settings</button>
        </div>
      </div>

      <section v-if="missed.length" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="font-semibold text-slate-700">Review your mistakes ({{ missed.length }})</h2>
            <p class="text-xs text-slate-500">Try to recall the answer, then tap a card to check.</p>
          </div>
          <button class="btn btn-ghost shrink-0" @click="toggleAll">{{ allShown ? 'Hide all' : 'Show all' }}</button>
        </div>
        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="q in missed" :key="q.i">
            <button
              class="flex w-full items-center gap-3 rounded-2xl border bg-white/90 p-3 text-left shadow-sm transition hover:border-indigo-200"
              :class="shownAnswers.has(q.i) ? 'border-indigo-200' : 'border-slate-200/80'"
              :aria-expanded="shownAnswers.has(q.i)"
              @click="toggleAnswer(q.i)"
            >
              <CardThumb v-if="showImg(q)" :src="q.card.imageUrl" class="h-12 w-12 shrink-0 rounded-xl" />
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{{ sideLabel(q.dir, true) }}</div>
                <div class="text-lg font-medium break-words text-slate-800" :lang="q.dir === 'hy' ? 'hy' : undefined">{{ q.prompt }}</div>
                <div v-if="shownAnswers.has(q.i)" class="mt-1 border-t border-dashed border-slate-200 pt-1">
                  <span class="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{{ sideLabel(q.dir, false) }}</span>
                  <div class="text-lg font-medium break-words text-indigo-600" :lang="q.dir === 'tr' ? 'hy' : undefined">{{ q.answer }}</div>
                </div>
                <div v-else class="mt-1 text-xs text-indigo-500">Tap to show answer</div>
              </div>
            </button>
          </li>
        </ul>
      </section>
      <p v-else class="text-center text-sm text-emerald-600">No mistakes. Well done! 🎉</p>

      <div class="flex justify-center gap-2 text-sm">
        <RouterLink :to="{ name: 'stats', params: { id } }" class="btn btn-ghost">View statistics</RouterLink>
        <RouterLink :to="{ name: 'edit', params: { id } }" class="btn btn-ghost">Back to collection</RouterLink>
      </div>
    </template>
  </div>
</template>
