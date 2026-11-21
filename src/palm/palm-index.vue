<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import PalmCardArea from "./component/palm-card-area.vue";
import PalmCost from "./component/palm-cost.vue";
import PalmModal from "./component/palm-modal.vue";
import PalmPayPicker from "./component/palm-pay-picker.vue";
import PalmResources from "./component/palm-resources.vue";
import PalmRichText from "./component/palm-rich-text.vue";
import type { PalmCondition, PalmItem } from "./component/palm-chips";
import {
	ACHIEVEMENT_HINT,
	ACHIEVEMENT_LAYOUT,
	achievementNos,
} from "./data/achievement";
import { orderSpec, type PalmOrder } from "./data/orders";
import { gradeOf, usePalmRecord } from "./data/palmRecord";
import { usePalmSave } from "./data/palmSave";
import {
	ROUNDS,
	STARTER_BONUS,
	TRACKER_NO,
	actionCostOf,
	abilityOf,
	contentAt,
	flippedArea,
	gainAt,
	gainOf,
	wildAt,
	wildOf,
	labelOf,
	otherAreasOf,
	relationLabel,
	repuAt,
	repuOf,
	rotatedArea,
	usePalm,
	type PalmAbility,
	type PalmActionKind,
	type PalmArea,
	type PalmCardInstance,
	type PalmCardSource,
} from "./game/palmStore";

const emit = defineEmits<{ exit: [] }>();

const palm = usePalm();
const palmSave = usePalmSave();
/** 重开确认框 */
const restartConfirm = ref(false);
/** 新局设置框 */
const settingsShow = ref(false);
/** 开局补给开关（写入本地设置，下次新局沿用） */
const starterOption = ref(false);
/** 村民扩展开关 */
const villagerOption = ref(false);
/** 手动勾选要加入牌库的功绩卡编号 */
const achievementOption = ref<number[]>([]);
/** 是否允许查看完整的牌库顺序 */
const peekAllOption = ref(false);
/** 订单扩展开关 */
const orderOption = ref(false);

/** 显示类设置：改完立即生效并保存，不用重开 */
function setPeekAll(value: boolean) {
	peekAllOption.value = value;
	palm.applySettings({ peekAll: value });
	palmSave.saveSettings({
		...palmSave.settings,
		starter: starterOption.value,
		villagers: villagerOption.value,
		achievements: [...achievementOption.value],
		peekAll: value,
		orders: orderOption.value,
	});
}

function toggleAchievement(no: number) {
	achievementOption.value = achievementOption.value.includes(no)
		? achievementOption.value.filter((item) => item !== no)
		: [...achievementOption.value, no].sort((a, b) => a - b);
}

const boardRef = ref<HTMLElement | null>(null);
const cardWidth = ref(280);
/** 三列模态框（预览 / 牌库顶）里的单卡宽度 */
const showcaseWidth = ref(300);
/** 旋转 / 翻面确认框里前后两张的宽度 */
const confirmWidth = ref(240);
const columns = ref(2);

/** 行动确认框：预览变更后的样子，并在同一个弹窗里选好支付资源 */
const actionSheet = ref<{
	index: number;
	kind: PalmActionKind;
	cost: PalmCondition[];
} | null>(null);
const picked = ref<string[]>([]);
/** 牌库顶 3 张的模态框 */
const peekShow = ref(false);
/** 是否开启「显示完整牌库顺序」 */
const peekAllEnabled = computed(() => palm.settings.peekAll);
/** 全牌库一览 */
const deckShow = ref(false);
/** 全牌库一览里每张牌的宽度 */
const deckCardWidth = ref(120);
/** 开局效果候选牌的宽度 */
const startCardWidth = ref(160);
/** 正在预览其余朝向的牌（按牌库顶下标 0 / 1） */
const previewIndex = ref<number | null>(null);

function togglePreview(index: number) {
	previewIndex.value = previewIndex.value === index ? null : index;
}

const AREA_NAME: Record<PalmArea, string> = {
	1: "正面 正向",
	2: "正面 旋转 180°",
	3: "反面 正向",
	4: "反面 旋转 180°",
};

/** 村民卡只有招募面与村民面两个朝向 */
const VILLAGER_AREA_NAME: Record<PalmArea, string> = {
	1: "招募面",
	2: "村民面",
	3: "招募面",
	4: "村民面",
};

/** 四朝向功绩卡：正面正向不参与玩法，从正面 180° 起手 */
const ACHIEVEMENT_QUAD_AREA_NAME: Record<PalmArea, string> = {
	1: "正面 正向",
	2: "正面 180°",
	3: "效果面",
	4: "效果面 180°",
};

const areaName = (
	card: { source: PalmCardSource; cardNo: number },
	area: PalmArea,
) => {
	if (card.source === "villager") return VILLAGER_AREA_NAME[area];
	if (card.source === "achievement") {
		return ACHIEVEMENT_LAYOUT[card.cardNo] === "quad"
			? ACHIEVEMENT_QUAD_AREA_NAME[area]
			: "效果面";
	}
	return AREA_NAME[area];
};

/** 哪些能力的机制已经实装（其余只在牌面上展示文字） */
const ABILITY_READY: Record<PalmAbility["id"], boolean> = {
	upgradeScore: true,
	storeLimit: true,
	discount: true,
	freeProduce: true,
};

/** 牌面能力摘要；null 表示这个朝向没有能力 */
function abilityInfo(cardNo: number, area: PalmArea, source: PalmCardSource) {
	const content = contentAt(source, cardNo, area);
	if (!content?.ability && !content?.note) return null;
	return {
		name: content?.name ?? null,
		note: content?.note ?? null,
		implemented: content?.ability
			? ABILITY_READY[content.ability.id]
			: true,
	};
}

/** 已经在场的村民（村民面且竖置） */
const villageCards = computed(() =>
	palm.deck.filter(
		(card) => card.source === "villager" && card.area === 2 && !card.stored,
	),
);

/** 预览模态框的说明文字：村民卡只有两面 */
const previewSubtitle = computed(() => {
	const current = previewCard.value;
	if (!current) return "";
	const name = areaName(current.card, current.card.area);
	if (current.card.source === "villager") {
		return `村民卡只有两面，当前位于「${name}」。`;
	}
	const rest = otherAreasOf(current.card).length;
	if (current.card.source === "achievement") {
		// 功绩卡的 a 面是解锁条件，本作不参与玩法
		return rest > 0
			? `功绩卡当前位于「${name}」，下面是另外 ${rest} 个朝向。`
			: `功绩卡只有这一面效果，当前位于「${name}」。`;
	}
	return `当前位于「${name}」，下面是另外 ${rest} 个朝向。`;
});

/** 牌库顶两张的展示数据 */
const topViews = computed(() =>
	palm.topCards.map((card, index) => ({
		card,
		index,
		label: labelOf(card),
		repu: repuOf(card),
		gain: gainOf(card),
		ability: abilityInfo(card.cardNo, card.area, card.source),
		actions: actionsOf(card),
		otherCount: otherAreasOf(card).length,
	})),
);

/** 牌库里这张牌是否有值得展示的资源/分数信息 */
function deckCardInfo(card: PalmCardInstance): boolean {
	return (
		Object.keys(gainOf(card)).length > 0 ||
		wildOf(card) > 0 ||
		repuOf(card) !== 0
	);
}

/**
 * 全牌库一览：按牌号排序，基础牌 1–16 在前，村民牌 1–7 其后，功绩牌最后。
 * 已结算的牌不再参与取牌循环，但仍然列在这里。
 */
const deckCards = computed(() =>
	[...palm.deck, ...palm.retiredCards]
		.filter((card) => card.cardNo !== TRACKER_NO)
		.slice()
		.sort((a, b) => {
			const rank = (card: PalmCardInstance) =>
				card.source === "villager"
					? 100 + card.cardNo
					: card.source === "achievement"
						? 200 + card.cardNo
						: card.cardNo;
			return rank(a) - rank(b);
		}),
);

