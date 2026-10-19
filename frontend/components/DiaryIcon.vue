<script setup>
defineProps({name:String});
const paths={search:'m21 21-4.35-4.35 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',note:'M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3 M16 3l5 5 M10 14l-1 4 4-1L22 8l-4-4Z',task:'M9 11l2 2 4-4 M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2',save:'M5 12l4 4L19 6',refresh:'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 7 M4 12l2 7a7 7 0 0 0 12-2',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',plus:'M12 5v14 M5 12h14',calendar:'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2'};
</script>
<template><svg class="diary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]||paths.note"/></svg></template>
