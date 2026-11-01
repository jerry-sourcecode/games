<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
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
/** 交换弹窗的合计费用 */
const dialogCost = ref(0);
/** 本次交换是否纳入坏习惯（乾坤挪移） */
const dialogWithBad = ref(false);

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

const btnDisabled = computed(
	() =>
		!canAct.value ||
		habits.swapFrom != null ||
		habits.moraleWaiting ||
		habits.markPicking ||
		habits.markFlipPending,
);

const swapDisabled = computed(
	() =>
		!habits.canStartSwap(habits.selectedIdx) ||
		habits.moraleWaiting ||
		habits.markPicking ||
		habits.markFlipPending,
);

function openDialog(mode: "use" | "swap", withBad?: boolean) {
	const idx = habits.selectedIdx;
	if (idx == null) return;
	const [row, col] = habits.states.idxToPos(idx);
	dialogTarget.row = row;
	dialogTarget.col = col;
	dialogMode.value = mode;
	// 乾坤挪移 II / III 级纳入坏习惯不额外收费，直接放开额度
	dialogWithBad.value =
		mode === "swap" && (withBad ?? habits.skillLevel("purge") >= 2);
	dialogCost.value = dialogWithBad.value
		? habits.swapCostWithBad
		: habits.swapCost;
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
		if (habits.states.getCard(r, c).attu === "Bad") habits.flipCard(r, c);
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

	// 交换：先记录第一张牌与已支付的点数，等待玩家点击另一张牌
	habits.beginSwap(idx, dialogWithBad.value);
	habits.swapPaid = [pays[0], pays[1]];
	habits.selectedIdx = null;
}

function onProtect() {
	const idx = habits.selectedIdx;
	if (idx == null) return;
	habits.protectCard(idx);
	habits.selectedIdx = null;

	// 协防：进入额外目标选择，选定后才结束回合
	if (habits.coverAvailable) {
		habits.coverFrom = idx;
		return;
	}
	habits.step = 4;
}

function onFeint() {
	habits.useFeint();
}

/** 预言按钮文案：未选点为「开始指定」，已选点则显示已指定 */
const anchorLabel = computed(() => {
	if (habits.anchorTarget != null) return "已指定落点";
	return `预言（剩 ${habits.anchorLeft} 次，${habits.anchorCost} 费）`;
});

/** 预言支付弹窗与「本次已支付」标记 */
const anchorShow = ref(false);
const anchorPaid = ref(false);

watch(anchorShow, (open) => {
	// 关闭弹窗但未确认支付 → 放弃已选落点
	if (!open && !anchorPaid.value && habits.anchorTarget != null) {
		habits.clearAnchorTarget();
	}
	anchorPaid.value = false;
});

/** 预言：以当前选中的卡牌作为落点，合法才进入支付 */
function onAnchor() {
	if (habits.anchorTarget != null) return;
	if (!habits.armAnchor(habits.selectedIdx)) return;
	anchorShow.value = true;
}

function onAnchorConfirm(pays: [number, number]) {
	habits.payDices([...pays]);
	habits.consumeAnchor([pays[0], pays[1]]);
	anchorPaid.value = true;
}

function onDoneCover() {
	habits.clearCover();
	habits.step = 4;
}

function onEndTurn() {
	habits.cancelSwap();
	habits.clearCover();
	habits.selectedIdx = null;
	habits.step = 4;
}

function cancelSwap() {
	habits.cancelSwap();
}

const canEndTurn = computed(
	() => habits.step === 3 && !habits.moraleWaiting && !markBusy.value,
);

/** 标要：正处于挑选 / 等待翻面目标的阶段 */
const markBusy = computed(() => habits.markPicking || habits.markFlipPending);

/** 标要：重要习惯的位置与剩余回合 */
const importantInfo = computed(() => {
	const idx = habits.importantIdx;
	if (idx == null) return null;
	const [row, col] = habits.states.idxToPos(idx);
	return { row, col, turns: habits.states.getCard(idx)?.importantTurns ?? 0 };
});

