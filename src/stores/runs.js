import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'

export const useRunsStore = defineStore('runs', () => {
  const runs = ref([]) // newest first

  async function load(collectionId) {
    const rows = await db.runs.where('collectionId').equals(collectionId).toArray()
    runs.value = rows.sort((a, b) => b.finishedAt - a.finishedAt)
  }

  async function save(run) {
    run.id = await db.runs.add(run)
    runs.value.unshift(run)
    return run
  }

  async function clear(collectionId) {
    await db.runs.where('collectionId').equals(collectionId).delete()
    runs.value = []
  }

  return { runs, load, save, clear }
})
