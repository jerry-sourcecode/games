<script setup lang="ts">
import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import Card from "@/habits/component/card.vue";
import StepPanel from "@/habits/component/step-panel.vue";
import DicePanel from "@/habits/component/dice-panel.vue";
import ResultDialog from "@/habits/component/result-dialog.vue";
import SkillPanel from "@/habits/component/skill-panel.vue";
import SkillSelectDialog from "@/habits/component/skill-select-dialog.vue";
import { habitSteps, habitsEffectRanges, useHabits } from "./data/habitData";
import { gameStart, resetGame } from "./game";
import { useHabitsRecord } from "./data/gameRecord";
import { HabitsResultRecord } from "./modal/habitModal";

/** 卡面图片原始尺寸（1347×1808），用于按比例换算卡片高度 */
const IMAGE_RATIO = 1347 / 1808;
/** 卡片底部文字块高度，与 card.vue 里的 py-[7px] + leading-4 对齐 */
const CAPTION_HEIGHT = 30;
const GAP = 12;
const MAX_CARD_WIDTH = 188;
const MIN_CARD_WIDTH = 84;

const boardRef = useTemplateRef<HTMLElement>("boardRef");

const cardWidth = ref(160);
const cardHeight = ref(
	Math.round(cardWidth.value / IMAGE_RATIO) + CAPTION_HEIGHT,
);

const habitsStates = useHabits();

habitsStates.states.init();

const cells = ref(
	[1, 2, 3].flatMap((row) =>
		[1, 2, 3].map((col) => habitsStates.states.getCard(row, col)),
	),
);

/** 交换会替换 Map 中的卡牌对象，需要重建格子列表 */
const refreshCells = () => {
	cells.value = [1, 2, 3].flatMap((row) =>
		[1, 2, 3].map((col) => habitsStates.states.getCard(row, col)),
	);
};

const currentStep = ref(0);

const emit = defineEmits<{ exit: [] }>();

/** 对局结束时弹出结算框 */
const resultShow = ref(false);
/** 尚未选取技能时弹出选取框，选定后才开始对局 */
const skillShow = ref(false);

const counts = computed(() => {
	let good = 0;
	let bad = 0;
	for (let i = 1; i <= 9; i++) {
		if (habitsStates.states.getCard(i).attu === "Good") good++;
		else bad++;
	}
	return { good, bad };
});

watch(
	() => habitsStates.result,
	(result) => {
		if (result) {
			const habitsRecord = useHabitsRecord();
			habitsRecord.result.push(
				new HabitsResultRecord(
					Date.now(),
					habitsStates.round,
					habitsStates.result!,
				),
			);
			resultShow.value = true;
		}
	},
);

/** 当前悬停的卡牌下标，用于预览影响范围 */
const hoverIdx = ref<number | null>(null);

/** 下标 → 该牌影响到的其他牌的 TONE */
const affectedTones = computed(() => {
	const map = new Map<number, "good" | "bad">();
	const idx = hoverIdx.value;
	const card = idx === null ? undefined : cells.value[idx];
	if (idx === null || !card) return map;

	const tone = card.attu === "Bad" ? "bad" : "good";
	const [row, col] = habitsStates.states.idxToPos(idx + 1);

	for (const [dr, dc] of habitsEffectRanges[card.toString()]) {
		const r = row + dr;
		const c = col + dc;
		if (r < 1 || r > 3 || c < 1 || c > 3) continue;

		const target = habitsStates.states.getCard(r, c);
		// 只影响对立面的卡牌：坏习惯只作用于好习惯，反之亦然
		if (target.attu === card.attu) continue;

		map.set(habitsStates.states.posToIdx([r, c]) - 1, tone);
	}
	return map;
});

const toneAt = (index: number) => affectedTones.value.get(index) ?? null;

