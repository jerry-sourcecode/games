<script setup lang="ts">
import { computed } from "vue";
import FlipCard from "@/components/FlipCard.vue";
import { HabitCard } from "../modal/habitModal";
import { habitsText } from "../data/habitData";

const props = withDefaults(
	defineProps<{
		card: HabitCard;
		width?: number;
		height?: number;
		/** 是否被选中 */
		selected?: boolean;
		/** 当前悬停卡牌的影响范围命中此牌时，标记影响性质 */
		affected?: "good" | "bad" | null;
	}>(),
	{
		width: 180,
		height: 272,
		selected: false,
		affected: null,
	},
);

const emit = defineEmits<{
	select: [];
	hover: [];
	leave: [];
}>();

const isGood = computed(() => props.card.attu === "Good");

const textOf = (prefix: "a" | "b") => {
	const key = `${prefix}${props.card.variety}` as keyof typeof habitsText;
	return habitsText[key] ?? "";
};

const front = computed(() => ({
	image: `/habits/a${props.card.variety}.png`,
	label: textOf("a"),
}));

const back = computed(() => ({
	image: `/habits/b${props.card.variety}.png`,
	label: textOf("b"),
}));

const cardAriaLabel = computed(() => {
	const parts = [
		`习惯卡牌：${isGood.value ? front.value.label : back.value.label}`,
	];
	if (props.selected) parts.push("已选中");
	if (props.card.isTaged) parts.push("当前待处理");
	if (props.card.protected) parts.push("已保护");
	if (props.affected) parts.push("在影响范围内");
	return parts.join("，");
});

const onSelect = () => emit("select");
</script>

<template>
	<div
		class="habit-slot relative"
		:class="{
			'habit-slot--selected': selected,
			'habit-slot--affected': !selected && affected,
		}"
		:data-selected="selected ? '' : undefined"
		:style="{ width: `${props.width}px`, height: `${props.height}px` }"
		@pointerenter="emit('hover')"
		@pointerleave="emit('leave')"
		@click="onSelect"
		@keydown.enter.prevent="onSelect"
		@keydown.space.prevent="onSelect">
		<span v-if="selected" aria-hidden="true" class="habit-glow" />

		<FlipCard
			class="relative z-10 block"
			:aria-label="cardAriaLabel"
			axis="y"
			:flipped="!isGood"
			:flip-on-click="false"
			:draggable="false"
			:tilt-max="0"
			:hover-scale="1.02"
			:width="props.width"
			:height="props.height"
			:radius="14"
			:glare-opacity="0.14"
			:background="isGood ? '#f8f6e7' : '#010201'"
			:color="isGood ? '#010201' : '#fbfcfb'">
			<template #front>
				<div class="flex h-full flex-col">
					<img
						:src="front.image"
						:alt="front.label"
						draggable="false"
						class="block min-h-0 w-full flex-1 object-cover" />
					<p
						class="flex-none px-1.5 py-[7px] text-center text-[12px] leading-4 font-medium tracking-tight">
						{{ front.label }}
					</p>
				</div>
			</template>
			<template #back>
				<div class="flex h-full flex-col">
					<img
						:src="back.image"
						:alt="back.label"
						draggable="false"
						class="block min-h-0 w-full flex-1 object-cover" />
					<p
						class="flex-none px-1.5 py-[7px] text-center text-[12px] leading-4 font-medium tracking-tight">
						{{ back.label }}
					</p>
				</div>
			</template>
		</FlipCard>

		<!-- 被选中：呼吸外环 -->
		<span v-if="selected" aria-hidden="true" class="habit-ring habit-ring--selected" />

		<!-- 影响范围内：脉冲描边 -->
		<span
			v-if="affected"
			aria-hidden="true"
			class="habit-ring"
			:class="`habit-ring--${affected}`" />

		<!-- 当前待处理的牌：描边高亮 -->
		<span
			v-if="card.isTaged"
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 z-10 rounded-[14px] ring-2 ring-amber-400/85 shadow-[0_0_26px_-6px_rgba(251,191,36,0.8)]" />

		<!-- 当前待处理的牌：顶部标签 -->
		<span
			v-if="card.isTaged"
			class="pointer-events-none absolute -top-2.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] leading-3.5 font-semibold whitespace-nowrap text-amber-950 shadow-[0_6px_16px_-6px_rgba(251,191,36,0.95)]">
			<span
				aria-hidden="true"
				class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-950/70 motion-reduce:animate-none" />
			当前
		</span>

		<!-- 已保护的牌：盾牌角标 -->
		<span
			v-if="card.protected"
			title="已保护"
			class="pointer-events-none absolute -top-2 -right-2 z-20 grid h-6 w-6 place-items-center rounded-full border border-white/25 bg-sky-400 text-sky-950 shadow-[0_6px_16px_-6px_rgba(56,189,248,0.95)]">
			<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
				<path
					d="M12 2.6l7.2 3v6.1c0 4.3-3 7.9-7.2 9.3-4.2-1.4-7.2-5-7.2-9.3V5.6l7.2-3z"
					fill="currentColor" />
				<path
					d="M8.9 11.9l2.3 2.3 4.3-4.6"
					fill="none"
					stroke="#e0f2fe"
					stroke-width="1.9"
					stroke-linecap="round"
					stroke-linejoin="round" />
			</svg>
			<span class="sr-only">已保护</span>
		</span>
	</div>
