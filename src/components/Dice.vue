<template>
	<Icon :icon="`bi:dice-${props.num}`" height="60" width="60" />
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
const props = defineProps({
	num: Number,
});
</script>

<style scoped></style>
