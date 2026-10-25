<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Dice from "@/components/Dice.vue";
import DicePayDialog from "./dice-pay-dialog.vue";
import {
	habitsEffectRanges,
	habitsText,
	useHabits,
	type HabitStep,
} from "../data/habitData";
import { NButton } from "naive-ui";

defineProps<{ steps: HabitStep[] }>();

const habits = useHabits();

const dialogShow = ref(false);
const dialogMode = ref<"use" | "swap">("use");
/** 打开弹窗时快照目标牌的坐标，避免关闭动画期间被清空 */
const dialogTarget = reactive({ row: 0, col: 0 });

const selectedCard = computed(() =>
	habits.selectedIdx == null
		? null
		: habits.states.getCard(habits.selectedIdx),
);

const canAct = computed(() => {
	if (habits.step !== 3 || habits.selectedIdx == null) return false;
	const card = habits.states.getCard(habits.selectedIdx);
	return !card.protected && card.attu === "Good";
});

const btnDisabled = computed(() => !canAct.value || habits.swapFrom != null);

function openDialog(mode: "use" | "swap") {
	const idx = habits.selectedIdx;
	if (idx == null) return;
	const [row, col] = habits.states.idxToPos(idx);
	dialogTarget.row = row;
	dialogTarget.col = col;
	dialogMode.value = mode;
	dialogShow.value = true;
}

/** 释放好习惯的影响：影响范围内的坏习惯翻回好习惯 */
function releaseEffect(idx: number) {
	const card = habits.states.getCard(idx);
	const [row, col] = habits.states.idxToPos(idx);
	for (const [dr, dc] of habitsEffectRanges[card.toString()]) {
		const r = row + dr;
		const c = col + dc;
		if (r < 1 || r > 3 || c < 1 || c > 3) continue;
		if (habits.states.getCard(r, c).attu === "Bad")
			habits.states.flip(r, c);
	}
}

function onConfirm(pays: [number, number]) {
	const idx = habits.selectedIdx;
	if (idx == null) return;
	habits.payDices([...pays]);
	habits.hasActed = true;

	if (dialogMode.value === "use") {
		releaseEffect(idx);
		habits.selectedIdx = null;
		return;
	}

	// 交换：先记录第一张牌与已支付的点数，等待玩家点击第二张好习惯
	habits.swapFrom = idx;
	habits.swapPaid = [pays[0], pays[1]];
	habits.selectedIdx = null;
}

function onProtect() {
	const idx = habits.selectedIdx;
	if (idx == null) return;
	habits.states.getCard(idx).protected = true;
	habits.selectedIdx = null;
	habits.step = 4;
}

function onEndTurn() {
	habits.cancelSwap();
	habits.selectedIdx = null;
	habits.step = 4;
}

function cancelSwap() {
	habits.cancelSwap();
}

const canEndTurn = computed(() => habits.step === 3);
</script>

<template>
	<aside
		class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur sm:p-5">
		<div v-if="habits.step == 2 || habits.step == 3">
			<h2 class="text-[13px] font-semibold tracking-wide text-white">
				投掷结果
			</h2>
			<div
				class="my-3 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
				<div
					v-for="(pt, i) in habits.dices"
					:key="i"
					class="flex flex-col items-center gap-0.5">
					<Dice :num="pt" />
					<span
						class="rounded-full bg-black/30 px-1.5 text-[10px] text-white/55 tabular-nums">
						剩 {{ habits.dicesLeft[i] ?? 0 }}
					</span>
				</div>
			</div>
		</div>

		<div v-if="habits.step === 3">
			<div
				v-if="habits.swapFrom != null"
				class="my-3 flex flex-col gap-2 rounded-xl border border-sky-400/25 bg-sky-400/[0.08] px-3 py-2.5">
				<p class="text-[11.5px] leading-5 text-sky-100/75">
					您已选中
					<b>{{
						habitsText[
							habits.states.getCard(habits.swapFrom).toString()
						]
					}}</b
					>，请点击另一张好习惯与其交换。
				</p>
				<n-button size="small" quaternary block @click="cancelSwap">
					取消交换
				</n-button>
			</div>

			<div
				v-else
				class="my-3 flex flex-col gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
				<p
					v-if="habits.selectedIdx != null"
					class="text-[11px] text-white/45">
					已选中：{{
						selectedCard?.attu === "Good" ? "好习惯" : "坏习惯"
					}}
				</p>
				<n-button
					strong
					type="primary"
					block
					size="small"
					:disabled="btnDisabled"
					@click="openDialog('use')">
					激活好习惯
				</n-button>
				<n-button
					strong
					type="primary"
					block
					size="small"
					:disabled="btnDisabled"
					@click="openDialog('swap')">
					交换习惯
				</n-button>
				<n-button
					strong
					type="primary"
					block
					size="small"
					:disabled="btnDisabled"
					@click="onProtect">
					保护
				</n-button>
				<n-button
					strong
					type="primary"
					block
					size="small"
					:disabled="!canEndTurn"
					@click="onEndTurn">
					结束回合
				</n-button>
			</div>
		</div>

		<div class="flex items-center justify-between gap-3">
			<h2 class="text-[13px] font-semibold tracking-wide text-white">
				游戏流程
			</h2>
			<span
				class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-white/45 tabular-nums">
				{{ Math.min(habits.step + 1, steps.length) }} /
				{{ steps.length }}
			</span>
		</div>

		<ol class="mt-3.5 -mx-1 space-y-0.5">
			<li v-for="(step, index) in steps" :key="step.title">
				<div
					:aria-current="index === habits.step ? 'step' : undefined"
					class="flex w-full gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none"
					:class="
						index === habits.step
							? 'bg-emerald-400/10'
							: 'opacity-80 hover:bg-white/[0.04]'
					">
					<span
						class="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tabular-nums"
						:class="
							index === habits.step
								? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-200'
								: 'border-white/15 bg-white/5 text-white/45'
						">
						{{ index + 1 }}
					</span>
					<span class="min-w-0">
						<span
							class="block text-[12px] leading-5 font-medium"
							:class="
								index === habits.step
									? 'text-white'
									: 'text-white/75'
							">
							{{ step.title }}
						</span>
						<span
							class="mt-0.5 block text-[11px] leading-[1.6] text-white/40">
							{{ step.detail }}
						</span>
					</span>
				</div>
			</li>
		</ol>

		<div
			v-if="steps[habits.step]?.tip"
			class="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
			<p class="text-[10px] tracking-[0.16em] text-emerald-300/70">
				提示
			</p>
			<p class="mt-1 text-[11.5px] leading-[1.65] text-emerald-50/60">
				{{ steps[habits.step]?.tip }}
			</p>
		</div>

		<DicePayDialog
			v-model:show="dialogShow"
			:mode="dialogMode"
			:faces="habits.dices"
			:left="habits.dicesLeft"
			:row="dialogTarget.row"
			:col="dialogTarget.col"
			@confirm="onConfirm" />
	</aside>
</template>
