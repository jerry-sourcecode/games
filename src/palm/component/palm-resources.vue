<script setup lang="ts">
import { computed } from "vue";
import { toChips, type PalmCondition } from "./palm-chips";

const props = withDefaults(
	defineProps<{
		items: PalmCondition;
		/** 万能资源：支付时可当作任意一种资源 */
		wild?: number;
		size?: "sm" | "xs";
	}>(),
	{ size: "sm", wild: 0 },
);

const chips = computed(() => toChips(props.items));
const wildCount = computed(() => Math.max(0, props.wild ?? 0));
const chipClass = computed(() =>
	props.size === "xs" ? "px-1 py-px text-[10px]" : "px-1.5 py-0.5 text-[11px]",
);
</script>

<template>
	<span class="inline-flex flex-wrap items-center gap-1">
		<span
			v-for="chip in chips"
			:key="chip.item"
			:class="[
				'rounded border font-medium tabular-nums',
				chip.tone,
				chipClass,
			]">
			{{ chip.amount }}{{ chip.label }}
		</span>
		<span
			v-if="wildCount"
			:title="'万能资源：支付时可当作任意一种资源'"
			:class="[
				'rounded border border-fuchsia-300/40 bg-fuchsia-400/15 font-medium text-fuchsia-100 tabular-nums',
				chipClass,
			]">
			{{ wildCount }}万能
		</span>
		<span
			v-if="!chips.length && !wildCount"
			:class="[
				'rounded border border-white/10 bg-white/5 font-medium text-white/35',
				chipClass,
			]">
			无
		</span>
	</span>
</template>
