<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCollectionsStore } from '../stores/collections'
import { exportAll, exportCollection, importAll, downloadJson, safeFilename } from '../db'
import { SAMPLE_CARDS } from '../utils/sample'
import { pctClass, formatDate } from '../utils/format'

const store = useCollectionsStore()
const router = useRouter()

const showNew = ref(false)
const name = ref('')
const description = ref('')
const nameInput = ref(null)
const fileInput = ref(null)
const notice = ref(null) // { text, error }
let noticeTimer

onMounted(() => store.load())

function flash(text, error = false) {
  notice.value = { text, error }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 5000)
}

async function openNew() {
  showNew.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function create() {
  if (!name.value.trim()) return
  const id = await store.create({ name: name.value, description: description.value })
  name.value = ''
  description.value = ''
  showNew.value = false
  router.push({ name: 'edit', params: { id } })
}

async function addSample() {
  await store.create({ name: 'Armenian basics', description: 'Common everyday words to get started', cards: SAMPLE_CARDS })
  flash('Added “Armenian basics” with 25 words.')
}

async function remove(c) {
  const msg = `Delete “${c.name}” with ${c.cardCount} card(s) and all its statistics?\n\nThis cannot be undone. Export it first if you want a copy.`
  if (confirm(msg)) {
    await store.remove(c.id)
    flash(`Deleted “${c.name}”.`)
  }
}

async function exportOne(c) {
  downloadJson(await exportCollection(c.id), `${safeFilename(c.name)}.memo-cards.json`)
}

async function exportEverything() {
  downloadJson(await exportAll(), `memo-cards-backup-${new Date().toISOString().slice(0, 10)}.json`)
}

async function onImport(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const n = await importAll(JSON.parse(await file.text()), file.name.replace(/(\.memo-cards)?\.json$/i, ''))
    await store.load()
    flash(`Imported ${n} collection${n === 1 ? '' : 's'}.`)
  } catch (err) {
    flash(`Import failed: ${err.message}`, true)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Your collections</h1>
        <p class="mt-1 text-sm text-slate-500">Make your own word sets, then test yourself.</p>
      </div>
      <div class="flex w-full gap-2 sm:w-auto">
        <button class="btn btn-outline flex-1 sm:flex-none" @click="fileInput.click()">
          <span aria-hidden="true">⤒</span> Import
        </button>
        <button class="btn btn-primary flex-1 sm:flex-none" @click="openNew">+ New collection</button>
      </div>
      <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onImport" />
    </div>

    <Transition
      enter-from-class="opacity-0 -translate-y-1"
      enter-active-class="transition"
      leave-to-class="opacity-0"
      leave-active-class="transition"
    >
      <div
        v-if="notice"
        class="rounded-xl px-4 py-3 text-sm"
        :class="notice.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
      >
        {{ notice.text }}
      </div>
    </Transition>

    <form v-if="showNew" class="panel space-y-3" @submit.prevent="create">
      <h2 class="font-semibold text-slate-700">New collection</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="label" for="new-name">Name</label>
          <input id="new-name" ref="nameInput" v-model="name" class="input" placeholder="e.g. Food, Verbs, Lesson 3" />
        </div>
        <div>
          <label class="label" for="new-desc">Description <span class="font-normal text-slate-400">(optional)</span></label>
          <input id="new-desc" v-model="description" class="input" placeholder="What is this set about?" />
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost" @click="showNew = false">Cancel</button>
        <button type="submit" class="btn btn-primary" :disabled="!name.trim()">Create and add cards</button>
      </div>
    </form>

    <div v-if="store.loaded && !store.list.length" class="panel py-10 text-center">
      <div class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-3xl text-indigo-400">Ա</div>
      <h2 class="text-lg font-semibold text-slate-700">No collections yet</h2>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Create a collection and add Armenian words with their translation and an optional picture.
      </p>
      <div class="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <button class="btn btn-primary" @click="openNew">Create your first collection</button>
        <button class="btn btn-outline" @click="addSample">Add a sample set (25 words)</button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <article v-for="c in store.list" :key="c.id" class="panel flex flex-col gap-4 transition hover:shadow-md">
        <RouterLink :to="{ name: 'edit', params: { id: c.id } }" class="block min-w-0">
          <h2 class="truncate text-lg font-semibold text-slate-800">{{ c.name }}</h2>
          <p v-if="c.description" class="mt-0.5 line-clamp-2 text-sm text-slate-500">{{ c.description }}</p>
        </RouterLink>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="chip">{{ c.cardCount }} card{{ c.cardCount === 1 ? '' : 's' }}</span>
          <span class="chip">{{ c.stats.total }} run{{ c.stats.total === 1 ? '' : 's' }}</span>
          <span v-if="c.stats.total" class="chip">
            success&nbsp;<b :class="pctClass(c.stats.overall)">{{ c.stats.overall }}%</b>
          </span>
          <span v-if="c.stats.lastAt" class="text-slate-400">last {{ formatDate(c.stats.lastAt) }}</span>
        </div>

        <div class="mt-auto grid grid-cols-3 gap-2">
          <RouterLink
            :to="{ name: 'run', params: { id: c.id } }"
            class="btn btn-primary"
            :class="{ 'pointer-events-none opacity-50': !c.cardCount }"
          >
            ▶ Run
          </RouterLink>
          <RouterLink :to="{ name: 'edit', params: { id: c.id } }" class="btn btn-soft">Edit</RouterLink>
          <RouterLink :to="{ name: 'stats', params: { id: c.id } }" class="btn btn-outline">Stats</RouterLink>
        </div>
        <div class="-mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2">
          <button class="btn btn-ghost min-h-8 px-2.5 py-1 text-xs" @click="exportOne(c)">⤓ Export JSON</button>
          <button class="btn btn-danger min-h-8 px-2.5 py-1 text-xs" @click="remove(c)">Delete</button>
        </div>
      </article>
    </div>

    <div v-if="store.list.length" class="flex flex-col items-center gap-2 pt-2 text-center text-xs text-slate-400 sm:flex-row sm:justify-center">
      <button class="btn btn-ghost min-h-8 text-xs" @click="exportEverything">⤓ Back up all collections</button>
      <span class="hidden sm:inline">·</span>
      <button class="btn btn-ghost min-h-8 text-xs" @click="addSample">+ Add sample set</button>
    </div>
  </div>
</template>
