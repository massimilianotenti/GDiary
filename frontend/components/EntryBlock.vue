<script setup>
// The rich editor remains an isolated DOM adapter during this migration.
// Vue owns the surrounding page, the adapter owns only this host's children.
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
const props=defineProps({block:Object,bridge:Object});
const emit=defineEmits(['changed']);
const host=ref();let mountedBlock;
function snapshot(){if(mountedBlock?.editor){mountedBlock.rich=mountedBlock.editor.blocks();mountedBlock.body=props.bridge.plain(mountedBlock.rich);}}
function rebuild(){snapshot();mountedBlock=props.block;host.value.replaceChildren(props.bridge.node(props.block));}
onMounted(rebuild);
watch(()=>props.block.updatedAt,()=>{if(!props.block.dirty)rebuild();});
onBeforeUnmount(()=>{snapshot();if(mountedBlock)delete mountedBlock.editor;});
</script>
<template><div ref="host" class="vue-entry-host" @input="emit('changed')" @change="emit('changed')" @click="emit('changed')"></div></template>
