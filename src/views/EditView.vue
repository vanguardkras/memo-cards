<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCollectionsStore } from '../stores/collections'
import { useCardsStore } from '../stores/cards'
import { exportCollection, downloadJson, safeFilename } from '../db'
import ArmenianInput from '../components/ArmenianInput.vue'
import CardThumb from '../components/CardThumb.vue'
import { cardAccuracy, pctClass } from '../utils/format'
import { parseBulk } from '../utils/bulk'

const props = defineProps({ id: { type: Number, required: true } })
const router = useRouter()
const collections = useCollectionsStore()
const cardsStore = useCardsStore()

const collection = ref(null)
const name = ref('')
const description = ref('')

const emptyDraft = () => ({ armenian: '', translation: '', imageUrl: '' })
const draft = ref(emptyDraft())
const armInput = ref(null)
const justAdded = ref(null)

const search = ref('')
const editingId = ref(null)
const editDraft = ref(emptyDraft())

const showBulk = ref(false)
const bulkText = ref('')
const bulkCards = computed(() => parseBulk(bulkText.value))

onMounted(async () => {
  const c = await collections.get(props.id)
  if (!c) return router.replace('/')
  collection.value = c
  name.value = c.name
  description.value = c.description || ''
  await cardsStore.load(props.id)
  if (!cardsStore.cards.length) {
    await nextTick()
    armInput.value?.focus()
  }
})

async function saveMeta() {
  const n = name.value.trim()
  const d = description.value.trim()
  if (!n) {
    name.value = collection.value.name
    return
  }
  if (n === collection.value.name && d === (collection.value.description || '')) return
  await collections.update(props.id, { name: n, description: d })
  collection.value = { ...collection.value, name: n, description: d }
}

const norm = (s) => s.trim().toLowerCase()
const duplicate = computed(() => {
  const a = norm(draft.value.armenian)
  return !!a && cardsStore.cards.some((c) => norm(c.armenian) === a)
})
const canAdd = computed(() => draft.value.armenian.trim() && draft.value.translation.trim())

async function addCard() {
  if (!canAdd.value) return
  const card = await cardsStore.add(draft.value)
  justAdded.value = card.id
  setTimeout(() => justAdded.value === card.id && (justAdded.value = null), 1500)
  draft.value = emptyDraft()
  await nextTick()
  armInput.value?.focus()
}

async function addBulk() {
  if (!bulkCards.value.length) return
  await cardsStore.addMany(bulkCards.value)
  bulkText.value = ''
  showBulk.value = false
}

const filtered = computed(() => {
  const q = norm(search.value)
  const list = [...cardsStore.cards].reverse()
  if (!q) return list
  return list.filter((c) => c.armenian.toLowerCase().includes(q) || c.translation.toLowerCase().includes(q))
})

function startEdit(card) {
  editingId.value = card.id
  editDraft.value = { armenian: card.armenian, translation: card.translation, imageUrl: card.imageUrl || '' }
}

async function saveEdit() {
  if (!editDraft.value.armenian.trim() || !editDraft.value.translation.trim()) return
  await cardsStore.update(editingId.value, editDraft.value)
  editingId.value = null
}

async function removeCard(card) {
  if (confirm(`Delete card “${card.armenian} — ${card.translation}”?`)) await cardsStore.remove(card.id)
}

async function exportJson() {
  await saveMeta()
  downloadJson(await exportCollection(props.id), `${safeFilename(collection.value.name)}.memo-cards.json`)
}
</script>