/** 标要：放弃本次翻面 */
function skipMarkFlip() {
	habits.markFlipPending = false;
	habits.markFlipNature = null;
	habits.markNotice = "已放弃本次翻面。";
}
</script>

<template>
	<aside
		class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur sm:p-5">
		<div
			v-if="habits.skillLevel('surge') > 0"
			class="mb-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.07] px-3 py-2">
			<div class="flex items-center justify-between gap-2">
				<p class="text-[10px] tracking-[0.16em] text-rose-300/70">
					狂战士
				</p>
				<span class="text-[10px] text-white/45 tabular-nums">
					怒气值：{{ habits.surgeRage }}
				</span>
			</div>
		</div>

		<div
			v-if="habits.skillLevel('mark') > 0 && habits.step === 3"
			class="mb-3 rounded-xl border border-violet-400/25 bg-violet-400/[0.07] px-3 py-2">
			<div class="flex items-center justify-between gap-2">
				<p class="text-[10px] tracking-[0.16em] text-violet-300/70">
					标要
				</p>
				<span
					v-if="habits.markPicking"
					class="text-[10px] text-white/45 tabular-nums">
					已选 {{ habits.markPicked.length }} /
					{{ habits.markPickCount }}
				</span>
				<span
					v-else-if="importantInfo"
					class="text-[10px] text-white/45 tabular-nums">
					剩 {{ importantInfo.turns }} 回合
				</span>
			</div>

			<template v-if="habits.markFlipPending">
				<p class="mt-1 text-[10.5px] leading-4 text-white/45">
					重要习惯已转为普通：点击 1 个{{
						habits.markFlipNature === "Good" ? "好习惯" : "坏习惯"
					}}翻面。
				</p>
				<n-button
					size="small"
					quaternary
					block
					class="mt-1.5"
					@click="skipMarkFlip">
					放弃翻面
				</n-button>
			</template>

			<template v-else-if="habits.markPicking">
				<p class="mt-1 text-[10.5px] leading-4 text-white/45">
					点击卡牌挑选 {{ habits.markPickCount }} 个候选，随机 1
					个成为重要习惯。
				</p>
				<div class="mt-1.5 flex flex-col gap-1.5">
					<n-button
						size="small"
						strong
						type="primary"
						block
						:disabled="
							habits.markPicked.length < habits.markPickCount
						"
						@click="habits.confirmMarkPick()">
						确认
					</n-button>
					<n-button
						size="small"
						quaternary
						block
						@click="habits.cancelMarkPick()">
						取消
					</n-button>
				</div>
			</template>

			<template v-else-if="importantInfo">
				<p class="mt-1 text-[10.5px] leading-4 text-white/45">
					第 {{ importantInfo.row }} 行第 {{ importantInfo.col }}
					列的习惯是重要习惯。
				</p>
			</template>

			<n-button
				v-else
				size="small"
				strong
				type="primary"
				block
				class="mt-1.5"
				:disabled="!habits.markAvailable"
				@click="habits.beginMarkPick()">
				标记重要习惯（选 {{ habits.markPickCount }} 个）
			</n-button>

			<p
				v-if="habits.markNotice"
				class="mt-1.5 text-[10.5px] leading-4 text-violet-100/70">
				{{ habits.markNotice }}
			</p>
		</div>
		<div v-if="habits.step === 3">
			<div
				v-if="habits.swapFrom != null"
				class="my-3 flex flex-col gap-2 rounded-xl border border-sky-400/25 bg-sky-400/[0.08] px-2 py-2.5">
				<p class="text-[11.5px] leading-5 text-sky-100/75">
					您已选中
					<b>{{
						habitsText[
							habits.states.getCard(habits.swapFrom).toString()
						]
					}}</b
					>，请点击另一张{{
						habits.swapBadLeft > 0 ? "好习惯或坏习惯" : "好习惯"
					}}与其交换{{
						habits.swapBadLeft > 0
							? `（本次可纳入 ${habits.swapBadLeft} 个坏习惯）`
							: ""
					}}。
				</p>
				<n-button size="small" quaternary block @click="cancelSwap">
					取消交换
				</n-button>
			</div>

			<div
				v-else-if="habits.coverFrom != null"
				class="my-3 flex flex-col gap-2 rounded-xl border border-sky-400/25 bg-sky-400/[0.08] px-3 py-2.5">
				<p class="text-[11.5px] leading-5 text-sky-100/75">
					协防：已保护
					<b>{{
						habitsText[
							habits.states.getCard(habits.coverFrom).toString()
						]
					}}</b
					>，请再点击一张好习惯作为额外保护目标。
				</p>
				<n-button size="small" quaternary block @click="onDoneCover">
					放弃额外保护
				</n-button>
			</div>

			<div
				v-else
				class="my-3 flex flex-col gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
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
					:disabled="swapDisabled"
					@click="openDialog('swap')">
					交换习惯（{{ habits.swapCost }} 点）
				</n-button>
				<n-button
					v-if="habits.skillLevel('purge') === 1"
					strong
					type="primary"
					block
					size="small"
					:disabled="swapDisabled"
					@click="openDialog('swap', true)">
					交换含坏习惯（{{ habits.swapCostWithBad }} 点）
				</n-button>
				<n-button
					v-if="habits.skillLevel('feint') > 0"
					strong
					type="primary"
					block
					size="small"
					:disabled="!habits.feintAvailable"
					@click="onFeint">
					诈降（剩 {{ habits.feintLeft }} 次）
				</n-button>
				<n-button
					v-if="habits.skillLevel('anchor') > 0"
					strong
					type="primary"
					block
					size="small"
					:disabled="!habits.anchorAvailable"
					@click="onAnchor">
					{{ anchorLabel }}
				</n-button>
				<n-button
					strong
					type="primary"
					block
					size="small"
					:disabled="btnDisabled"
					@click="onProtect">
					保护{{ habits.coverAvailable ? "（额外 +1）" : "" }}
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

			<p
				v-if="habits.enemySkip > 0"
				class="mb-2 rounded-xl border border-violet-400/25 bg-violet-400/[0.08] px-3 py-2 text-[11px] leading-5 text-violet-100/75">
				敌方将跳过其下一次行动回合{{
					habits.enemySkip > 1
						? `（累计 ${habits.enemySkip} 次）`
						: ""
				}}。
			</p>

			<p
				v-if="habits.surgeNotice"
				class="mb-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.08] px-3 py-2 text-[11px] leading-5 text-rose-100/80">
				{{ habits.surgeNotice }}
			</p>

			<p
				v-if="habits.vigilNotice"
				class="mb-2 rounded-xl border border-teal-400/25 bg-teal-400/[0.08] px-3 py-2 text-[11px] leading-5 text-teal-100/80">
				{{ habits.vigilNotice }}
			</p>

			<p
				v-if="
					habits.skillLevel('anchor') > 0 &&
					habits.anchorAvailable &&
					habits.anchorTarget == null
				"
				class="mb-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-[11px] leading-5 text-cyan-100/70">
				预言：先点击一张坏习惯卡牌，再点「预言」将其指定为敌方下一次标记的落点。
			</p>

			<p
				v-if="habits.anchorTarget != null"
				class="mb-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-[11px] leading-5 text-cyan-100/75">
				预言：敌方下一次标记将落在第
				{{ habits.states.idxToPos(habits.anchorTarget)[0] }} 行第
				{{ habits.states.idxToPos(habits.anchorTarget)[1] }} 列。
			</p>
		</div>

		<p
			v-if="habits.anchorNotice"
			class="mb-3 rounded-xl border border-rose-400/30 bg-rose-400/[0.1] px-3 py-2 text-[11px] leading-5 text-rose-100/85">
			{{ habits.anchorNotice }}
		</p>

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
									: 'text-white/60'
							">
							{{ step.title }}
						</span>
						<span
							v-if="index === habits.step"
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
			:cost="dialogCost"
			@confirm="onConfirm" />

		<DicePayDialog
			v-model:show="anchorShow"
			mode="anchor"
			:faces="habits.dices"
			:left="habits.dicesLeft"
			:cost="habits.anchorCost"
			@confirm="onAnchorConfirm" />
	</aside>
</template>
