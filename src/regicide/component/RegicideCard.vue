<script setup lang="ts">
import { computed } from "vue";
import { CARD_BACK, cardImage, cardLabel, SUIT_META } from "../data/rules";
import type { Card } from "../game/types";

const props = withDefaults(
	defineProps<{
		card: Card;
		selected?: boolean;
		disabled?: boolean;
		faceDown?: boolean;
		/** 出牌选中用金色高亮，抵挡弃牌用红色高亮 */
		tone?: "attack" | "defend";
		interactive?: boolean;
		/** 右上角的点数标签 */
		showValue?: boolean;
	}>(),
	{ tone: "attack", interactive: true, showValue: true },
);

const emit = defineEmits<{ pick: [id: string] }>();

const src = computed(() =>
	props.faceDown ? CARD_BACK : cardImage(props.card.suit, props.card.rank),
);

const alt = computed(() =>
	props.faceDown ? "牌背" : cardLabel(props.card.suit, props.card.rank),
);

const accent = computed(() =>
	props.tone === "defend" ? "#fb7185" : SUIT_META[props.card.suit].color,
);

const ring = computed(() =>
	props.selected
		? `0 0 0 2px ${accent.value}, 0 18px 32px -18px ${accent.value}`
		: "0 10px 22px -16px rgba(0, 0, 0, 0.9)",
);

function pick() {
	if (!props.interactive || props.disabled) return;
	emit("pick", props.card.id);
}
</script>

<template>
	<button
		type="button"
		class="group relative block w-full rounded-[9px] outline-none transition-[transform,box-shadow,filter] duration-200 focus-visible:ring-2 focus-visible:ring-white/70"
		:class="[
			disabled
				? 'cursor-not-allowed opacity-30 grayscale'
				: interactive
					? 'cursor-pointer hover:-translate-y-1.5'
					: 'cursor-default',
			selected ? '-translate-y-2.5 scale-[1.04]' : '',
		]"
		:style="{ boxShadow: ring }"
		:aria-pressed="selected"
		:aria-label="alt"
		:disabled="!interactive"
		@click="pick">
		<img
			:src="src"
			:alt="alt"
			:loading="faceDown ? 'lazy' : 'eager'"
			class="block aspect-[410/574] w-full rounded-[9px] object-cover"
			draggable="false" />

		<span
			v-if="showValue && !faceDown"
			class="pointer-events-none absolute top-1 right-1 rounded-full border border-white/25 bg-black/60 px-1.5 text-[10px] leading-[15px] font-semibold text-white/90 tabular-nums backdrop-blur-sm">
			{{ card.value }}
		</span>

		<span
			v-if="selected"
			class="pointer-events-none absolute inset-0 rounded-[9px]"
			:style="{ boxShadow: `inset 0 0 0 2px ${accent}`, background: `${accent}14` }" />
	</button>
</template>