const toggleSelect = (index: number) => {
	const idx = index + 1;

	// 标要：挑选候选卡牌 / III 级选择翻面目标
	if (habitsStates.markPicking) {
		habitsStates.toggleMarkPick(idx);
		return;
	}
	if (habitsStates.resolveMarkFlip(idx)) return;

	// 协防：已保护第一张，点击第二张好习惯完成额外保护
	const coverFrom = habitsStates.coverFrom;
	if (coverFrom != null) {
		const target = habitsStates.states.getCard(idx);
		if (idx === coverFrom || target.attu !== "Good" || target.protected)
			return;
		habitsStates.protectCard(idx);
		habitsStates.clearCover();
		habitsStates.step = 4;
		return;
	}

	const from = habitsStates.swapFrom;

	// 已支付交换的点数：点击第二张牌完成交换（乾坤挪移可纳入坏习惯）
	if (from != null) {
		if (idx === from) {
			habitsStates.cancelSwap();
			return;
		}
		if (!habitsStates.canSwapWith(idx)) return;

		const [r1, c1] = habitsStates.states.idxToPos(from);
		const [r2, c2] = habitsStates.states.idxToPos(idx);
		habitsStates.states.swap(r1, c1, r2, c2);
		habitsStates.swapPaid = null;
		habitsStates.swapFrom = null;
		habitsStates.swapBadLeft = 0;
		// 折冲 III：每回合首次交换的额外减费在本次交换完成后失效
		habitsStates.swapCount++;
		refreshCells();
		return;
	}

	habitsStates.selectedIdx = habitsStates.selectedIdx === idx ? null : idx;
};

const measure = () => {
	const el = boardRef.value;
	if (!el) return;

	const byWidth = (el.clientWidth - GAP * 2) / 3;

	// 桌面端再按视口高度收一次，保证九宫格能完整落在一屏内
	let byHeight = Number.POSITIVE_INFINITY;
	if (window.matchMedia("(min-width: 1024px)").matches) {
		const budget = window.innerHeight - el.getBoundingClientRect().top - 32;
		byHeight = ((budget - GAP * 2) / 3 - CAPTION_HEIGHT) * IMAGE_RATIO;
	}

	const lowerBound = Math.min(MIN_CARD_WIDTH, Math.floor(byWidth));
	const width = Math.max(
		lowerBound,
		Math.floor(Math.min(byWidth, byHeight, MAX_CARD_WIDTH)),
	);
	const height = Math.round(width / IMAGE_RATIO) + CAPTION_HEIGHT;

	if (width !== cardWidth.value) cardWidth.value = width;
	if (height !== cardHeight.value) cardHeight.value = height;
};

let observer: ResizeObserver | undefined;

onMounted(() => {
	measure();
	observer = new ResizeObserver(measure);
	if (boardRef.value) observer.observe(boardRef.value);
	window.addEventListener("resize", measure);

	// 技能选取完成前不启动游戏循环，避免抽骰和翻牌在选取期间发生
	if (habitsStates.loadout) {
		gameStart();
	} else {
		habitsStates.beginSkillSelection();
		skillShow.value = true;
	}
});

onBeforeUnmount(() => {
	observer?.disconnect();
	observer = undefined;
	window.removeEventListener("resize", measure);
});

/** 重开一局：重新洗牌并重建格子列表 */
const onRestart = () => {
	resetGame();
	refreshCells();
	gameStart();
};

/** 技能选取完成，正式开局 */
const onSkillsReady = () => {
	skillShow.value = false;
	gameStart();
};
</script>

<template>
	<div
		class="grid items-start gap-4 lg:grid-cols-[232px_minmax(0,1fr)_250px] lg:gap-5">
		<!-- 左栏：移动端拆成独立栅格项（contents），桌面端堆叠为固定列 -->
		<div
			class="contents lg:sticky lg:top-6 lg:col-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
			<DicePanel class="order-1 lg:order-none" />
			<SkillPanel class="order-4 lg:order-none" />
		</div>

		<div
			ref="boardRef"
			class="order-2 min-w-0 lg:order-none lg:col-start-2">
			<div
				class="mx-auto grid w-fit grid-cols-3"
				:style="{ gap: `${GAP}px` }">
				<Card
					v-for="(card, index) in cells"
					:key="index"
					:card="card"
					:width="cardWidth"
					:height="cardHeight"
					:selected="
						habitsStates.selectedIdx === index + 1 ||
						habitsStates.markPicked.includes(index + 1)
					"
					:affected="toneAt(index)"
					@select="toggleSelect(index)"
					@hover="hoverIdx = index"
					@leave="hoverIdx = hoverIdx === index ? null : hoverIdx" />
			</div>
		</div>

		<div
			class="order-3 min-w-0 lg:order-none lg:col-start-3 lg:sticky lg:top-6">
			<StepPanel v-model:active="currentStep" :steps="habitSteps" />
		</div>

		<ResultDialog
			v-model:show="resultShow"
			:result="habitsStates.result"
			:rounds="habitsStates.round"
			:good="counts.good"
			:bad="counts.bad"
			:total="9"
			@restart="onRestart"
			@exit="emit('exit')" />

		<SkillSelectDialog v-model:show="skillShow" @done="onSkillsReady" />
	</div>
</template>

<style scoped></style>
