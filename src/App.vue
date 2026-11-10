<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
        <RouterLink to="/" class="flex items-center gap-2.5 font-semibold text-slate-800">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-lg font-bold text-white shadow-sm">Ա</span>
          <span class="leading-tight">Memo Cards<span class="block text-xs font-normal text-slate-400">Հայերեն flash cards</span></span>
        </RouterLink>
        <RouterLink to="/" class="btn btn-ghost">Collections</RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-5 sm:py-8">
      <RouterView />
    </main>

    <footer class="px-4 pt-2 pb-6 text-center text-xs text-slate-400">
      Your cards and statistics are stored only in this browser. Export collections to keep a copy.
    </footer>
  </div>
</template>