</template>

<style scoped>
.habit-slot {
	transition:
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
		filter 320ms ease;
	will-change: transform;
}

.habit-slot--selected {
	transform: translateY(-8px) scale(1.045);
	z-index: 20;
}

.habit-slot--affected {
	transform: translateY(-4px) scale(1.015);
	z-index: 10;
}

.habit-glow {
	position: absolute;
	inset: -14%;
	border-radius: 28px;
	pointer-events: none;
	background: radial-gradient(closest-side, rgb(167 139 250 / 0.45), transparent 76%);
	filter: blur(10px);
	opacity: 0.9;
}

.habit-ring {
	position: absolute;
	inset: -3px;
	border-radius: 17px;
	pointer-events: none;
	z-index: 20;
	--ring: #34d399;
	box-shadow:
		0 0 0 2px var(--ring),
		0 0 22px -4px var(--ring);
}

.habit-ring--selected {
	--ring: #c4b5fd;
	inset: -4px;
	border-radius: 18px;
	box-shadow:
		0 0 0 3px var(--ring),
		0 0 30px 0 rgb(139 92 246 / 0.75);
}

.habit-ring--good {
	--ring: #34d399;
}

.habit-ring--bad {
	--ring: #fb7185;
}

@media (prefers-reduced-motion: no-preference) {
	.habit-glow {
		animation: habit-breathe 2.4s ease-in-out infinite;
	}

	.habit-ring {
		animation: habit-ring-pulse 1.6s ease-in-out infinite;
	}

	.habit-ring--selected {
		animation-name: habit-ring-selected;
		animation-duration: 2.4s;
	}
}

@keyframes habit-ring-selected {
	0%,
	100% {
		opacity: 1;
		box-shadow:
			0 0 0 3px var(--ring),
			0 0 24px 0 rgb(139 92 246 / 0.55);
	}
	50% {
		opacity: 0.72;
		box-shadow:
			0 0 0 3px var(--ring),
			0 0 36px 4px rgb(139 92 246 / 0.85);
	}
}

@keyframes habit-breathe {
	0%,
	100% {
		opacity: 0.5;
		transform: scale(0.96);
	}
	50% {
		opacity: 1;
		transform: scale(1.06);
	}
}

@keyframes habit-ring-pulse {
	0%,
	100% {
		opacity: 1;
		box-shadow:
			0 0 0 2px var(--ring),
			0 0 14px -4px var(--ring);
	}
	50% {
		opacity: 0.55;
		box-shadow:
			0 0 0 2px var(--ring),
			0 0 28px 2px var(--ring);
	}
}
</style>
