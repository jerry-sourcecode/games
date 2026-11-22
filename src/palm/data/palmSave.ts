import { defineStore } from "pinia";
import { ref } from "vue";
import type { PalmArea, PalmCardSource, PalmCondition } from "../game/palmStore";
import { achievementAreas } from "./achievement";
import { ORDER_SPECS, type PalmOrder } from "./orders";

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
    /** 「每场一次」的效果已经用掉 */
    used?: boolean;
    /** 村民技能本轮已经发动过 */
    activated?: boolean;
}

/** 开局需要玩家处理的一项功绩效果 */
export interface PalmStartTask {
    kind: "upgrade" | "move";
    /** 触发它的功绩卡编号 */
    featNo: number;
    title: string;
    note: string;
    /** upgrade 任务只能在这些基础牌里选 */
    cardNos: number[];
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
    /** 效果已结算、退出取牌循环的牌（仍计入牌库与得分） */
    retired?: PalmCardSnapshot[];
    /** 尚未处理的开局效果 */
    startTasks?: PalmStartTask[];
    /** 订单扩展：4 张随机订单（未启用时为空） */
    orders?: PalmOrder[];
    /** 订单收益累计的声望 */
    orderStars?: number;
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
    /** 要加入牌库的功绩卡编号（1–9），手动逐张勾选 */
    achievements: number[];
    /** 允许查看完整的牌库顺序（默认只看牌库顶 3 张） */
    peekAll: boolean;
    /** 订单扩展：4 张随机订单 */
    orders: boolean;
}

export interface PalmSaveFile {
    version: number;
    savedAt: number;
    steps: PalmStep[];
}

const SAVE_KEY = "palm-island:save";
const SETTINGS_KEY = "palm-island:settings";
/** 存档格式版本；数据结构变动时递增，旧存档会被丢弃 */
const SAVE_VERSION = 5;

export const DEFAULT_SETTINGS: PalmSettings = {
    starter: false,
    villagers: false,
    achievements: [],
    peekAll: false,
    orders: false,
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

/** 单张快照的合法性（牌号、朝向、资源字段） */
function isLegalCard(card: PalmCardSnapshot): boolean {
    if (!card || !Number.isInteger(card.cardNo)) return false;
    if (card.resource !== undefined && !isCondition(card.resource)) return false;
    if (
        card.wild !== undefined &&
        (!Number.isInteger(card.wild) || card.wild < 0)
    ) {
        return false;
    }
    if (card.used !== undefined && typeof card.used !== "boolean") return false;
    if (card.activated !== undefined && typeof card.activated !== "boolean") {
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
    // 功绩卡跳过 a 面的解锁条件：单朝向卡只用 b 面，其余用 b 面上下两面
    if (card.source === "achievement") {
        if (card.cardNo < 1 || card.cardNo > 9) return false;
        return achievementAreas(card.cardNo).includes(card.area);
    }
    return card.source === "basic" && card.cardNo >= 1 && card.cardNo <= 17;
}

function isStartTask(value: unknown): value is PalmStartTask {
    if (!value || typeof value !== "object") return false;
    const task = value as Partial<PalmStartTask>;
    if (task.kind !== "upgrade" && task.kind !== "move") return false;
    if (!Number.isInteger(task.featNo)) return false;
    if (typeof task.title !== "string" || typeof task.note !== "string") {
        return false;
    }
    if (!Array.isArray(task.cardNos)) return false;
    return task.cardNos.every((no) => Number.isInteger(no));
}

function isOrder(value: unknown): value is PalmOrder {
    if (!value || typeof value !== "object") return false;
    const order = value as Partial<PalmOrder>;
    if (!Number.isInteger(order.no)) return false;
    if (order.no! < 1 || order.no! > ORDER_SPECS.length) return false;
    if (!isCondition(order.need)) return false;
    return typeof order.done === "boolean";
}

export function isState(value: unknown): value is PalmState {
    if (!value || typeof value !== "object") return false;
    const state = value as Partial<PalmState>;
    if (!Array.isArray(state.deck)) return false;
    const retired = state.retired ?? [];
    if (!Array.isArray(retired)) return false;
    // 17 张（16 建筑 + 标记卡），追加村民 7 张、功绩 9 张，最多 33 张；
    // 已结算的牌移出取牌循环，但仍算在总数里
    const total = state.deck.length + retired.length;
    if (total < 17 || total > 33) return false;
    if (state.startTasks !== undefined) {
        if (!Array.isArray(state.startTasks)) return false;
        if (!state.startTasks.every(isStartTask)) return false;
    }
    if (state.orders !== undefined) {
        if (!Array.isArray(state.orders)) return false;
        if (!state.orders.every(isOrder)) return false;
        if (
            new Set(state.orders.map((order) => order.no)).size !==
            state.orders.length
        ) {
            return false;
        }
    }
    if (
        state.orderStars !== undefined &&
        (!Number.isInteger(state.orderStars) || state.orderStars < 0)
    ) {
        return false;
    }
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

    if (!state.deck.every(isLegalCard)) return false;
    if (!retired.every(isLegalCard)) return false;

    const all = [...state.deck, ...retired];
    // 1 张回合标记卡；16 张建筑牌、7 张村民牌各自互不重复
    if (all.filter((card) => card.cardNo === 17).length !== 1) return false;
    const buildings = all.filter(
        (card) => card.source === "basic" && card.cardNo !== 17,
    );
    if (new Set(buildings.map((card) => card.cardNo)).size !== 16) return false;
    const achievements = all.filter(
        (card) => card.source === "achievement",
    );
    if (
        new Set(achievements.map((card) => card.cardNo)).size !==
        achievements.length
    ) {
        return false;
    }
    const villagers = all.filter((card) => card.source === "villager");
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
                peekAll: parsed?.peekAll === true,
                orders: parsed?.orders === true,
                achievements: Array.isArray(parsed?.achievements)
                    ? parsed.achievements.filter(
                        (n) => Number.isInteger(n) && n >= 1 && n <= 9,
                    )
                    : [],
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
