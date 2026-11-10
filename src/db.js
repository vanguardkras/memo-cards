import Dexie from 'dexie'

// IndexedDB database that lives only in this browser.
export const db = new Dexie('memo-cards')

db.version(1).stores({
  // collection: { id, name, description, createdAt, updatedAt, runSettings }
  collections: '++id, updatedAt',
  // card: { id, collectionId, armenian, translation, imageUrl, createdAt, correct, wrong, lastSeenAt }
  cards: '++id, collectionId',
  // run: { id, collectionId, startedAt, finishedAt, durationMs, total, correct, percent, settings, retry, mistakes }
  runs: '++id, collectionId, finishedAt',
})

export async function exportAll() {
  const [collections, cards, runs] = await Promise.all([
    db.collections.toArray(),
    db.cards.toArray(),
    db.runs.toArray(),
  ])
  return { app: 'memo-cards', version: 1, exportedAt: new Date().toISOString(), collections, cards, runs }
}

export async function exportCollection(id) {
  const [collection, cards, runs] = await Promise.all([
    db.collections.get(id),
    db.cards.where('collectionId').equals(id).toArray(),
    db.runs.where('collectionId').equals(id).toArray(),
  ])
  return { app: 'memo-cards', version: 1, exportedAt: new Date().toISOString(), collections: [collection], cards, runs }
}

/** Saves data as a .json file in the browser's downloads. */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const safeFilename = (name) =>
  (name || 'collection').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'collection'

/**
 * Imports a collection file or full backup. Every collection is added as a new
 * one (nothing is overwritten). Also accepts a bare array of
 * { armenian, translation, imageUrl } cards.
 */
export async function importAll(data, fallbackName = 'Imported collection') {
  if (Array.isArray(data)) {
    const now = Date.now()
    data = {
      app: 'memo-cards',
      collections: [{ id: 1, name: fallbackName, description: '', createdAt: now, updatedAt: now, runSettings: null }],
      cards: data.map((c) => ({ ...c, collectionId: 1 })),
      runs: [],
    }
  }
  if (data?.app !== 'memo-cards' || !Array.isArray(data.collections)) {
    throw new Error('This is not a Memo Cards backup file.')
  }
  const cards = data.cards || []
  const runs = data.runs || []
  await db.transaction('rw', db.collections, db.cards, db.runs, async () => {
    for (const { id: oldId, ...collection } of data.collections) {
      const newId = await db.collections.add({ ...collection, name: collection.name || fallbackName, updatedAt: Date.now() })
      const idMap = new Map()
      for (const { id: oldCardId, ...card } of cards.filter((c) => c.collectionId === oldId)) {
        if (!card.armenian || !card.translation) continue
        idMap.set(
          oldCardId,
          await db.cards.add({
            armenian: String(card.armenian).trim(),
            translation: String(card.translation).trim(),
            imageUrl: String(card.imageUrl || '').trim(),
            createdAt: card.createdAt || Date.now(),
            correct: card.correct || 0,
            wrong: card.wrong || 0,
            lastSeenAt: card.lastSeenAt || null,
            collectionId: newId,
          }),
        )
      }
      for (const { id: _ignored, ...run } of runs.filter((r) => r.collectionId === oldId)) {
        const mistakes = (run.mistakes || []).map((m) => idMap.get(m)).filter(Boolean)
        await db.runs.add({ ...run, collectionId: newId, mistakes })
      }
    }
  })
  return data.collections.length
}
