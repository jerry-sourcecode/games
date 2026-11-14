import { defineStore } from "pinia";
import { ref } from "vue";
import type { PalmArea, PalmCardSource, PalmCondition } from "../game/palmStore";

/** 单张牌在某一刻的状态 */
export interface PalmCardSnapshot {
	cardNo: number;
	source: PalmCardSource;
	area: PalmArea;
	stored: boolean;
	/** 生产时确定的资源内容 */
	resource?: PalmCondition;
	/** 生产出的万能资源数量 */
	wild?: number;
}

/** 一局的完整状态；历史里每一步都存一份 */
export interface PalmState {
	roundsCompleted: number;
	turn: number;
	upgrades: number;
	/** 村民能力累计带来的星星 */
	bonusStars: number;
	lastEvent: string | null;
	/** 开局补给（有效期一回合），为空表示没有 */
	bonus: PalmCondition;
	deck: PalmCardSnapshot[];
}

/** 回放 / 撤回用的一步 */
export interface PalmStep {
	label: string;
	state: PalmState;
}

export interface PalmSettings {
	/** 开局携带 1 石 + 1 鱼 + 1 木，仅第 1 轮有效 */
	starter: boolean;
	/** 把 7 张村民牌洗入牌库 */
	villagers: boolean;
}

export interface PalmSaveFile {
	version: number;
	savedAt: number;
	steps: PalmStep[];
}

const SAVE_KEY = "palm-island:save";
const SETTINGS_KEY = "palm-island:settings";
/** 存档格式版本；数据结构变动时递增，旧存档会被丢弃 */
const SAVE_VERSION = 3;

export const DEFAULT_SETTINGS: PalmSettings = {
	starter: false,
	villagers: false,
};

function isCondition(value: unknown): value is PalmCondition {
	if (!value || typeof value !== "object") return false;
	return Object.entries(value as Record<string, unknown>).every(
		([item, amount]) =>
			["Rock", "Fish", "Log"].includes(item) &&
			typeof amount === "number" &&
			amount >= 0,
	);
}

function isState(value: unknown): value is PalmState {
	if (!value || typeof value !== "object") return false;
	const state = value as Partial<PalmState>;
	if (!Array.isArray(state.deck)) return false;
	// 17 张（16 建筑 + 标记卡），启用村民扩展时为 24 张
	if (state.deck.length !== 17 && state.deck.length !== 24) return false;
	if (!Number.isInteger(state.turn) || (state.turn ?? -1) < 0) return false;
	if (
		!Number.isInteger(state.roundsCompleted) ||
		(state.roundsCompleted ?? -1) < 0 ||
		(state.roundsCompleted ?? 99) > 7
	) {
		return false;
	}
	if (state.bonus !== undefined && !isCondition(state.bonus)) return false;
	if (
		state.bonusStars !== undefined &&
		(!Number.isInteger(state.bonusStars) || state.bonusStars < 0)
	) {
		return false;
	}

	const legal = state.deck.every((card) => {
		if (!card || !Number.isInteger(card.cardNo)) return false;
		if (card.resource !== undefined && !isCondition(card.resource)) {
			return false;
		}
		if (
			card.wild !== undefined &&
			(!Number.isInteger(card.wild) || card.wild < 0)
		) {
			return false;
		}
		if (card.area !== 1 && card.area !== 2 && card.area !== 3 && card.area !== 4) {
			return false;
		}
		// 村民卡只有招募面与村民面两个朝向
		if (card.source === "villager") {
			return (
				card.cardNo >= 1 &&
				card.cardNo <= 7 &&
				(card.area === 1 || card.area === 2)
			);
		}
		return (
			card.source === "basic" && card.cardNo >= 1 && card.cardNo <= 17
		);
	});
	if (!legal) return false;

	// 1 张回合标记卡；16 张建筑牌、7 张村民牌各自互不重复
	if (state.deck.filter((card) => card.cardNo === 17).length !== 1) {
		return false;
	}
	const buildings = state.deck.filter(
		(card) => card.source === "basic" && card.cardNo !== 17,
	);
	if (new Set(buildings.map((card) => card.cardNo)).size !== 16) return false;
	const villagers = state.deck.filter((card) => card.source === "villager");
	const villagerCount = new Set(villagers.map((card) => card.cardNo)).size;
	return villagerCount === villagers.length;
}

function isSaveFile(value: unknown): value is PalmSaveFile {
	if (!value || typeof value !== "object") return false;
	const file = value as Partial<PalmSaveFile>;
	if (file.version !== SAVE_VERSION) return false;
	if (!Array.isArray(file.steps) || file.steps.length < 1) return false;
	if (file.steps.length > 500) return false;
	return file.steps.every(
		(step) => step && typeof step.label === "string" && isState(step.state),
	);
}

export const usePalmSave = defineStore("palmSave", () => {
	const snapshot = ref<PalmSaveFile | null>(null);
	const savedAt = ref<number | null>(null);
	const settings = ref<PalmSettings>({ ...DEFAULT_SETTINGS });

	function clear() {
		snapshot.value = null;
		savedAt.value = null;
		try {
			localStorage.removeItem(SAVE_KEY);
		} catch {
			// 隐私模式下 localStorage 不可用时忽略
		}
	}

	/** 读取存档；损坏或版本不符时自动清除 */
	function load(): PalmSaveFile | null {
		let raw: string | null = null;
		try {
			raw = localStorage.getItem(SAVE_KEY);
		} catch {
			return null;
		}
		if (!raw) {
			clear();
			return null;
		}
		try {
			const parsed: unknown = JSON.parse(raw);
			if (!isSaveFile(parsed)) {
				clear();
				return null;
			}
			snapshot.value = parsed;
			savedAt.value = parsed.savedAt;
			return parsed;
		} catch {
			clear();
			return null;
		}
	}

	function save(next: PalmSaveFile) {
		const payload: PalmSaveFile = { ...next, savedAt: Date.now() };
		snapshot.value = payload;
		savedAt.value = payload.savedAt;
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
		} catch {
			// 写入失败（配额 / 隐私模式）时保留内存快照
		}
	}

	function loadSettings(): PalmSettings {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			if (!raw) return { ...settings.value };
			const parsed = JSON.parse(raw) as Partial<PalmSettings>;
			settings.value = {
				...DEFAULT_SETTINGS,
				starter: parsed?.starter === true,
				villagers: parsed?.villagers === true,
			};
		} catch {
			settings.value = { ...DEFAULT_SETTINGS };
		}
		return { ...settings.value };
	}

	function saveSettings(next: PalmSettings) {
		settings.value = { ...next };
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value));
		} catch {
			// 忽略写入失败
		}
	}

	return {
		snapshot,
		savedAt,
		settings,
		load,
		save,
		clear,
		loadSettings,
		saveSettings,
	};
});
