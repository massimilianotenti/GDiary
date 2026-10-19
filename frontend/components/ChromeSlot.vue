<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue';
const props=defineProps({bridge:Object,kind:String}),host=ref();
onMounted(()=>props.bridge.dock(host.value,props.kind));
onBeforeUnmount(()=>props.bridge.undock(host.value,props.kind));
</script>
<template><div ref="host" :class="'diary-'+kind+'-slot'"></div></template>
