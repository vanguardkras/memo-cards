export const DEFAULT_SETTINGS = {
  prompt: 'hy', // 'hy' show Armenian, 'tr' show translation, 'mixed'
  mode: 'flip', // 'flip' | 'choice' | 'type'
  showImage: true,
  count: 15,
  weakFirst: true,
}

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function normalize(s) {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Accepts the full answer or any variant separated by , ; / | */
export function checkTyped(input, answer) {
  const n = normalize(input)
  if (!n) return false
  if (normalize(answer) === n) return true
  return answer.split(/[,;/|]/).map(normalize).filter(Boolean).includes(n)
}

/** Higher = needs more practice. Unseen cards sit in the middle. */
function weakness(card) {
  const seen = (card.correct || 0) + (card.wrong || 0)
  if (!seen) return 0.6
  return ((card.wrong || 0) + 1) / (seen + 2)
}

/** Avoid the same card twice in a row where possible. */
function spreadRepeats(list) {
  const a = [...list]
  for (let i = 1; i < a.length; i++) {
    if (a[i].id !== a[i - 1].id) continue
    const j = a.findIndex((c, k) => k > i && c.id !== a[i - 1].id && (k + 1 >= a.length || a[k + 1].id !== a[i].id))
    if (j > -1) [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickCards(pool, count, weakFirst) {
  const picked = []
  while (picked.length < count) {
    let round = shuffle(pool)
    if (weakFirst) {
      round = round
        .map((c) => ({ c, k: weakness(c) + Math.random() * 0.35 }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.c)
    }
    picked.push(...round.slice(0, count - picked.length))
  }
  return spreadRepeats(shuffle(picked))
}

function buildChoices(answer, key, distractorPool) {
  const seen = new Set([normalize(answer)])
  const others = []
  for (const c of shuffle(distractorPool)) {
    const n = normalize(c[key])
    if (n && !seen.has(n)) {
      seen.add(n)
      others.push(c[key])
      if (others.length === 3) break
    }
  }
  return shuffle([answer, ...others])
}

/**
 * @param cards cards to ask about
 * @param settings run settings (count is the number of questions)
 * @param distractorPool cards used for wrong multiple-choice options
 */
export function buildQuiz(cards, settings, distractorPool = cards) {
  const pool = cards.filter((c) => c.armenian && c.translation)
  if (!pool.length) return []
  return pickCards(pool, Math.max(1, settings.count), settings.weakFirst).map((card) => {
    const dir = settings.prompt === 'mixed' ? (Math.random() < 0.5 ? 'hy' : 'tr') : settings.prompt
    const answerKey = dir === 'hy' ? 'translation' : 'armenian'
    const q = {
      card,
      dir,
      prompt: dir === 'hy' ? card.armenian : card.translation,
      answer: card[answerKey],
    }
    if (settings.mode === 'choice') q.choices = buildChoices(q.answer, answerKey, distractorPool)
    return q
  })
}
