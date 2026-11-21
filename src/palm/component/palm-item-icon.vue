<script setup lang="ts">
import { computed } from "vue";
import { ITEM_IMG, ITEM_NAME, type PalmItem } from "./palm-chips";

const props = withDefaults(
	defineProps<{
		item: PalmItem;
		/** 数量；不传表示只显示图标 */
		amount?: number;
		size?: "sm" | "xs";
	}>(),
	{ size: "sm" },
);

const box = computed(() => (props.size === "xs" ? 18 : 22));

const badgeClass = computed(() =>
	props.size === "xs"
		? "h-3 min-w-3 px-0.5 text-[9px] -right-1"
		: "h-3.5 min-w-3.5 px-1 text-[10px] -right-1.5",
);

const title = computed(() =>
	props.amount
		? `${ITEM_NAME[props.item]} × ${props.amount}`
		: ITEM_NAME[props.item],
);
</script>

<template>
	<span
		class="relative inline-flex shrink-0 select-none items-center justify-center align-middle"
		:style="{ width: `${box}px`, height: `${box}px` }"
		:title="title">
		<img
			:src="ITEM_IMG[item]"
			:alt="ITEM_NAME[item]"
			draggable="false"
			class="h-full w-full object-contain" />
		<span
			v-if="amount"
			class="absolute -bottom-1 grid place-items-center rounded-full border border-black/50 bg-[#0b1220] font-semibold text-white tabular-nums shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
			:class="badgeClass">
			{{ amount }}
		</span>
	</span>
</template>
