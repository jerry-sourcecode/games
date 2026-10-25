<script setup lang="ts">
import { computed } from "vue";
import { NButton, NModal } from "naive-ui";

export type GameResult = "win" | "lose";

const props = withDefaults(
	defineProps<{
		result: GameResult | null;
		/** 已进行的回合数 */
		rounds?: number;
		/** 当前好习惯数量 */
		good?: number;
		/** 当前坏习惯数量 */
		bad?: number;
		/** 棋盘总格数 */
		total?: number;
	}>(),
	{ rounds: 0, good: 0, bad: 0, total: 9 },
);

const show = defineModel<boolean>("show", { default: false });

const emit = defineEmits<{ restart: []; exit: [] }>();

const isWin = computed(() => props.result === "win");

const meta = computed(() =>
	isWin.value
		? {
				title: "你赢了",
				detail: "你成功将所有习惯变成了好习惯。",
				accent: "#34D399",
				accentSoft: "rgba(52,211,153,0.16)",
				accentLine: "rgba(52,211,153,0.32)",
				glyph: "✓",
				buttonLabel: "再来一局",
			}
		: {
				title: "你输了",
				detail: "坏习惯吞掉了整张棋盘。",
				accent: "#FB7185",
				accentSoft: "rgba(251,113,133,0.16)",
				accentLine: "rgba(251,113,133,0.32)",
				glyph: "✕",
				buttonLabel: "再来一局",
			},
);

const stats = computed(() => [
	{ label: "使用回合", value: `${props.rounds} 回合` },
	{ label: "好习惯", value: `${props.good} / ${props.total}` },
	{ label: "坏习惯", value: `${props.bad} / ${props.total}` },
]);

const restart = () => {
	show.value = false;
	emit("restart");
};

const exit = () => {
	show.value = false;
	emit("exit");
};
</script>

<template>
	<n-modal
		v-model:show="show"
		:mask-closable="false"
		:close-on-esc="false"
		:auto-focus="false"
		transform-origin="center">
		<div
			class="result-card w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] text-center">
			<div class="relative px-6 pt-8 pb-6">
				<div
					class="result-aura"
					aria-hidden="true"
					:style="{
						background: `radial-gradient(closest-side, ${meta.accentSoft}, transparent 72%)`,
					}" />

				<div class="relative flex flex-col items-center">
					<div
						class="result-badge grid h-16 w-16 place-items-center rounded-full text-2xl font-semibold"
						:style="{
							color: meta.accent,
							background: meta.accentSoft,
							boxShadow: `inset 0 0 0 1px ${meta.accentLine}, 0 0 44px -10px ${meta.accent}`,
						}"
						aria-hidden="true">
						{{ meta.glyph }}
					</div>

					<h2
						class="mt-2 text-2xl font-semibold tracking-tight text-white">
						{{ meta.title }}
					</h2>
					<p
						class="mt-2 max-w-[16rem] text-[12px] leading-5 text-white/45">
						{{ meta.detail }}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2 px-5">
				<div
					v-for="stat in stats"
					:key="stat.label"
					class="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-2.5">
					<p class="text-[10px] tracking-[0.14em] text-white/30">
						{{ stat.label }}
					</p>
					<p
						class="mt-1 text-[13px] font-medium text-white/85 tabular-nums">
						{{ stat.value }}
					</p>
				</div>
			</div>

			<footer
				class="mt-6 flex flex-col gap-2 border-t border-white/10 bg-black/20 px-5 py-4">
				<n-button
					block
					type="primary"
					strong
					:style="{
						'--n-color': meta.accent,
						'--n-color-hover': meta.accent,
					}"
					@click="restart">
					{{ meta.buttonLabel }}
				</n-button>
				<n-button block quaternary @click="exit">退出对局</n-button>
			</footer>
		</div>
	</n-modal>
</template>

<style scoped>
.result-card {
	box-shadow: 0 40px 100px -40px rgb(0 0 0 / 0.95);
}

.result-aura {
	position: absolute;
	inset: -30% -10% auto;
	height: 220px;
	border-radius: 999px;
	filter: blur(12px);
	opacity: 0.9;
	pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
	.result-badge {
		animation: result-pop 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.result-aura {
		animation: result-breathe 3.2s ease-in-out infinite;
	}
}

@keyframes result-pop {
	from {
		opacity: 0;
		transform: scale(0.82);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes result-breathe {
	0%,
	100% {
		opacity: 0.55;
	}
	50% {
		opacity: 1;
	}
}
</style>
