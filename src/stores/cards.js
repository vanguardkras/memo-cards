import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'

export const cleanCard = (c) => ({
  armenian: (c.armenian || '').trim(),
  translation: (c.translation || '').trim(),
  imageUrl: (c.imageUrl || '').trim(),
})

export const newCard = (collectionId, data) => ({
  ...data,
  collectionId,
  createdAt: Date.now(),
  correct: 0,
  wrong: 0,
  lastSeenAt: null,
})

/** Cards of the collection that is currently open. */
export const useCardsStore = defineStore('cards', () => {
  const collectionId = ref(null)
  const cards = ref([])

  async function load(id) {
    collectionId.value = id
    cards.value = await db.cards.where('collectionId').equals(id).toArray()
  }

  const touch = () => db.collections.update(collectionId.value, { updatedAt: Date.now() })

  async function add(card) {
    const data = newCard(collectionId.value, cleanCard(card))
    data.id = await db.cards.add(data)
    cards.value.push(data)
    await touch()
    return data
  }

  async function addMany(list) {
    const rows = list.map((c) => newCard(collectionId.value, cleanCard(c)))
    const ids = await db.cards.bulkAdd(rows, { allKeys: true })
    rows.forEach((row, i) => (row.id = ids[i]))
    cards.value.push(...rows)
    await touch()
  }

  async function update(id, patch) {
    const data = cleanCard(patch)
    await db.cards.update(id, data)
    Object.assign(cards.value.find((c) => c.id === id) || {}, data)
    await touch()
  }

  async function remove(id) {
    await db.cards.delete(id)
    cards.value = cards.value.filter((c) => c.id !== id)
    await touch()
  }

  /** results: [{ cardId, correct }] */
  async function recordResults(results) {
    const now = Date.now()
    const byCard = new Map()
    for (const r of results) {
      const t = byCard.get(r.cardId) || { correct: 0, wrong: 0 }
      r.correct ? t.correct++ : t.wrong++
      byCard.set(r.cardId, t)
    }
    await db.transaction('rw', db.cards, async () => {
      for (const [id, t] of byCard) {
        const card = await db.cards.get(id)
        if (!card) continue
        await db.cards.update(id, {
          correct: (card.correct || 0) + t.correct,
          wrong: (card.wrong || 0) + t.wrong,
          lastSeenAt: now,
        })
      }
    })
    if (collectionId.value != null) await load(collectionId.value)
  }

  async function resetStats() {
    await db.cards.where('collectionId').equals(collectionId.value).modify({ correct: 0, wrong: 0, lastSeenAt: null })
    await load(collectionId.value)
  }

  return { collectionId, cards, load, add, addMany, update, remove, recordResults, resetStats }
})
