# Memo Cards · Հայերեն

Flash cards for learning Armenian. Build your own collections (Armenian word, translation, optional image link) and test yourself.

**Live:** https://vanguardkras.github.io/memo-cards/

- **Collections:** create, rename, delete, export or import as JSON
- **Cards:** quick add (Enter to add), paste many at once, inline edit, a built-in Armenian on-screen keyboard
- **Runs:** choose what to show (Armenian, translation or mixed), how to answer (flip card, multiple choice, typing), whether to show images, and how many questions (default 15). There's also an option to favour cards you often miss.
- **Results:** score, retry mistakes, and review missed questions with tap-to-reveal answers
- **Statistics:** total runs, success rate, best and last run, history chart, accuracy per card

No accounts. All data is stored in the browser's IndexedDB.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

Stack: Vue 3, Vue Router (hash mode), Pinia, Dexie (IndexedDB), Tailwind CSS 4, Vite.
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
