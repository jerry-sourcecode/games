<script setup lang="ts">
import { computed } from "vue";
import RegicideCard from "./RegicideCard.vue";
import type { Card } from "../game/types";

const props = withDefaults(
	defineProps<{
		cards: Card[];
		selected: string[];
		disabledIds?: string[];
		tone?: "attack" | "defend";
		emptyText?: string;
		interactive?: boolean;
	}>(),
	{ disabledIds: () => [], tone: "attack", emptyText: "手牌已空", interactive: true },
);

const emit = defineEmits<{ pick: [id: string] }>();

const fan = computed(() => {
	const total = props.cards.length;
	const center = (total - 1) / 2;
	const spread = total > 1 ? Math.min(4.6, 30 / total) : 0;
	return (index: number) => {
		const offset = index - center;
		return {
			transform: `rotate(${(offset * spread).toFixed(2)}deg) translateY(${(offset * offset * 1.2).toFixed(2)}px)`,
			transformOrigin: "50% 130%",
		};
	};
});
</script>

<template>
	<div
		class="relative flex min-h-[96px] items-end justify-center px-0.5 pt-5 pb-1 sm:min-h-[116px]">
		<p
			v-if="!cards.length"
			class="pb-6 text-[12px] text-white/30">
			{{ emptyText }}
		</p>

		<div
			v-for="(card, index) in cards"
			:key="card.id"
			class="w-[62px] shrink-0 sm:w-[72px] lg:w-[84px]"
			:class="
				index === 0
					? ''
					: '-ml-[22px] sm:-ml-[20px] lg:-ml-[18px]'
			"
			:style="[fan(index), { zIndex: index }]">
			<RegicideCard
				:card="card"
				:selected="selected.includes(card.id)"
				:disabled="disabledIds.includes(card.id)"
				:tone="tone"
				:interactive="interactive"
				@pick="emit('pick', $event)" />
		</div>
	</div>
</template>
