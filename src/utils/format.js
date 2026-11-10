export const PROMPT_LABELS = {
  hy: 'Armenian → translation',
  tr: 'Translation → Armenian',
  mixed: 'Mixed directions',
}

export const MODE_LABELS = {
  flip: 'Flip cards',
  choice: 'Multiple choice',
  type: 'Type the answer',
}

export function pctClass(p) {
  if (p == null) return 'text-slate-400'
  if (p >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (p >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function barClass(p) {
  if (p >= 80) return 'bg-emerald-500'
  if (p >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}

export const formatDate = (ts) =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDuration(ms) {
  const s = Math.round((ms || 0) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h}h ${m}m`
  return m ? `${m}m ${s % 60}s` : `${s}s`
}

export function cardAccuracy(card) {
  const seen = (card.correct || 0) + (card.wrong || 0)
  return seen ? Math.round(((card.correct || 0) / seen) * 100) : null
}

export function runStats(runs) {
  if (!runs.length) {
    return { total: 0, overall: null, best: null, last: null, lastAt: null, questions: 0, correct: 0, timeMs: 0 }
  }
  const sorted = [...runs].sort((a, b) => a.finishedAt - b.finishedAt)
  const questions = sorted.reduce((s, r) => s + r.total, 0)
  const correct = sorted.reduce((s, r) => s + r.correct, 0)
  const lastRun = sorted[sorted.length - 1]
  return {
    total: sorted.length,
    overall: questions ? Math.round((correct / questions) * 100) : null,
    best: Math.max(...sorted.map((r) => r.percent)),
    last: lastRun.percent,
    lastAt: lastRun.finishedAt,
    questions,
    correct,
    timeMs: sorted.reduce((s, r) => s + (r.durationMs || 0), 0),
  }
}