/** 这张牌是否已经结算完毕、退出了取牌循环 */
const isRetired = (card: PalmCardInstance) =>
	palm.retiredCards.some((item) => item.uid === card.uid);

/** 开局效果：当前选中的牌 */
const startPick = ref<string | null>(null);

const startSubtitle = computed(() => {
	const task = palm.startTask;
	if (!task) return "";
	const action =
		task.kind === "upgrade"
			? "先选一张牌，再决定让它在同面旋转 180° 还是翻到另一面。"
			: "选出任意一张牌，它会被放到牌库的最前面（下一次就会用到它）。";
	const rest = palm.startTasks.length;
	return `还有 ${rest} 项开局效果待结算 · ${action} 结算后这张功绩卡会退出取牌循环，但仍留在牌库列表里。`;
});

/** 开局效果的候选牌 */
const startCandidates = computed(() => {
	const task = palm.startTask;
	if (!task) return [];
	const list =
		task.kind === "upgrade"
			? palm.deck.filter(
					(card) =>
						card.source === "basic" &&
						task.cardNos.includes(card.cardNo),
				)
			: palm.deck.filter(
					(card) =>
						card.cardNo !== TRACKER_NO &&
						card.source !== "achievement",
				);
	return list.map((card) => ({
		card,
		label: labelOf(card),
		area: areaName(card, card.area),
	}));
});

function pickStartCard(uid: string) {
	startPick.value = startPick.value === uid ? null : uid;
}

function applyStartUpgrade(kind: "rotate" | "flip") {
	const uid = startPick.value;
	if (!uid) return;
	if (palm.resolveStartUpgrade(uid, kind)) startPick.value = null;
}

function applyStartMove() {
	const uid = startPick.value;
	if (!uid) return;
	if (palm.resolveStartMove(uid)) startPick.value = null;
}

/** 行动确认框里展示的那张牌 */
const actionCard = computed(() => {
	const sheet = actionSheet.value;
	if (!sheet) return null;
	return palm.topCards[sheet.index] ?? null;
});

/** 这个行动会把牌换成哪个朝向；生产保持当前朝向 */
const actionTo = computed<PalmArea | null>(() => {
	const sheet = actionSheet.value;
	const card = actionCard.value;
	if (!sheet || !card) return null;
	if (sheet.kind === "rotate") return rotatedArea(card.area);
	if (sheet.kind === "flip") return flippedArea(card.area);
	return card.area;
});

/** 变更后朝向的产出与星星 */
const actionGain = computed(() => {
	const card = actionCard.value;
	const to = actionTo.value;
	if (!card || to === null) return {};
	return gainAt(card.cardNo, to, card.source);
});

const actionWild = computed(() => {
	const card = actionCard.value;
	const to = actionTo.value;
	if (!card || to === null) return 0;
	return wildAt({ ...card, area: to });
});

const actionRepu = computed(() => {
	const card = actionCard.value;
	const to = actionTo.value;
	if (!card || to === null) return 0;
	return repuAt(card.cardNo, to, card.source);
});

const previewCard = computed(() => {
	const index = previewIndex.value;
	if (index == null) return null;
	const card = palm.topCards[index];
	if (!card) return null;
	return { index, card };
});

/** 预览模态框里逐个列出其它朝向，以及抵达它们的行动与花费 */
const previewItems = computed(() => {
	const current = previewCard.value;
	if (!current) return [];
	const from = current.card.area;
	return otherAreasOf(current.card).map((area) => {
		const sameSide = from <= 2 === area <= 2;
		const sameHalf = from % 2 === area % 2;
		// 同面 = 一次旋转；异面同端 = 一次翻面；异面异端 = 翻面后再旋转
		const steps = sameSide || sameHalf ? 1 : 2;
		const kind: PalmActionKind = sameSide ? "rotate" : "flip";
		const content = contentAt(
			current.card.source,
			current.card.cardNo,
			area,
		);
		const cost =
			steps === 1
				? palm.costOf({ ...current.card, area: from }, kind)
				: null;
		return {
			area,
			kind,
			steps,
			cost,
			label: relationLabel(from, area),
			gain: gainAt(current.card.cardNo, area, current.card.source),
			wild: content?.produce?.wild ?? 0,
			repu: repuAt(current.card.cardNo, area, current.card.source),
			ability: abilityInfo(
				current.card.cardNo,
				area,
				current.card.source,
			),
			affordable: cost !== null && palm.canAfford(cost),
		};
	});
});

const ACTION_META: Record<
	PalmActionKind,
	{ label: string; dot: string; ring: string }
> = {
	produce: {
		label: "生产",
		dot: "bg-emerald-400",
		ring: "hover:border-emerald-400/50 hover:bg-emerald-400/[0.09]",
	},
	rotate: {
		label: "旋转 180°",
		dot: "bg-amber-400",
		ring: "hover:border-amber-400/50 hover:bg-amber-400/[0.09]",
	},
	flip: {
		label: "翻面",
		dot: "bg-sky-400",
		ring: "hover:border-sky-400/50 hover:bg-sky-400/[0.09]",
	},
};

const order: PalmActionKind[] = ["produce", "rotate", "flip"];

interface ActionView {
	kind: PalmActionKind;
	cost: PalmCondition[];
	affordable: boolean;
	blocked: boolean;
	blockReason: string | null;
	gain: PalmCondition;
	wild: number;
	/** 原花费非空时才提示减免 */
	showDiscount: boolean;
}

function actionsOf(card: PalmCardInstance | undefined): ActionView[] {
	if (!card || card.cardNo === 17) return [];
	const list: ActionView[] = [];
	for (const kind of order) {
		const raw = actionCostOf(card.cardNo, card.area, kind, card.source);
		const cost = palm.costOf(card, kind);
		if (cost === null) {
			// 被牌面条件挡住时仍然列出来，让玩家知道为什么用不了
			const reason = palm.blockedReason(card, kind);
			if (raw !== null && reason) {
				list.push({
					kind,
					cost: [],
					affordable: false,
					blocked: true,
					blockReason: reason,
					gain: {},
					wild: 0,
					showDiscount: false,
				});
			}
			continue;
		}
		const full = kind === "produce" && palm.storedCount >= palm.storeLimit;
		const affordable = palm.canAfford(cost) && !full;
		list.push({
			kind,
			cost,
			affordable,
			blocked: full,
			blockReason: full
				? `资源已满 ${palm.storeLimit} 张，先丢弃一张`
				: null,
			gain: gainOf(card),
			wild: card.stored ? wildOf(card) : wildAt(card),
			showDiscount:
				palm.discount > 0 &&
				Boolean(
					raw && raw.some((option) => Object.keys(option).length),
				),
		});
	}
	return list;
}

/** 打开行动确认框（预览 + 支付选择在同一个弹窗里） */
function openActionSheet(
	index: number,
	kind: PalmActionKind,
	cost: PalmCondition[],
) {
	actionSheet.value = { index, kind, cost };
	picked.value = cost.length ? (palm.findPayment(cost) ?? []) : [];
}

function pickAction(index: number, action: ActionView) {
	if (palm.gameOver) return;
	if (!action.affordable) return;

	// 旋转 / 翻面会改变牌面，一律先确认；生产只在需要付费时确认
	const needsConfirm = action.kind !== "produce" || action.cost.length > 0;
	if (!needsConfirm) {
		palm.perform(index, action.kind);
		return;
	}
	openActionSheet(index, action.kind, action.cost);
}

/** 行动弹窗的支付是否可确认 */
const paymentReady = computed(() => {
	const sheet = actionSheet.value;
	if (!sheet) return false;
	if (!sheet.cost.length) return true;
	return palm.canPay(picked.value, sheet.cost);
});

