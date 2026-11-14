<script setup lang="ts">
import { computed } from "vue";
import PalmResources from "./palm-resources.vue";
import { toChips, type PalmCondition } from "./palm-chips";

const props = withDefaults(
	defineProps<{
		/** 花费：数组元素之间是「或」，元素内部是「且」 */
		cost: PalmCondition[];
		size?: "sm" | "xs";
	}>(),
	{ size: "sm" },
);

/** 每个「或」分支渲染成一组资源 */
const options = computed(() =>
	props.cost.map((option) => (toChips(option).length ? option : {})),
);
</script>

<template>
	<span class="inline-flex flex-wrap items-center gap-1">
		<span
			v-if="!cost.length"
			:class="[
				'rounded border border-emerald-300/30 bg-emerald-400/10 font-medium text-emerald-200',
				size === 'xs'
					? 'px-1 py-px text-[10px]'
					: 'px-1.5 py-0.5 text-[11px]',
			]">
			免费
		</span>
		<template v-for="(option, index) in options" :key="index">
			<span
				v-if="index > 0"
				class="text-[10px] text-white/25 select-none"
				aria-hidden="true">
				/
			</span>
			<PalmResources :items="option" :size="size" />
		</template>
	</span>
</template>
