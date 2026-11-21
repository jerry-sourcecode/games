<script setup lang="ts">
import { computed } from "vue";
import PalmResources from "./palm-resources.vue";
import type { PalmCondition, PalmRich } from "./palm-chips";

const props = withDefaults(
	defineProps<{
		/** 纯文字，或文字与资源图标混排的数组 */
		value?: string | PalmRich | null;
		size?: "sm" | "xs";
	}>(),
	{ size: "xs" },
);

/** 统一成数组，方便模板里逐段渲染 */
const segments = computed<(string | PalmCondition)[]>(() => {
	const value = props.value;
	if (!value) return [];
	return typeof value === "string" ? [value] : value;
});
</script>

<template>
	<span class="whitespace-pre-wrap">
		<template v-for="(segment, index) in segments" :key="index">
			<PalmResources
				v-if="typeof segment !== 'string'"
				class="mx-0.5 align-middle"
				:items="segment"
				:size="size" />
			<template v-else>{{ segment }}</template>
		</template>
	</span>
</template>