<template>
  <div v-if="collection" class="space-y-5">
    <RouterLink to="/" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">← All collections</RouterLink>

    <!-- Collection header -->
    <section class="panel">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div class="min-w-0 flex-1 space-y-1">
          <input
            v-model="name"
            class="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 -ml-2 text-2xl font-bold text-slate-800 hover:border-slate-200 focus:border-indigo-300 focus:bg-white focus:outline-none"
            aria-label="Collection name"
            @blur="saveMeta"
            @keydown.enter.prevent="$event.target.blur()"
          />
          <input
            v-model="description"
            class="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 -ml-2 text-sm text-slate-500 hover:border-slate-200 focus:border-indigo-300 focus:bg-white focus:outline-none"
            placeholder="Add a description…"
            aria-label="Collection description"
            @blur="saveMeta"
            @keydown.enter.prevent="$event.target.blur()"
          />
        </div>
        <div class="grid grid-cols-3 gap-2 sm:flex">
          <RouterLink
            :to="{ name: 'run', params: { id } }"
            class="btn btn-primary"
            :class="{ 'pointer-events-none opacity-50': !cardsStore.cards.length }"
          >▶ Run</RouterLink>
          <RouterLink :to="{ name: 'stats', params: { id } }" class="btn btn-outline">Stats</RouterLink>
          <button class="btn btn-outline" title="Download this collection as a JSON file" @click="exportJson">⤓ Export</button>
        </div>
      </div>
    </section>

    <!-- Add card -->
    <form class="panel space-y-4" @submit.prevent="addCard">
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold text-slate-700">Add a card</h2>
        <button type="button" class="btn btn-ghost min-h-8 px-2.5 py-1 text-xs" @click="showBulk = !showBulk">
          {{ showBulk ? 'Single card' : 'Paste many at once' }}
        </button>
      </div>

      <template v-if="!showBulk">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label">Armenian word</label>
            <ArmenianInput ref="armInput" v-model="draft.armenian" placeholder="e.g. խնձոր" input-class="text-lg sm:text-lg" />
            <p v-if="duplicate" class="mt-1 text-xs text-amber-600">This word is already in the collection.</p>
          </div>
          <div>
            <label class="label" for="tr">Translation</label>
            <input id="tr" v-model="draft.translation" class="input text-lg sm:text-lg" placeholder="e.g. apple / яблоко" autocomplete="off" />
          </div>
        </div>
        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="label" for="img">Image link <span class="font-normal text-slate-400">(optional)</span></label>
            <input id="img" v-model="draft.imageUrl" type="url" inputmode="url" class="input" placeholder="https://…/picture.jpg" autocomplete="off" />
          </div>
          <CardThumb v-if="draft.imageUrl" :src="draft.imageUrl" class="h-11 w-11 shrink-0 rounded-lg" />
        </div>
        <div class="flex flex-col-reverse items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <p class="hidden text-xs text-slate-400 sm:block">Press <span class="kbd">Enter</span> to add. The cursor jumps back to the Armenian field.</p>
          <button type="submit" class="btn btn-primary" :disabled="!canAdd">+ Add card</button>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-slate-500">
          One card per line: <code class="rounded bg-slate-100 px-1">armenian - translation - image link</code>.
          You can also paste two or three columns from a spreadsheet, or use <code class="rounded bg-slate-100 px-1">;</code> as a separator.
        </p>
        <textarea
          v-model="bulkText"
          rows="7"
          class="input font-mono text-sm"
          placeholder="ջուր - water&#10;հաց - bread - https://example.com/bread.jpg&#10;տուն; house"
        ></textarea>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-slate-500">{{ bulkCards.length }} card{{ bulkCards.length === 1 ? '' : 's' }} recognised</span>
          <button type="button" class="btn btn-primary" :disabled="!bulkCards.length" @click="addBulk">Add {{ bulkCards.length || '' }} cards</button>
        </div>
      </template>
    </form>

    <!-- Card list -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold text-slate-700">
          Cards <span class="font-normal text-slate-400">({{ cardsStore.cards.length }})</span>
        </h2>
        <input v-if="cardsStore.cards.length > 5" v-model="search" type="search" class="input w-full sm:w-64" placeholder="Search cards…" />
      </div>

      <p v-if="!cardsStore.cards.length" class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
        No cards yet. Add your first word above.
      </p>
      <p v-else-if="!filtered.length" class="text-sm text-slate-400">Nothing matches “{{ search }}”.</p>

      <ul class="space-y-2">
        <li
          v-for="card in filtered"
          :key="card.id"
          class="rounded-2xl border bg-white/90 p-3 shadow-sm transition"
          :class="justAdded === card.id ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200/80'"
        >
          <form v-if="editingId === card.id" class="space-y-3" @submit.prevent="saveEdit" @keydown.esc="editingId = null">
            <div class="grid gap-3 sm:grid-cols-2">
              <ArmenianInput v-model="editDraft.armenian" placeholder="Armenian" />
              <input v-model="editDraft.translation" class="input" placeholder="Translation" />
            </div>
            <input v-model="editDraft.imageUrl" type="url" class="input" placeholder="Image link (optional)" />
            <div class="flex justify-end gap-2">
              <button type="button" class="btn btn-ghost" @click="editingId = null">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>

          <div v-else class="flex items-center gap-3">
            <CardThumb :src="card.imageUrl" class="h-12 w-12 shrink-0 rounded-xl" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-lg font-medium text-slate-800" lang="hy">{{ card.armenian }}</div>
              <div class="truncate text-sm text-slate-500">{{ card.translation }}</div>
            </div>
            <span
              v-if="cardAccuracy(card) !== null"
              class="hidden text-xs font-semibold tabular-nums sm:inline"
              :class="pctClass(cardAccuracy(card))"
              :title="`${card.correct} correct, ${card.wrong} wrong`"
            >{{ cardAccuracy(card) }}%</span>
            <div class="flex shrink-0">
              <button class="btn btn-ghost min-h-9 px-2.5" title="Edit" @click="startEdit(card)">✎</button>
              <button class="btn btn-danger min-h-9 px-2.5" title="Delete" @click="removeCard(card)">✕</button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