/** 确认执行：一次点击完成「预览确认 + 支付」 */
function confirmAction() {
	const sheet = actionSheet.value;
	if (!sheet || !paymentReady.value) return;
	palm.perform(sheet.index, sheet.kind, picked.value);
	actionSheet.value = null;
	picked.value = [];
}

/* ---------- 订单提交 ---------- */

/** 正在提交的订单编号 */
const orderSheet = ref<number | null>(null);
const orderPicked = ref<string[]>([]);

const orderSheetOrder = computed(() => {
	const no = orderSheet.value;
	if (no === null) return null;
	return palm.orders.find((order) => order.no === no) ?? null;
});

const orderSheetCost = computed<PalmCondition[]>(() => {
	const order = orderSheetOrder.value;
	return order ? palm.orderCost(order) : [];
});

const orderReady = computed(() => {
	const order = orderSheetOrder.value;
	if (!order) return false;
	return palm.canPay(orderPicked.value, orderSheetCost.value);
});

function openOrderSheet(order: PalmOrder) {
	orderSheet.value = order.no;
	orderPicked.value = palm.findPayment(palm.orderCost(order)) ?? [];
}

function closeOrderSheet() {
	orderSheet.value = null;
	orderPicked.value = [];
}

function confirmOrder() {
	const order = orderSheetOrder.value;
	if (!order || !orderReady.value) return;
	palm.submitOrder(order.no, orderPicked.value);
	closeOrderSheet();
}

function closeSheet() {
	actionSheet.value = null;
	picked.value = [];
}

function restart() {
	palm.start({
		starter: starterOption.value,
		villagers: villagerOption.value,
		achievements: [...achievementOption.value],
		peekAll: peekAllOption.value,
		orders: orderOption.value,
	});
	closeSheet();
	closeOrderSheet();
	peekShow.value = false;
	previewIndex.value = null;
	restartConfirm.value = false;
	settingsShow.value = false;
	palmSave.clear();
}

/** 打开新局设置框；已进行过回合时先确认丢弃进度 */
function openNewGame(force = false) {
	if (!force && palm.turn > 0 && !palm.gameOver) {
		restartConfirm.value = true;
		return;
	}
	restartConfirm.value = false;
	starterOption.value = palmSave.settings.starter;
	villagerOption.value = palmSave.settings.villagers;
	achievementOption.value = [...(palmSave.settings.achievements ?? [])];
	peekAllOption.value = palmSave.settings.peekAll;
	orderOption.value = palmSave.settings.orders;
	settingsShow.value = true;
}

/** 设置框里确认开新局：记住设置并重开 */
function startNewGame() {
	palmSave.saveSettings({
		starter: starterOption.value,
		villagers: villagerOption.value,
		achievements: [...achievementOption.value],
		peekAll: peekAllOption.value,
		orders: orderOption.value,
	});
	restart();
}

const canDiscard = computed(
	() => !palm.gameOver && palm.topCards[0]?.cardNo !== 17,
);

/** 撤回上一步 */
function undoStep() {
	if (!palm.canUndo) return;
	// 撤回会重建卡牌实例，之前选中的资源 uid 全部失效，相关面板需要关闭
	closeSheet();
	closeOrderSheet();
	previewIndex.value = null;
	palm.undo();
}

function measure() {
	const el = boardRef.value;
	if (!el) return;
	const avail = el.clientWidth;
	const gap = 16;
	const cols = avail >= 620 ? 2 : 1;
	columns.value = cols;
	const raw = cols === 2 ? (avail - gap) / 2 : avail;
	cardWidth.value = Math.max(150, Math.min(560, Math.floor(raw)));

	// 三列模态框（预览 / 牌库顶）：面板 1280 上限，左右各 20 内边距，两处 12 间距
	const wide = Math.min(1280, window.innerWidth - 48);
	showcaseWidth.value = Math.max(
		140,
		Math.min(400, Math.floor((wide - 40 - 24) / 3)),
	);

	// 旋转 / 翻面确认框：面板 760 上限，两列 + 中间箭头
	const narrow = Math.min(760, window.innerWidth - 48);
	confirmWidth.value = Math.max(
		120,
		Math.min(320, Math.floor((narrow - 40 - 24 - 24) / 2)),
	);

	// 全牌库一览：中图，一屏 6 列（预留滚动条与内边距）
	deckCardWidth.value = Math.max(
		140,
		Math.min(190, Math.floor((wide - 60 - 8 * 5) / 6)),
	);

	// 开局效果：候选牌要看清朝向，一屏 5 列
	startCardWidth.value = Math.max(
		150,
		Math.min(
			220,
			Math.floor((Math.min(1100, window.innerWidth - 48) - 60) / 5),
		),
	);
}

let observer: ResizeObserver | undefined;

onMounted(() => {
	palmSave.loadSettings();
	starterOption.value = palmSave.settings.starter;
	villagerOption.value = palmSave.settings.villagers;
	achievementOption.value = [...(palmSave.settings.achievements ?? [])];
	peekAllOption.value = palmSave.settings.peekAll;
	orderOption.value = palmSave.settings.orders;
	// 有存档就接着上局，否则开新局并让玩家选择开局设置
	const saved = palmSave.load();
	// 显示类设置不存进对局存档，恢复后要同步到运行中的 store
	palm.applySettings({ peekAll: palmSave.settings.peekAll });
	if (!saved || !palm.importSave(saved)) {
		palm.start({
			starter: starterOption.value,
			villagers: villagerOption.value,
			achievements: [...achievementOption.value],
			peekAll: peekAllOption.value,
			orders: orderOption.value,
		});
		settingsShow.value = true;
	}
	measure();
	observer = new ResizeObserver(measure);
	if (boardRef.value) observer.observe(boardRef.value);
	window.addEventListener("resize", measure);
});

onBeforeUnmount(() => {
	observer?.disconnect();
	observer = undefined;
	window.removeEventListener("resize", measure);
});

/** 本局评价 */
const grade = computed(() => gradeOf(palm.score));

/** 自动存档：每次状态变化后写入；本局结束时清掉存档 */
watch(
	() => palm.revision,
	() => {
		if (!palm.deck.length) return;
		if (palm.gameOver) {
			palmSave.clear();
			return;
		}
		palmSave.save(palm.exportSave());
	},
);

watch(
	() => palm.gameOver,
	(over) => {
		if (!over) return;
		usePalmRecord().add({
			time: Date.now(),
			score: palm.score,
			upgrades: palm.upgrades,
			grade: grade.value,
			turns: palm.turn,
			replay: palm.replaySteps(),
		});
	},
);

/** 存档并退出 */
function saveAndExit() {
	if (!palm.gameOver && palm.deck.length) {
		palmSave.save(palm.exportSave());
	}
	emit("exit");
}
</script>

