import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { runStats } from '../utils/format'
import { cleanCard, newCard } from './cards'

export const useCollectionsStore = defineStore('collections', () => {
  const list = ref([])
  const loaded = ref(false)

  async function summarize(collection) {
    const [cardCount, runs] = await Promise.all([
      db.cards.where('collectionId').equals(collection.id).count(),
      db.runs.where('collectionId').equals(collection.id).toArray(),
    ])
    return { ...collection, cardCount, stats: runStats(runs) }
  }

  async function load() {
    const rows = await Promise.all((await db.collections.toArray()).map(summarize))
    rows.sort((a, b) => b.updatedAt - a.updatedAt)
    list.value = rows
    loaded.value = true
  }

  const get = (id) => db.collections.get(id)

  async function create({ name, description = '', cards = [] }) {
    const now = Date.now()
    const id = await db.collections.add({
      name: name.trim(),
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      runSettings: null,
    })
    if (cards.length) await db.cards.bulkAdd(cards.map((c) => newCard(id, cleanCard(c))))
    await load()
    return id
  }

  async function update(id, patch) {
    await db.collections.update(id, { ...patch, updatedAt: Date.now() })
    await load()
  }

  async function saveRunSettings(id, runSettings) {
    await db.collections.update(id, { runSettings })
  }

  async function remove(id) {
    await db.transaction('rw', db.collections, db.cards, db.runs, async () => {
      await db.cards.where('collectionId').equals(id).delete()
      await db.runs.where('collectionId').equals(id).delete()
      await db.collections.delete(id)
    })
    await load()
  }

  return { list, loaded, load, get, create, update, saveRunSettings, remove }
})
