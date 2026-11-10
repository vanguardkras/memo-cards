<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ src: { type: String, default: '' }, alt: { type: String, default: '' } })
const broken = ref(false)
watch(() => props.src, () => (broken.value = false))
</script>

<template>
  <img
    v-if="src && !broken"
    :src="src"
    :alt="alt"
    loading="lazy"
    referrerpolicy="no-referrer"
    class="bg-slate-100 object-cover"
    @error="broken = true"
  />
  <div v-else-if="src" class="grid place-items-center bg-slate-100 text-center text-[10px] leading-tight text-slate-400" title="Image failed to load">
    image<br />unavailable
  </div>
</template>
