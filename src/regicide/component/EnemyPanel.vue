<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
	cardImage,
	ENEMY_TOTAL,
	ENEMY_TIER,
	enemyName,
	SUIT_META,
} from "../data/rules";
import type { Enemy } from "../game/types";

const props = defineProps<{
	enemy: Enemy;
	shield: number;
	defeated: number;
}>();

const meta = computed(() => SUIT_META[props.enemy.suit]);
const tier = computed(() => ENEMY_TIER[props.enemy.royal]);
const name = computed(() => enemyName(props.enemy.suit, props.enemy.royal));
const hpPercent = computed(() => (props.enemy.hp / props.enemy.maxHp) * 100);
const art = computed(() =>
	cardImage(props.enemy.card.suit, props.enemy.card.rank),
);

/** 掉血飘字 */
const floaters = ref<{ id: number; amount: number }[]>([]);
let floaterId = 0;
let lastHp = props.enemy.hp;

watch(
	() => props.enemy.hp,
	(hp) => {
		const diff = lastHp - hp;
		lastHp = hp;
		if (diff <= 0) return;
		const id = floaterId++;
		floaters.value.push({ id, amount: diff });
		setTimeout(() => {
			floaters.value = floaters.value.filter((item) => item.id !== id);
		}, 900);
	},
);

watch(
	() => props.enemy.card.id,
	() => {
		lastHp = props.enemy.hp;
		floaters.value = [];
	},
);
</script>

<template>
	<div
		class="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 sm:px-4 sm:py-4">
		<div
			class="pointer-events-none absolute inset-0"
			:style="{
				background: `radial-gradient(460px circle at 22% 0%, ${meta.color}26, transparent 68%)`,
			}" />

		<div class="relative flex items-start gap-3 sm:gap-5">
			<div class="relative shrink-0">
				<Transition name="enemy-swap" mode="out-in">
					<img
						:key="enemy.card.id"
						:src="art"
						:alt="name"
						class="block w-[92px] rounded-[11px] border border-white/20 object-cover shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)] sm:w-[118px]"
						draggable="false" />
				</Transition>

				<div
					class="pointer-events-none absolute inset-x-0 top-1 flex flex-col items-center">
					<span
						v-for="floater in floaters"
						:key="floater.id"
						class="enemy-floater text-xl font-black text-rose-300 drop-shadow-[0_2px_10px_rgba(244,63,94,0.65)]">
						-{{ floater.amount }}
					</span>
				</div>
			</div>

			<div class="min-w-0 flex-1">
				<p
					class="text-[10px] tracking-[0.28em] text-white/30 uppercase">
					第 {{ defeated + 1 }}/{{ ENEMY_TOTAL }} 名
				</p>

				<h2
					class="mt-1 flex items-center gap-2 text-lg font-semibold text-white sm:text-xl">
					{{ name }} {{ meta.symbol }}{{ enemy.royal }}
				</h2>

				<div class="mt-2.5">
					<div
						class="flex items-baseline justify-between text-[11px]">
						<span class="text-white/35">生命</span>
						<span
							class="font-semibold tabular-nums"
							:style="{ color: meta.color }">
							{{ enemy.hp }} / {{ enemy.maxHp }}
						</span>
					</div>
					<div
						class="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full transition-[width] duration-500 ease-out"
							:style="{
								width: `${hpPercent}%`,
								background: `linear-gradient(90deg, ${meta.color}, ${meta.color}b0)`,
								boxShadow: `0 0 12px ${meta.color}80`,
							}" />
					</div>
				</div>

				<div
					class="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
					<span
						class="inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-rose-200/90">
						反击伤害
						<b class="font-semibold tabular-nums">{{
							enemy.attack
						}}</b>
					</span>
					<span
						v-if="shield > 0"
						class="inline-flex items-center gap-1 rounded-md border border-indigo-400/35 bg-indigo-500/12 px-2 py-1 text-indigo-200/90">
						护盾
						<b class="font-semibold tabular-nums">{{ shield }}</b>
					</span>
				</div>

				<div class="mt-3 hidden items-center gap-[3px] sm:flex">
					<span
						v-for="step in ENEMY_TOTAL"
						:key="step"
						class="h-1.5 flex-1 rounded-full transition-colors duration-300"
						:class="
							step <= defeated
								? 'bg-white/55'
								: step === defeated + 1
									? 'bg-white/25'
									: 'bg-white/8'
						" />
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.enemy-floater {
	animation: enemy-float 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes enemy-float {
	0% {
		opacity: 0;
		transform: translateY(6px) scale(0.9);
	}
	25% {
		opacity: 1;
		transform: translateY(-2px) scale(1.05);
	}
	100% {
		opacity: 0;
		transform: translateY(-46px) scale(0.95);
	}
}

.enemy-swap-enter-active,
.enemy-swap-leave-active {
	transition:
		opacity 220ms ease,
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.enemy-swap-enter-from {
	opacity: 0;
	transform: translateY(14px) scale(0.94);
}

.enemy-swap-leave-to {
	opacity: 0;
	transform: translateY(-10px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
	.enemy-floater {
		animation-duration: 1ms;
	}

	.enemy-swap-enter-active,
	.enemy-swap-leave-active {
		transition: none;
	}
}
</style>