<template>
	<div class="relative">
		<header
			class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur">
			<div class="flex flex-wrap items-center gap-x-5 gap-y-1.5">
				<div class="flex items-baseline gap-1.5">
					<span class="text-[10px] tracking-[0.16em] text-white/30">
						轮次
					</span>
					<span
						class="text-[15px] font-semibold text-white tabular-nums">
						{{ palm.round }} / {{ ROUNDS }}
					</span>
				</div>
				<div class="flex items-baseline gap-1.5">
					<span class="text-[10px] tracking-[0.16em] text-white/30">
						回合
					</span>
					<span
						class="text-[15px] font-semibold text-white tabular-nums">
						{{ palm.turn }}
					</span>
				</div>
				<div class="flex items-baseline gap-1.5">
					<span class="text-[10px] tracking-[0.16em] text-white/30">
						当前分数
					</span>
					<span
						class="text-[15px] font-semibold text-sky-300 tabular-nums">
						{{ palm.score }}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<span
					v-if="palmSave.savedAt && !palm.gameOver"
					:title="`存档时间 ${new Date(palmSave.savedAt).toLocaleTimeString()}`"
					class="hidden items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[10.5px] text-emerald-200/80 sm:inline-flex">
					<span
						aria-hidden="true"
						class="h-1 w-1 rounded-full bg-emerald-400" />
					已自动存档
				</span>
				<button
					type="button"
					class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/60 transition-colors enabled:hover:border-white/25 enabled:hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35"
					:disabled="!palm.canUndo"
					:title="palm.canUndo ? '回到上一步' : '没有可以撤回的步骤'"
					@click="undoStep">
					撤回
				</button>
				<button
					type="button"
					class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
					@click="peekShow = true">
					{{ peekAllEnabled ? "查看完整顺序" : "牌库顶 3 张" }}
				</button>
				<button
					type="button"
					class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
					@click="openNewGame()">
					重开
				</button>
				<button
					type="button"
					class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
					@click="saveAndExit">
					{{ palm.gameOver ? "退出" : "存档并退出" }}
				</button>
			</div>
		</header>

		<div class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
			<!-- 牌库顶两张 -->
			<section
				ref="boardRef"
				class="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur sm:p-4">
				<div class="flex items-center justify-between gap-2">
					<h2
						class="text-[13px] font-semibold tracking-wide text-white">
						牌库顶
					</h2>
					<span class="text-[10.5px] text-white/30">
						对第 1 或第 2 张执行 1 个行动
					</span>
				</div>

				<div
					class="mt-3 grid gap-4"
					:style="{
						gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
					}">
					<article
						v-for="view in topViews"
						:key="view.card.uid"
						class="flex min-w-0 flex-col items-center gap-2">
						<div
							class="flex w-full items-center justify-between gap-2">
							<span
								class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-white/45 tabular-nums">
								第 {{ view.index + 1 }} 张 · {{ view.label }}
							</span>
							<span
								v-if="view.repu > 0"
								class="rounded-full border border-amber-300/30 bg-amber-400/12 px-2 py-0.5 text-[10.5px] font-medium text-amber-200 tabular-nums">
								★ {{ view.repu }}
							</span>
							<span
								v-else-if="view.repu < 0"
								class="rounded-full border border-rose-300/30 bg-rose-400/12 px-2 py-0.5 text-[10.5px] font-medium text-rose-200 tabular-nums">
								★ {{ view.repu }}
							</span>
						</div>

						<PalmCardArea
							class="border border-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
							:card-no="view.card.cardNo"
							:source="view.card.source"
							:area="view.card.area"
							:width="cardWidth" />

						<div
							v-if="view.ability"
							class="w-full rounded-xl border px-2.5 py-1.5"
							:class="
								view.ability.implemented
									? 'border-violet-400/30 bg-violet-400/[0.08]'
									: 'border-white/10 bg-white/[0.03]'
							">
							<div class="flex items-center gap-1.5">
								<span
									class="text-[10.5px] font-medium text-violet-200/80">
									能力
								</span>
								<span
									v-if="!view.ability.implemented"
									class="rounded border border-white/15 px-1 text-[9.5px] text-white/35">
									未实装
								</span>
							</div>
							<p
								class="mt-0.5 text-[10.5px] leading-4 text-white/55">
								<PalmRichText :value="view.ability.note" />
							</p>
						</div>

						<div class="flex w-full flex-col gap-1.5">
							<button
								v-for="action in view.actions"
								:key="action.kind"
								type="button"
								class="flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
								:class="
									action.affordable
										? [
												'border-white/12 bg-white/[0.04]',
												ACTION_META[action.kind].ring,
											]
										: 'cursor-not-allowed border-white/10 bg-white/[0.02] opacity-55'
								"
								:disabled="!action.affordable"
								:title="action.blockReason ?? undefined"
								@click="pickAction(view.index, action)">
								<span class="flex items-center gap-1.5">
									<span
										aria-hidden="true"
										class="h-1.5 w-1.5 rounded-full"
										:class="ACTION_META[action.kind].dot" />
									<span
										class="text-[12px] font-medium text-white/85">
										{{ ACTION_META[action.kind].label }}
									</span>
								</span>
								<span class="flex items-center gap-1.5">
									<span
										v-if="action.showDiscount"
										class="rounded border border-violet-300/40 bg-violet-400/15 px-1 py-px text-[9.5px] text-violet-100"
										:title="`村民能力：每种资源消耗 -${palm.discount}`">
										-{{ palm.discount }}
									</span>
									<PalmCost :cost="action.cost" size="xs" />
									<template v-if="action.kind === 'produce'">
										<span class="text-[10px] text-white/30"
											>→</span
										>
										<PalmResources
											:items="action.gain"
											:wild="action.wild"
											size="xs" />
									</template>
								</span>
							</button>

							<button
								v-if="view.index === 0"
								type="button"
								class="flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
								:class="
									canDiscard
										? 'border-white/12 bg-white/[0.04] hover:border-rose-400/50 hover:bg-rose-400/[0.09]'
										: 'cursor-not-allowed border-white/10 bg-white/[0.02] opacity-55'
								"
								:disabled="!canDiscard"
								@click="palm.discardTop()">
								<span class="flex items-center gap-1.5">
									<span
										aria-hidden="true"
										class="h-1.5 w-1.5 rounded-full bg-rose-400" />
									<span
										class="text-[12px] font-medium text-white/85">
										弃掉这张
									</span>
								</span>
								<span
									class="flex items-center gap-1 text-[10px] text-white/30">
									→ 牌库底
								</span>
							</button>

							<button
								v-if="view.otherCount > 0"
								type="button"
								class="rounded-xl border border-dashed border-white/12 px-2.5 py-1.5 text-[11px] text-white/45 transition-colors hover:border-sky-400/40 hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:outline-none"
								:aria-haspopup="'dialog'"
								@click="togglePreview(view.index)">
								{{
									view.otherCount > 1
										? `预览其余 ${view.otherCount} 个朝向`
										: "预览另一面"
								}}
							</button>
						</div>
					</article>
				</div>

				<p
					v-if="palm.lastEvent"
					class="mt-3 text-[11px] leading-4 text-white/35">
					上次行动：{{ palm.lastEvent }}
				</p>
			</section>

			<!-- 侧栏 -->
			<aside class="flex min-w-0 flex-col gap-3">
				<section
					v-if="villageCards.length"
					class="rounded-2xl border border-violet-400/25 bg-violet-400/[0.06] p-3 backdrop-blur">
					<div class="flex items-center justify-between gap-2">
						<h2 class="text-[12.5px] font-semibold text-violet-100">
							村民
						</h2>
						<span
							class="text-[10.5px] text-violet-200/50 tabular-nums">
							{{ villageCards.length }}
						</span>
					</div>
					<ul class="mt-2 flex flex-col gap-1.5">
						<li
							v-for="card in villageCards"
							:key="card.uid"
							class="rounded-xl border px-2.5 py-1.5"
							:class="
								card.activated
									? 'border-emerald-400/40 bg-emerald-400/[0.08]'
									: 'border-white/10 bg-white/[0.03]'
							">
							<div
								class="flex items-center justify-between gap-2">
								<span class="text-[11.5px] text-white/70">
									{{ labelOf(card) }}
								</span>
								<span
									v-if="repuOf(card) !== 0"
									class="text-[10.5px] text-amber-200/80 tabular-nums">
									★ {{ repuOf(card) }}
								</span>
							</div>
							<p
								v-if="
									abilityInfo(
										card.cardNo,
										card.area,
										card.source,
									)
								"
								class="mt-0.5 text-[10px] leading-4 text-white/40">
								<PalmRichText
									:value="
										abilityInfo(
											card.cardNo,
											card.area,
											card.source,
										)?.note
									" />
							</p>
							<button
								v-if="
									abilityOf(card) &&
									palm.activateReason(card) === null
								"
								type="button"
								class="mt-1.5 w-full rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[10.5px] font-medium text-emerald-100 transition-colors hover:bg-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
								@click="palm.activateVillager(card.uid)">
								发动技能
							</button>
							<p
								v-else-if="card.activated"
								class="mt-1 text-[10px] text-emerald-200/70">
								本轮已发动，本轮结束前持续生效
							</p>
						</li>
					</ul>
				</section>

				<section
					class="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur">
					<div class="flex items-center justify-between gap-2">
						<h2 class="text-[12.5px] font-semibold text-white">
							已储存资源
						</h2>
						<span class="text-[10.5px] text-white/30 tabular-nums">
							{{ palm.storedCount }} / {{ palm.storeLimit }}
						</span>
					</div>

					<div
						v-if="palm.hasBonus"
						class="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-sky-400/30 bg-sky-400/[0.08] px-2.5 py-1.5">
						<span class="flex items-center gap-1.5">
							<span class="text-[10.5px] text-sky-200/70">
								开局补给
							</span>
							<PalmResources :items="palm.bonus" size="xs" />
						</span>
						<span
							:title="'开局补给只在第 1 轮有效，进入第 2 轮后作废'"
							class="rounded-full border border-sky-300/35 bg-sky-400/12 px-1.5 py-px text-[10px] text-sky-100/80">
							仅本轮有效
						</span>
					</div>

					<ul
						v-if="palm.storedEntries.length"
						class="mt-2.5 flex flex-col gap-1.5">
						<li
							v-for="entry in palm.storedEntries"
							:key="entry.card.uid"
							class="flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5"
							:class="
								entry.turns <= 3
									? 'border-rose-400/35 bg-rose-400/[0.08]'
									: 'border-white/10 bg-white/[0.03]'
							">
							<span class="flex min-w-0 items-center gap-1.5">
								<span
									class="text-[10.5px] text-white/35 tabular-nums">
									{{ labelOf(entry.card) }}
								</span>
								<PalmResources
									:items="gainOf(entry.card)"
									:wild="wildOf(entry.card)"
									size="xs" />
							</span>
							<span class="flex shrink-0 items-center gap-1.5">
								<span
									:title="`再 ${entry.turns} 个回合会被顶到牌库顶而作废`"
									class="rounded-full border px-1.5 py-px text-[10px] font-medium tabular-nums"
									:class="
										entry.turns <= 3
											? 'border-rose-300/45 bg-rose-400/20 text-rose-100'
											: 'border-white/12 bg-white/5 text-white/40'
									">
									距牌顶 {{ entry.turns }} 张牌
								</span>
								<button
									type="button"
									class="rounded-md px-1.5 py-0.5 text-[10.5px] text-white/35 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
									@click="palm.releaseStored(entry.card.uid)">
									丢弃
								</button>
							</span>
						</li>
					</ul>
					<p v-else class="mt-2 text-[11px] leading-5 text-white/30">
						还没有资源。你可以使用「生产」把牌转成资源。
					</p>
				</section>

				<section
					v-if="palm.orders.length"
					class="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-3 backdrop-blur">
					<div class="flex items-center justify-between gap-2">
						<h2 class="text-[12.5px] font-semibold text-amber-100">
							订单
						</h2>
						<span class="text-[10.5px] text-amber-200/50">
							已完成 {{ palm.completedOrders }} /
							{{ palm.orders.length }}，声望
							{{ palm.orderStars }}
						</span>
					</div>

					<ul class="mt-2 flex flex-col gap-1.5">
						<li
							v-for="order in palm.orders"
							:key="order.no"
							class="rounded-xl border px-2.5 py-1.5"
							:class="
								palm.orderStatus(order) === 'done'
									? 'border-emerald-400/40 bg-emerald-400/[0.08]'
									: palm.orderStatus(order) === 'open'
										? 'border-amber-400/45 bg-amber-400/[0.08]'
										: 'border-white/10 bg-white/[0.03]'
							">
							<div
								class="flex items-center justify-between gap-2">
								<span
									class="text-[11.5px] font-medium text-white/75">
									订单 {{ order.no }}
								</span>
								<span class="flex items-center gap-1">
									<span
										class="rounded border border-amber-300/35 bg-amber-400/15 px-1 text-[9.5px] font-medium text-amber-100 tabular-nums">
										★ +{{
											orderSpec(order.no)?.reward ?? 0
										}}
									</span>
									<span
										v-if="
											palm.orderStatus(order) === 'done'
										"
										class="rounded border border-emerald-300/40 bg-emerald-400/15 px-1 text-[9.5px] text-emerald-100">
										已完成
									</span>
									<span
										v-else-if="
											palm.orderStatus(order) ===
											'expired'
										"
										class="rounded border border-white/15 bg-white/5 px-1 text-[9.5px] text-white/40">
										已错过
									</span>
								</span>
							</div>

							<p
								v-if="palm.orderStatus(order) === 'hidden'"
								class="mt-1 text-[10px] text-white/30">
								第 {{ orderSpec(order.no)?.reveal }} 轮公布
							</p>
							<div
								v-else
								class="mt-1 flex flex-wrap items-center gap-1.5">
								<PalmResources :items="order.need" size="xs" />
								<span class="text-[9.5px] text-white/25">
									{{
										orderSpec(order.no)?.from ===
										orderSpec(order.no)?.to
											? `第 ${orderSpec(order.no)?.from} 轮`
											: `第 ${orderSpec(order.no)?.from}–${orderSpec(order.no)?.to} 轮`
									}}
								</span>
							</div>

							<button
								v-if="palm.orderStatus(order) === 'open'"
								type="button"
								class="mt-1.5 w-full rounded-lg border px-2 py-1 text-[10.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:outline-none"
								:class="
									palm.canSubmitOrder(order)
										? 'border-amber-400/50 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25'
										: 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
								"
								:disabled="!palm.canSubmitOrder(order)"
								@click="openOrderSheet(order)">
								{{
									palm.canSubmitOrder(order)
										? "提交订单"
										: "资源不足"
								}}
							</button>
							<p
								v-else-if="
									palm.orderStatus(order) === 'waiting'
								"
								class="mt-3 text-[10px] text-white/30">
								等待开放
							</p>
						</li>
					</ul>
				</section>

				<section
					class="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur">
					<div class="flex items-center justify-between gap-2">
						<h2 class="text-[12.5px] font-semibold text-white">
							牌库
						</h2>
						<span class="text-[10.5px] text-white/30 tabular-nums">
							本轮剩余 {{ palm.remaining }} 张
						</span>
					</div>

					<div
						class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-sky-400/70 transition-[width] duration-300"
							:style="{
								width: `${((palm.deck.length - palm.remaining) / Math.max(1, palm.deck.length)) * 100}%`,
							}" />
					</div>

					<div class="mt-2.5 grid grid-cols-2 gap-1.5">
						<button
							type="button"
							class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/55 transition-colors hover:border-sky-400/40 hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:outline-none"
							@click="peekShow = true">
							{{
								peekAllEnabled ? "查看完整顺序" : "牌库顶 3 张"
							}}
						</button>
						<button
							type="button"
							class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/55 transition-colors hover:border-sky-400/40 hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:outline-none"
							@click="deckShow = true">
							全部 {{ deckCards.length }} 张
						</button>
					</div>
				</section>
			</aside>
		</div>

		<!-- 朝向预览 -->
		<PalmModal
			:show="previewCard !== null"
			:title="`${previewCard ? labelOf(previewCard.card) : ''} · 朝向预览`"
			:subtitle="previewSubtitle"
			max-width="1280px"
			@update:show="previewIndex = null">
			<div
				class="grid gap-3"
				:class="previewItems.length > 1 ? 'sm:grid-cols-3' : ''">
				<figure
					v-for="item in previewItems"
					:key="item.area"
					class="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
					<figcaption
						class="flex w-full items-center justify-between gap-2">
						<span class="text-[11.5px] font-medium text-white/70">
							{{ item.label }}
						</span>
						<span class="text-[10px] text-white/30">
							{{
								previewCard
									? areaName(previewCard.card, item.area)
									: ""
							}}
						</span>
					</figcaption>

					<PalmCardArea
						v-if="previewCard"
						class="border border-white/10"
						:card-no="previewCard.card.cardNo"
						:source="previewCard.card.source"
						:area="item.area"
						:width="showcaseWidth" />

					<div
						class="flex flex-wrap items-center justify-center gap-1.5">
						<PalmResources
							:items="item.gain"
							:wild="item.wild"
							size="xs" />
						<span
							v-if="item.repu !== 0"
							class="rounded border px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums"
							:class="
								item.repu > 0
									? 'border-amber-300/35 bg-amber-400/15 text-amber-100'
									: 'border-rose-300/35 bg-rose-400/15 text-rose-100'
							">
							★ {{ item.repu }}
						</span>
					</div>

					<p
						v-if="item.ability"
						class="text-center text-[10.5px] leading-4 text-violet-200/60">
						<PalmRichText :value="item.ability.note" />
					</p>

					<div
						class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
						<template v-if="item.steps === 2">
							<span class="text-[10.5px] text-white/35">
								需先{{ ACTION_META.flip.label }}再{{
									ACTION_META.rotate.label
								}}
							</span>
						</template>
						<template v-else>
							<span class="flex items-center gap-1.5">
								<span
									aria-hidden="true"
									class="h-1.5 w-1.5 rounded-full"
									:class="ACTION_META[item.kind].dot" />
								<span class="text-[10.5px] text-white/50">
									{{ item.label }}费用
								</span>
							</span>
							<PalmCost
								v-if="item.cost"
								:cost="item.cost"
								size="xs" />
							<span v-else class="text-[10.5px] text-white/30">
								不可用
							</span>
						</template>
					</div>
				</figure>
			</div>

			<p class="mt-3 text-[10.5px] leading-4 text-white/25">
				预览不会改变牌的状态；真正的旋转 /
				翻面仍需点击对应行动并支付费用。
			</p>
		</PalmModal>

		<!-- 开局效果结算 -->
		<PalmModal
			:show="palm.startTask !== null"
			:title="
				palm.startTask
					? `开局效果 · ${palm.startTask.title}`
					: '开局效果'
			"
			:subtitle="startSubtitle"
			:closable="false"
			max-width="1100px">
			<div v-if="palm.startTask" class="space-y-3">
				<p
					class="rounded-xl border border-violet-400/25 bg-violet-400/[0.08] px-3 py-2 text-[12px] leading-5 text-violet-100/80">
					<PalmRichText :value="palm.startTask.note" />
				</p>

				<div
					class="grid max-h-[52vh] gap-2 overflow-y-auto pr-1"
					:style="{
						gridTemplateColumns: `repeat(auto-fill, ${startCardWidth}px)`,
					}">
					<button
						v-for="item in startCandidates"
						:key="item.card.uid"
						type="button"
						class="flex flex-col items-center gap-1 rounded-xl border p-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
						:class="
							startPick === item.card.uid
								? 'border-emerald-400/60 bg-emerald-400/[0.09]'
								: 'border-white/10 bg-white/[0.02] hover:border-white/25'
						"
						@click="pickStartCard(item.card.uid)">
						<span
							class="flex w-full items-center justify-between gap-1">
							<span
								class="truncate text-[10px] font-medium text-white/70">
								{{ item.label }}
							</span>
							<span class="shrink-0 text-[9px] text-white/35">
								{{ item.area }}
							</span>
						</span>
						<PalmCardArea
							class="border border-white/10"
							:card-no="item.card.cardNo"
							:source="item.card.source"
							:area="item.card.area"
							:width="startCardWidth - 12" />
						<span
							class="flex w-full flex-wrap items-center justify-center gap-1">
							<PalmResources
								:items="gainOf(item.card)"
								:wild="wildOf(item.card)"
								size="xs" />
							<span
								v-if="repuOf(item.card) !== 0"
								class="rounded border border-amber-300/35 bg-amber-400/15 px-1 text-[9.5px] font-medium tabular-nums text-amber-100">
								★ {{ repuOf(item.card) }}
							</span>
						</span>
					</button>
				</div>

				<div
					class="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-3">
					<span
						v-if="!startPick"
						class="mr-auto text-[11px] text-white/35">
						先选一张牌
					</span>
					<template v-if="palm.startTask.kind === 'upgrade'">
						<button
							type="button"
							class="rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:outline-none"
							:class="
								startPick
									? 'border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20'
									: 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
							"
							:disabled="!startPick"
							@click="applyStartUpgrade('rotate')">
							旋转 180°
						</button>
						<button
							type="button"
							class="rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:outline-none"
							:class="
								startPick
									? 'border-sky-400/40 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20'
									: 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
							"
							:disabled="!startPick"
							@click="applyStartUpgrade('flip')">
							翻面
						</button>
					</template>
					<button
						v-else
						type="button"
						class="rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
						:class="
							startPick
								? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20'
								: 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
						"
						:disabled="!startPick"
						@click="applyStartMove()">
						移到牌库最前面
					</button>
				</div>
			</div>
		</PalmModal>

		<!-- 全牌库一览 -->
		<PalmModal
			v-model:show="deckShow"
			:title="`牌库 · 全部 ${deckCards.length} 张`"
			subtitle="按牌号排列：基础牌 1–16，之后是村民牌、功绩牌。带「资源」标记的已横置为资源，「已结算」的牌已退出取牌循环。"
			max-width="1280px">
			<div class="max-h-[64vh] overflow-y-auto pr-1">
				<div
					class="grid gap-2"
					:style="{
						gridTemplateColumns: `repeat(auto-fill, ${deckCardWidth}px)`,
					}">
					<figure
						v-for="card in deckCards"
						:key="card.uid"
						class="flex flex-col items-center gap-1 rounded-xl border p-1.5"
						:class="
							isRetired(card)
								? 'border-white/10 bg-white/[0.01] opacity-55'
								: card.stored
									? 'border-emerald-400/35 bg-emerald-400/[0.06]'
									: 'border-white/10 bg-white/[0.02]'
						">
						<figcaption
							class="flex w-full items-center justify-between gap-1">
							<span
								class="truncate text-[10px] font-medium"
								:class="
									card.source === 'villager'
										? 'text-violet-200/80'
										: 'text-white/55'
								">
								{{ labelOf(card) }}
							</span>
							<span
								v-if="isRetired(card)"
								class="shrink-0 rounded border border-white/20 bg-white/10 px-1 text-[9px] text-white/60">
								已结算
							</span>
							<span
								v-else-if="card.stored"
								class="shrink-0 rounded border border-emerald-300/40 bg-emerald-400/15 px-1 text-[9px] text-emerald-100">
								资源
							</span>
						</figcaption>

						<PalmCardArea
							class="border border-white/10"
							:card-no="card.cardNo"
							:source="card.source"
							:area="card.area"
							:width="deckCardWidth" />

						<div
							v-if="deckCardInfo(card)"
							class="mt-auto flex flex-wrap items-center justify-center gap-1">
							<PalmResources
								v-if="!isRetired(card)"
								:items="gainOf(card)"
								:wild="wildOf(card)"
								size="xs" />
							<span
								v-if="repuOf(card) !== 0"
								class="rounded border px-1 text-[9.5px] font-medium tabular-nums"
								:class="
									repuOf(card) > 0
										? 'border-amber-300/35 bg-amber-400/15 text-amber-100'
										: 'border-rose-300/35 bg-rose-400/15 text-rose-100'
								">
								★ {{ repuOf(card) }}
							</span>
						</div>
					</figure>
				</div>
			</div>

			<p class="mt-2 text-[10.5px] leading-4 text-white/25">
				这里列出的是整副牌当前的状态，不含回合标记卡；牌库的实际先后顺序请用「牌库顶
				3 张」查看。
			</p>
		</PalmModal>

		<!-- 牌库顶 3 张 / 完整顺序 -->
		<PalmModal
			v-model:show="peekShow"
			:title="
				peekAllEnabled
					? `牌库顺序 · 共 ${palm.peekCards.length} 张`
					: '牌库顶 3 张'
			"
			:subtitle="
				peekAllEnabled
					? `本轮剩余 ${palm.remaining} 张。已开启「显示完整牌库顺序」，下面按先后排列。`
					: `本轮剩余 ${palm.remaining} 张。对局中只能查看牌库顶 3 张。`
			"
			max-width="1280px">
			<div
				class="grid gap-3"
				:class="
					peekAllEnabled
						? 'max-h-[64vh] overflow-y-auto pr-1'
						: 'sm:grid-cols-3'
				"
				:style="
					peekAllEnabled
						? {
								gridTemplateColumns: `repeat(auto-fill, ${deckCardWidth}px)`,
							}
						: undefined
				">
				<figure
					v-for="(card, index) in palm.peekCards"
					:key="card.uid"
					class="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
					<figcaption
						class="flex w-full items-center justify-between gap-2">
						<span class="text-[11.5px] font-medium text-white/70">
							{{ index === 0 ? "牌库顶" : `第 ${index + 1} 张` }}
						</span>
						<span class="text-[10px] text-white/30 tabular-nums">
							{{ labelOf(card) }}
						</span>
					</figcaption>

					<PalmCardArea
						class="border border-white/10"
						:card-no="card.cardNo"
						:source="card.source"
						:area="card.area"
						:width="
							peekAllEnabled ? deckCardWidth - 24 : showcaseWidth
						" />

					<div
						class="flex flex-wrap items-center justify-center gap-1.5">
						<PalmResources
							:items="gainOf(card)"
							:wild="wildOf(card)"
							size="xs" />
						<span
							v-if="repuOf(card) !== 0"
							class="rounded border px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums"
							:class="
								repuOf(card) > 0
									? 'border-amber-300/35 bg-amber-400/15 text-amber-100'
									: 'border-rose-300/35 bg-rose-400/15 text-rose-100'
							">
							★ {{ repuOf(card) }}
						</span>
					</div>

					<p
						v-if="card.stored"
						class="text-[10.5px] text-rose-200/70">
						已储存的资源牌，到顶后会被回收
					</p>
				</figure>
			</div>
		</PalmModal>

		<!-- 行动确认：预览变更 + 选择支付资源，一次确认完成 -->
		<PalmModal
			:show="actionSheet !== null"
			:title="
				actionSheet
					? `${ACTION_META[actionSheet.kind].label} ${
							actionCard ? labelOf(actionCard) : ''
						}`
					: '行动确认'
			"
			:subtitle="
				actionSheet?.kind === 'produce'
					? '确认后这张牌会横置成资源并放到牌库底；下方已为你选好要支付的资源。'
					: '确认后这张牌会移到牌库底；下面是变更后的样子和支付方式。'
			"
			max-width="860px"
			@update:show="closeSheet">
			<div v-if="actionSheet && actionCard" class="space-y-3">
				<div class="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
					<figure class="flex flex-col items-center gap-2">
						<figcaption class="text-[10.5px] text-white/35">
							当前 ·
							{{ areaName(actionCard, actionCard.area) }}
						</figcaption>
						<PalmCardArea
							class="border border-white/10"
							:class="
								actionSheet.kind === 'produce'
									? ''
									: 'opacity-70'
							"
							:card-no="actionCard.cardNo"
							:source="actionCard.source"
							:area="actionCard.area"
							:width="confirmWidth" />
					</figure>

					<span
						aria-hidden="true"
						class="self-center text-lg text-white/25">
						→
					</span>

					<figure class="flex flex-col items-center gap-2">
						<figcaption
							class="rounded-full border border-sky-300/35 bg-sky-400/12 px-2 py-0.5 text-[10.5px] font-medium text-sky-200">
							{{
								actionSheet.kind === "produce"
									? "生产后"
									: "变更后"
							}}
							·
							{{
								actionTo !== null
									? areaName(actionCard, actionTo)
									: ""
							}}
						</figcaption>
						<PalmCardArea
							v-if="actionSheet.kind !== 'produce'"
							class="ring-2 ring-sky-400/45"
							:card-no="actionCard.cardNo"
							:source="actionCard.source"
							:area="actionTo ?? actionCard.area"
							:width="confirmWidth" />
						<div
							v-if="actionSheet.kind === 'produce'"
							class="flex w-full max-w-[280px] flex-wrap items-center justify-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] px-2 py-1.5">
							<span class="text-[10.5px] text-emerald-200/70">
								横置为资源
							</span>
							<PalmResources
								:items="actionGain"
								:wild="actionWild"
								size="xs" />
						</div>
						<div
							v-else
							class="flex flex-wrap items-center justify-center gap-1.5">
							<span class="text-[10.5px] text-white/30">
								产出
							</span>
							<PalmResources
								:items="actionGain"
								:wild="actionWild"
								size="xs" />
							<span
								v-if="actionRepu !== 0"
								class="rounded border border-amber-300/35 bg-amber-400/15 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-100 tabular-nums">
								★ {{ actionRepu }}
							</span>
						</div>
					</figure>
				</div>

				<PalmPayPicker
					:cost="actionSheet.cost"
					:picked="picked"
					@update:picked="picked = $event" />

				<div class="flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-full border border-white/10 px-4 py-1.5 text-[11.5px] text-white/55 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
						@click="closeSheet">
						取消
					</button>
					<button
						type="button"
						class="rounded-full px-4 py-1.5 text-[11.5px] font-semibold text-[#031420] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
						style="background: #38bdf8"
						:disabled="!paymentReady"
						@click="confirmAction">
						确认执行
					</button>
				</div>
			</div>
		</PalmModal>

		<!-- 提交订单：需求 + 资源选择，一次确认完成 -->
		<PalmModal
			:show="orderSheet !== null"
			:title="`提交订单 ${orderSheetOrder?.no ?? ''}`"
			subtitle="提交只花已储存的资源，不占用这个回合的行动。"
			max-width="720px"
			@update:show="closeOrderSheet">
			<div v-if="orderSheetOrder" class="space-y-3">
				<div
					class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2.5">
					<div class="flex items-center gap-1.5">
						<span class="text-[11px] text-amber-100/70">
							订单需求
						</span>
						<PalmResources
							:items="orderSheetOrder.need"
							size="sm" />
					</div>
					<span
						class="rounded border border-amber-300/40 bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-100 tabular-nums">
						★ +{{ orderSpec(orderSheetOrder.no)?.reward ?? 0 }}
					</span>
				</div>

				<PalmPayPicker
					:cost="orderSheetCost"
					:picked="orderPicked"
					@update:picked="orderPicked = $event" />

				<div class="flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-full border border-white/10 px-4 py-1.5 text-[11.5px] text-white/55 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
						@click="closeOrderSheet">
						取消
					</button>
					<button
						type="button"
						class="rounded-full px-4 py-1.5 text-[11.5px] font-semibold text-[#031420] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
						style="background: #fbbf24"
						:disabled="!orderReady"
						@click="confirmOrder">
						确认提交
					</button>
				</div>
			</div>
		</PalmModal>

		<!-- 重开确认 -->
		<PalmModal
			:show="restartConfirm"
			title="重新开始？"
			:subtitle="`当前进行到第 ${palm.round} 轮、第 ${palm.turn} 回合，重新开始会丢弃这局进度。`"
			max-width="460px"
			@update:show="restartConfirm = false">
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-full border border-white/10 px-4 py-1.5 text-[11.5px] text-white/55 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
					@click="restartConfirm = false">
					继续这局
				</button>
				<button
					type="button"
					class="rounded-full bg-rose-400 px-4 py-1.5 text-[11.5px] font-semibold text-rose-950 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
					@click="openNewGame(true)">
					丢弃并重开
				</button>
			</div>
		</PalmModal>

		<!-- 新局设置 -->
		<PalmModal
			:show="settingsShow"
			title="新的一局"
			subtitle="开局设置会保存在本地，之后的新局沿用。"
			max-width="640px"
			@update:show="settingsShow = false">
			<label
				class="flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors"
				:class="
					starterOption
						? 'border-sky-400/45 bg-sky-400/[0.08]'
						: 'border-white/10 bg-white/[0.03] hover:border-white/25'
				">
				<input
					v-model="starterOption"
					type="checkbox"
					class="mt-0.5 h-4 w-4 shrink-0 accent-sky-400" />
				<span class="min-w-0">
					<span class="block text-[12px] font-medium text-white/85">
						开局携带额外资源
					</span>
					<span
						class="mt-1 block text-[10.5px] leading-4 text-white/40">
						这些资源只在本轮（第 1 轮）有效，进入第 2
						轮即作废。它们不占用已储存资源的位置，支付时优先扣除。
					</span>
					<span class="mt-1.5 flex items-center gap-1.5">
						<PalmResources :items="STARTER_BONUS" size="xs" />
					</span>
				</span>
			</label>

			<label
				class="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors"
				:class="
					villagerOption
						? 'border-violet-400/45 bg-violet-400/[0.08]'
						: 'border-white/10 bg-white/[0.03] hover:border-white/25'
				">
				<input
					v-model="villagerOption"
					type="checkbox"
					class="mt-0.5 h-4 w-4 shrink-0 accent-violet-400" />
				<span class="min-w-0">
					<span class="block text-[12px] font-medium text-white/85">
						启用村民卡
					</span>
					<span
						class="mt-1 block text-[10.5px] leading-4 text-white/40">
						每局从 7 张村民里随机抽 3
						张洗入牌库。用「旋转」付钱招募，村民面提供 ★
						与可发动的技能；村民卡只有招募面与村民面两个朝向。
					</span>
				</span>
			</label>

			<label
				class="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors"
				:class="
					orderOption
						? 'border-amber-400/45 bg-amber-400/[0.08]'
						: 'border-white/10 bg-white/[0.03] hover:border-white/25'
				">
				<input
					v-model="orderOption"
					type="checkbox"
					class="mt-0.5 h-4 w-4 shrink-0 accent-amber-400" />
				<span class="min-w-0">
					<span class="block text-[12px] font-medium text-white/85">
						启用订单
					</span>
					<span
						class="mt-1 block text-[10.5px] leading-4 text-white/40">
						开局生成 4 张随机订单：第 3 轮（2 个资源，+1★）、第 5
						轮（3 个，+2★）、第 7–8 轮（4 个 +4★ / 5 个
						+6★）。提交不消耗行动，只花已储存的资源。
					</span>
				</span>
			</label>

			<div
				class="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
				<div class="flex items-center justify-between gap-2">
					<span class="text-[12px] font-medium text-white/85">
						功绩卡
					</span>
					<span class="text-[10.5px] text-white/35 tabular-nums">
						已选 {{ achievementOption.length }} / 9
					</span>
				</div>
				<p class="mt-1 text-[10.5px] leading-4 text-white/40">
					勾选的功绩牌会洗入牌库（相当于额外卡牌）。不勾选则保持标准牌库。
				</p>
				<div class="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
					<label
						v-for="no in achievementNos"
						:key="no"
						class="flex cursor-pointer items-start gap-2 rounded-xl border px-2 py-1.5 transition-colors"
						:class="
							achievementOption.includes(no)
								? 'border-amber-400/45 bg-amber-400/[0.08]'
								: 'border-white/10 bg-white/[0.02] hover:border-white/25'
						">
						<input
							:checked="achievementOption.includes(no)"
							type="checkbox"
							class="mt-0.5 h-3.5 w-3.5 shrink-0 accent-amber-400"
							@change="toggleAchievement(no)" />
						<span class="min-w-0">
							<span
								class="block text-[11px] font-medium text-white/80">
								{{
									labelOf({
										cardNo: no,
										source: "achievement",
									})
								}}
							</span>
							<span
								class="mt-0.5 block text-[10px] leading-3.5 text-white/35">
								<PalmRichText :value="ACHIEVEMENT_HINT[no]" />
							</span>
						</span>
					</label>
				</div>
			</div>

			<label
				class="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors"
				:class="
					peekAllOption
						? 'border-emerald-400/45 bg-emerald-400/[0.08]'
						: 'border-white/10 bg-white/[0.03] hover:border-white/25'
				">
				<input
					:checked="peekAllOption"
					type="checkbox"
					class="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400"
					@change="
						setPeekAll(($event.target as HTMLInputElement).checked)
					" />
				<span class="min-w-0">
					<span class="block text-[12px] font-medium text-white/85">
						显示完整牌库顺序
					</span>
					<span
						class="mt-1 block text-[10.5px] leading-4 text-white/40">
						开启后「牌库顶」按钮会展示整副牌的先后顺序，而不是只看牌库顶
						3 张。会让游戏变简单，按需开启。改动立即生效。
					</span>
				</span>
			</label>

			<div class="mt-4 flex items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-full border border-white/10 px-4 py-1.5 text-[11.5px] text-white/55 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
					@click="settingsShow = false">
					取消
				</button>
				<button
					type="button"
					class="rounded-full px-4 py-1.5 text-[11.5px] font-semibold text-[#031420] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
					style="background: #38bdf8"
					@click="startNewGame">
					开始新局
				</button>
			</div>
		</PalmModal>

		<!-- 结算 -->
		<Transition name="sheet">
			<div
				v-if="palm.gameOver"
				class="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 backdrop-blur-sm">
				<div
					class="w-[min(92vw,420px)] rounded-3xl border border-white/10 bg-[#0b1220] p-6 text-center">
					<p class="text-[10px] tracking-[0.3em] text-sky-300/70">
						8 轮结束
					</p>
					<h2 class="mt-2 text-2xl font-semibold text-white">
						你的村庄得分
					</h2>
					<p
						class="mt-4 text-5xl font-bold text-sky-300 tabular-nums">
						{{ palm.score }}
					</p>
					<div class="mt-3 flex items-center justify-center gap-2">
						<span
							class="rounded-full border border-sky-300/40 bg-sky-400/12 px-2.5 py-0.5 text-[12px] font-semibold text-sky-200">
							评价 {{ grade }}
						</span>
						<span class="text-[11.5px] text-white/40">
							升级 {{ palm.upgrades }} 次
						</span>
					</div>
					<p class="mt-3 text-[11.5px] leading-5 text-white/40">
						共 {{ palm.turn }} 个回合。分数越高，村庄发展得越好。
					</p>
					<p
						v-if="palm.orders.length"
						class="mt-1.5 text-[11.5px] leading-5 text-amber-200/60">
						订单完成 {{ palm.completedOrders }} /
						{{ palm.orders.length }}，订单声望 {{ palm.orderStars
						}}{{
							palm.orderBonus
								? `，完成数量奖励 +${palm.orderBonus}`
								: ""
						}}
					</p>
					<div class="mt-6 flex flex-col gap-2">
						<button
							type="button"
							class="w-full rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#031420] focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
							style="background: #38bdf8"
							@click="openNewGame(true)">
							再来一局
						</button>
						<button
							type="button"
							class="w-full rounded-full border border-white/10 px-4 py-2 text-[12.5px] text-white/60 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
							@click="emit('exit')">
							退出对局
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
	transition:
		opacity 220ms ease,
		transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-enter-from,
.sheet-leave-to {
	opacity: 0;
	transform: translateY(16px);
}
</style>
