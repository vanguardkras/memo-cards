<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCollectionsStore } from '../stores/collections'
import { useCardsStore } from '../stores/cards'
import { useRunsStore } from '../stores/runs'
import StatTile from '../components/StatTile.vue'
import CardThumb from '../components/CardThumb.vue'
import { runStats, pctClass, barClass, formatDate, formatDuration, cardAccuracy, PROMPT_LABELS, MODE_LABELS } from '../utils/format'

const props = defineProps({ id: { type: Number, required: true } })
const router = useRouter()
const collections = useCollectionsStore()
const cardsStore = useCardsStore()
const runsStore = useRunsStore()

const collection = ref(null)
const showAllRuns = ref(false)

onMounted(async () => {
  const c = await collections.get(props.id)
  if (!c) return router.replace('/')
  collection.value = c
  await Promise.all([cardsStore.load(props.id), runsStore.load(props.id)])
})

const stats = computed(() => runStats(runsStore.runs))
const chartRuns = computed(() => runsStore.runs.slice(0, 30).reverse())
const visibleRuns = computed(() => (showAllRuns.value ? runsStore.runs : runsStore.runs.slice(0, 10)))

const practiced = computed(() =>
  cardsStore.cards
    .filter((c) => cardAccuracy(c) !== null)
    .sort((a, b) => cardAccuracy(a) - cardAccuracy(b) || b.wrong - a.wrong),
)
const unpracticed = computed(() => cardsStore.cards.length - practiced.value.length)

async function clearStats() {
  if (!confirm('Delete all run history and reset per-card statistics for this collection? Cards are kept.')) return
  await runsStore.clear(props.id)
  await cardsStore.resetStats()
}
</script>

<template>
  <div v-if="collection" class="space-y-6">
    <RouterLink :to="{ name: 'edit', params: { id } }" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
      ← {{ collection.name }}
    </RouterLink>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-2xl font-bold tracking-tight text-slate-800">Statistics</h1>
      <RouterLink :to="{ name: 'run', params: { id } }" class="btn btn-primary">▶ New run</RouterLink>
    </div>

    <div v-if="!stats.total" class="panel py-10 text-center text-slate-500">
      No runs yet. Finish a run to see your progress here.
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total runs" :value="stats.total" :hint="`${stats.questions} questions answered`" />
        <StatTile label="Success rate" :value="stats.overall + '%'" :value-class="pctClass(stats.overall)" :hint="`${stats.correct} correct answers`" />
        <StatTile label="Best run" :value="stats.best + '%'" :value-class="pctClass(stats.best)" />
        <StatTile label="Last run" :value="stats.last + '%'" :value-class="pctClass(stats.last)" :hint="formatDate(stats.lastAt)" />
        <StatTile label="Time practiced" :value="formatDuration(stats.timeMs)" />
        <StatTile label="Cards practiced" :value="`${practiced.length} / ${cardsStore.cards.length}`" />
      </div>

      <section class="panel">
        <h2 class="mb-4 font-semibold text-slate-700">Recent runs <span class="font-normal text-slate-400">(success %, oldest → newest)</span></h2>
        <div class="flex h-36 items-end gap-1 border-b border-slate-200">
          <div
            v-for="r in chartRuns"
            :key="r.id"
            class="group relative flex h-full max-w-8 min-w-0 flex-1 items-end"
            :title="`${formatDate(r.finishedAt)} — ${r.percent}% (${r.correct}/${r.total})`"
          >
            <div class="w-full rounded-t-md opacity-80 transition group-hover:opacity-100" :class="barClass(r.percent)" :style="{ height: Math.max(r.percent, 3) + '%' }"></div>
          </div>
        </div>
        <div class="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>{{ formatDate(chartRuns[0].finishedAt) }}</span>
          <span>{{ formatDate(chartRuns[chartRuns.length - 1].finishedAt) }}</span>
        </div>
      </section>

      <section class="panel">
        <h2 class="mb-3 font-semibold text-slate-700">Run history</h2>
        <ul class="divide-y divide-slate-100">
          <li v-for="r in visibleRuns" :key="r.id" class="flex items-center gap-3 py-2.5">
            <div class="w-14 text-right text-lg font-semibold tabular-nums" :class="pctClass(r.percent)">{{ r.percent }}%</div>
            <div class="min-w-0 flex-1">
              <div class="text-sm text-slate-700">
                {{ r.correct }}/{{ r.total }} correct
                <span v-if="r.retry" class="chip ml-1">mistakes retry</span>
              </div>
              <div class="truncate text-xs text-slate-400">
                {{ PROMPT_LABELS[r.settings?.prompt] }} · {{ MODE_LABELS[r.settings?.mode] }} · {{ formatDuration(r.durationMs) }}
              </div>
            </div>
            <div class="shrink-0 text-right text-xs text-slate-400">{{ formatDate(r.finishedAt) }}</div>
          </li>
        </ul>
        <button v-if="runsStore.runs.length > 10" class="btn btn-ghost mt-2 w-full" @click="showAllRuns = !showAllRuns">
          {{ showAllRuns ? 'Show fewer' : `Show all ${runsStore.runs.length} runs` }}
        </button>
      </section>
    </template>

    <section v-if="practiced.length" class="panel">
      <h2 class="font-semibold text-slate-700">Cards by accuracy</h2>
      <p class="mb-3 text-xs text-slate-500">
        Hardest first.<template v-if="unpracticed"> {{ unpracticed }} card(s) not practiced yet.</template>
      </p>
      <ul class="space-y-2">
        <li v-for="c in practiced" :key="c.id" class="flex items-center gap-3">
          <CardThumb :src="c.imageUrl" class="h-9 w-9 shrink-0 rounded-lg" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate text-sm">
                <span class="font-medium text-slate-800" lang="hy">{{ c.armenian }}</span>
                <span class="text-slate-400"> — {{ c.translation }}</span>
              </span>
              <span class="shrink-0 text-xs font-semibold tabular-nums" :class="pctClass(cardAccuracy(c))">
                {{ cardAccuracy(c) }}% <span class="font-normal text-slate-400">({{ c.correct }}/{{ c.correct + c.wrong }})</span>
              </span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full" :class="barClass(cardAccuracy(c))" :style="{ width: cardAccuracy(c) + '%' }"></div>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <div v-if="stats.total || practiced.length" class="text-center">
      <button class="btn btn-danger text-xs" @click="clearStats">Reset statistics</button>
    </div>
  </div>
</template>
