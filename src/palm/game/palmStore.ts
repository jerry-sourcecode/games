import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
    AchievementCards,
    achievementAreas,
    achievementNos,
} from "../data/achievement";
import { BasicCardNames, BasicCards } from "../data/data";
import { VillagerCards, villagerNos } from "../data/villager";
import type {
    PalmCardSnapshot,
    PalmSaveFile,
    PalmSettings,
    PalmStartTask,
    PalmState,
    PalmStep,
} from "../data/palmSave";
import { isState } from "../data/palmSave";
import type { PalmReplayStep } from "../data/palmRecord";
import type { Palm } from "../modal/modal";

/** 四个有效区域：a 面上半 / a 面下半 / b 面上半 / b 面下半 */
export type PalmArea = 1 | 2 | 3 | 4;
export type PalmActionKind = "produce" | "rotate" | "flip";
/** 牌来自基础牌组还是村民扩展 */
export type PalmCardSource = "basic" | "villager" | "achievement";
export type PalmItem = Palm.Item;
export type PalmCondition = Palm.Condition;
export type PalmCost = Palm.Condition[];
export type PalmAbility = Palm.Ability;

export interface PalmCardInstance {
    uid: string;
    /** 1–16 为基础建筑牌，1–7 为村民牌，17 为回合标记；配合 source 唯一 */
    cardNo: number;
    source: PalmCardSource;
    area: PalmArea;
    /** 是否已旋转 90° 成为资源牌 */
    stored: boolean;
    /** 生产时确定的资源内容 */
    resource?: PalmCondition;
    /** 生产出的万能资源数量（支付时可当作任意一种资源） */
    wild?: number;
    /** 「每场一次」的效果已经用掉 */
    used?: boolean;
    /** 村民技能本轮已经发动过 */
    activated?: boolean;
}

/** 回合标记卡的编号 */
export const TRACKER_NO = 17;
/** 每局轮数 */
export const ROUNDS = 8;
/** 同时可储存的资源牌上限 */
export const MAX_STORED = 4;
/** 村民扩展：每局从 7 张村民里随机抽这么多张加入牌库 */
export const VILLAGER_DRAW = 3;
/** 开局补给：1 石 + 1 鱼 + 1 木 */
export const STARTER_BONUS: PalmCondition = { Rock: 1, Fish: 1, Log: 1 };

const cardNos = Object.keys(BasicCards)
    .map(Number)
    .sort((a, b) => a - b);

const CARDS_BY_SOURCE: Record<
    PalmCardSource,
    Record<string, Palm.PartialCard>
> = {
    basic: BasicCards,
    villager: VillagerCards,
    achievement: AchievementCards,
};

/** 按来源取出某张牌某个朝向的内容 */
export const contentAt = (
    source: PalmCardSource,
    cardNo: number,
    area: PalmArea,
): Palm.Content | undefined =>
    CARDS_BY_SOURCE[source]?.[String(cardNo)]?.[area];

export const contentOf = (
    cardNo: number,
    area: PalmArea,
    source: PalmCardSource = "basic",
) => contentAt(source, cardNo, area);

/** 牌面显示名：村民 / 功绩牌写在数据里，基础牌查名字表 */
export const nameOf = (card: {
    cardNo: number;
    source: PalmCardSource;
    area?: PalmArea;
}) =>
    contentAt(card.source, card.cardNo, card.area ?? 1)?.name ??
    (card.source === "basic" ? BasicCardNames[card.cardNo] : undefined);

export const labelOf = (card: {
    cardNo: number;
    source: PalmCardSource;
    area?: PalmArea;
}) => nameOf(card) ?? `${card.cardNo} 号`;

/** 旋转 180°：同面上下互换 */
export const rotatedArea = (area: PalmArea): PalmArea =>
    area === 1 ? 2 : area === 2 ? 1 : area === 3 ? 4 : 3;

/** 翻面：同一上下位置换到另一面 */
export const flippedArea = (area: PalmArea): PalmArea =>
    area === 1 ? 3 : area === 3 ? 1 : area === 2 ? 4 : 2;

/**
 * 回合标记卡的下一个朝向。
 * 牌面印刷为：a 面正向 1/5、a 面倒置 2/6、b 面倒置 3/7、b 面正向 4/8，
 * 因此推进顺序是 1 → 2 → 4 → 3 → 1（旋转、翻面交替）。
 */
export const nextTrackerArea = (area: PalmArea): PalmArea =>
    area === 1 ? 2 : area === 2 ? 4 : area === 4 ? 3 : 1;

/** 该朝向是否具备某个行动；null 表示不可用，[] 表示免费 */
export function actionCostOf(
    cardNo: number,
    area: PalmArea,
    kind: PalmActionKind,
    source: PalmCardSource = "basic",
): PalmCost | null {
    const content = contentOf(cardNo, area, source);
    if (!content) return null;
    if (kind === "produce") {
        return content.produce ? (content.produce.cons ?? []) : null;
    }
    if (kind === "rotate") {
        return content.rotate ? content.rotate.cons : null;
    }
    return content.flip ? content.flip.cons : null;
}

/** 生产这张牌时提供的资源；已经生产过的以当时确定的为准 */
export function gainOf(card: PalmCardInstance): Palm.Condition {
    return card.stored && card.resource
        ? card.resource
        : gainAt(card.cardNo, card.area, card.source);
}

/** 这张牌横置后提供的万能资源数量 */
export function wildOf(card: PalmCardInstance): number {
    return card.stored ? (card.wild ?? 0) : 0;
}

/** 这个朝向生产时会产出多少万能资源 */
export function wildAt(card: {
    cardNo: number;
    area: PalmArea;
    source: PalmCardSource;
}): number {
    return contentOf(card.cardNo, card.area, card.source)?.produce?.wild ?? 0;
}

/** 指定朝向的资源产出 */
export function gainAt(
    cardNo: number,
    area: PalmArea,
    source: PalmCardSource = "basic",
): Palm.Condition {
    return contentOf(cardNo, area, source)?.produce?.gain ?? {};
}

/** 该朝向的星星分 */
export function repuOf(card: { cardNo: number; area: PalmArea; source: PalmCardSource }): number {
    return repuAt(card.cardNo, card.area, card.source);
}

/** 指定朝向的星星分 */
export function repuAt(
    cardNo: number,
    area: PalmArea,
    source: PalmCardSource = "basic",
): number {
    return contentOf(cardNo, area, source)?.repu ?? 0;
}

/** 该朝向的常驻能力 */
export function abilityOf(card: {
    cardNo: number;
    area: PalmArea;
    source: PalmCardSource;
}): PalmAbility | undefined {
    return contentOf(card.cardNo, card.area, card.source)?.ability;
}

/** 从 from 换到 to 需要执行的动作 */
export function relationLabel(from: PalmArea, to: PalmArea): string {
    const sameSide = from <= 2 === to <= 2;
    if (sameSide) return "旋转";
    return from % 2 === to % 2 ? "翻面" : "翻面 + 旋转";
}

/** 这张牌存在哪些朝向 */
export function areasOf(card: {
    source: PalmCardSource;
    cardNo: number;
}): PalmArea[] {
    if (card.source === "villager") return [1, 2];
    // 功绩卡跳过 a 面的解锁条件，只用 b 面
    if (card.source === "achievement") return achievementAreas(card.cardNo);
    return [1, 2, 3, 4];
}

/** 这张牌除当前朝向外的其它朝向 */
export function otherAreasOf(card: {
    source: PalmCardSource;
    cardNo: number;
    area: PalmArea;
}): PalmArea[] {
    return areasOf(card).filter((item) => item !== card.area);
}

/** 多组资源相加 */
function merge(...sources: Palm.Condition[]): Palm.Condition {
    const total: Palm.Condition = {};
    for (const source of sources) {
        for (const [item, amount] of Object.entries(source)) {
            const key = item as PalmItem;
            total[key] = (total[key] ?? 0) + (amount ?? 0);
        }
    }
    return total;
}

/** 多张资源牌的合计产出 */
function totalGain(cards: PalmCardInstance[]): Palm.Condition {
    return merge(...cards.map((card) => gainOf(card)));
}

/** 多张资源牌的万能资源合计 */
function totalWild(cards: PalmCardInstance[]): number {
    return cards.reduce((sum, card) => sum + wildOf(card), 0);
}

/** 合计资源（含万能）是否覆盖某一组花费 */
function coversWithWild(
    total: Palm.Condition,
    wild: number,
    need: Palm.Condition,
): boolean {
    let deficit = 0;
    for (const [item, amount] of Object.entries(need)) {
        const lack = (amount ?? 0) - (total[item as PalmItem] ?? 0);
        if (lack > 0) deficit += lack;
    }
    return deficit <= wild;
}

/** Fisher–Yates 洗牌，返回新数组 */
function shuffled<T>(list: readonly T[]): T[] {
    const next = [...list];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j]!, next[i]!];
    }
    return next;
}

function cloneState(state: PalmState): PalmState {
    return {
        roundsCompleted: state.roundsCompleted,
        turn: state.turn,
        upgrades: state.upgrades,
        bonusStars: state.bonusStars ?? 0,
        lastEvent: state.lastEvent,
        bonus: { ...state.bonus },
        deck: state.deck.map(copySnapshot),
        retired: (state.retired ?? []).map(copySnapshot),
        startTasks: (state.startTasks ?? []).map((task) => ({
            ...task,
            cardNos: [...task.cardNos],
        })),
    };
}

/** 深拷贝一张牌的快照（资源对象要拆开） */
function copySnapshot(card: PalmCardSnapshot): PalmCardSnapshot {
    return {
        ...card,
        resource: card.resource ? { ...card.resource } : undefined,
    };
}

export const usePalm = defineStore("palm", () => {
    const deck = ref<PalmCardInstance[]>([]);
    const roundsCompleted = ref(0);
    const turn = ref(0);
    /** 升级次数：执行旋转 / 翻面的累计次数 */
    const upgrades = ref(0);
    /** 村民能力带来的额外星星 */
    const bonusStars = ref(0);
    const gameOver = ref(false);
    const lastEvent = ref<string | null>(null);
    /** 开局补给资源，有效期一回合 */
    const bonus = ref<PalmCondition>({});
    /** 全部历史步骤，末位即当前状态；用于撤回与回放 */
    const steps = ref<PalmStep[]>([]);
    /** 开局效果待处理的队列（兽牙 / 幻象石头 / 伟大的斧） */
    const startTasks = ref<PalmStartTask[]>([]);
    /** 效果已结算、移出取牌循环的牌（仍留在牌库列表里） */
    const retiredCards = ref<PalmCardInstance[]>([]);
    const settings = ref<PalmSettings>({
        starter: false,
        villagers: false,
        achievements: [],
    });
    /** 每次状态变化自增，供自动存档监听 */
    const revision = ref(0);
    let uidSeed = 0;

    const topCards = computed(() => deck.value.slice(0, 2));
    const peekCards = computed(() => deck.value.slice(0, 3));
    /** 回合标记卡实例（用于展示当前轮次的牌面） */
    const trackerCard = computed(
        () => deck.value.find((card) => card.cardNo === TRACKER_NO) ?? null,
    );
    const storedCards = computed(() => deck.value.filter((card) => card.stored));
    /**
     * 已储存资源 + 距离「被顶到牌库顶而自动回收」还剩几回合。
     * 牌库每回合把顶上 1 张移到底部，所以这张牌前面有几张就还剩几回合。
     */
    const storedEntries = computed(() =>
        deck.value
            .map((card, index) => ({ card, turns: index }))
            .filter((entry) => entry.card.stored),
    );
    const storedCount = computed(() => storedCards.value.length);
    const round = computed(() =>
        Math.min(ROUNDS, roundsCompleted.value + 1),
    );
    /** 距离本轮结束（回合标记卡）还剩多少张 */
    const remaining = computed(() => {
        const index = deck.value.findIndex((card) => card.cardNo === TRACKER_NO);
        return index < 0 ? 0 : index + 1;
    });
    const score = computed(
        () =>
            deck.value.reduce((sum, card) => sum + repuOf(card), 0) +
            retiredCards.value.reduce((sum, card) => sum + repuOf(card), 0) +
            bonusStars.value,
    );
    /** 当前待处理的开局效果；为空表示开局已经处理完 */
    const startTask = computed(() => startTasks.value[0] ?? null);
    const hasBonus = computed(() => Object.keys(bonus.value).length > 0);
    const canUndo = computed(() => !gameOver.value && steps.value.length > 1);

    /** 当前生效的全部常驻能力（只看牌库中各牌当前的朝向） */
    const activeAbilities = computed(() =>
        deck.value.flatMap((card) => {
            // 横置成资源牌时只露出资源条，能力不生效
            if (card.stored) return [];
            // 村民技能是主动技：每一轮发动一次，持续到本轮结束
            if (card.source === "villager" && !card.activated) return [];
            const ability = abilityOf(card);
            return ability ? [{ card, ability }] : [];
        }),
    );

    /** 这张村民牌现在能否发动技能 */
    function canActivate(uid: string): boolean {
        const card = deck.value.find((item) => item.uid === uid);
        return Boolean(card && activateReason(card) === null);
    }

    /** 不能发动时的原因；null 表示可以发动 */
    function activateReason(card: PalmCardInstance): string | null {
        if (gameOver.value) return "本局已结束";
        if (card.source !== "villager") return "不是村民牌";
        if (card.area !== 2) return "先付资源招募它";
        if (card.stored) return "正在充当资源";
        if (card.activated) return "本轮已发动";
        if (!abilityOf(card)) return "这张村民没有技能";
        return null;
    }

    /** 已储存资源上限，村民能力可以把它抬高 */
    const storeLimit = computed(() => {
        let limit = MAX_STORED;
        for (const { ability } of activeAbilities.value) {
            if (ability.id === "storeLimit")
                limit = Math.max(limit, ability.value);
        }
        return limit;
    });

    /** 每执行一次升级（旋转 / 翻面）额外获得的星星 */
    const upgradeStars = computed(() =>
        activeAbilities.value.reduce(
            (sum, { ability }) =>
                sum + (ability.id === "upgradeScore" ? ability.amount : 0),
            0,
        ),
    );

    /** 消耗减免：所有花费里每种资源各减这么多（最低 0） */
    const discount = computed(() =>
        activeAbilities.value.reduce(
            (sum, { ability }) =>
                sum + (ability.id === "discount" ? ability.amount : 0),
            0,
        ),
    );

    /** 把减免作用到一组花费上 */
    function discounted(cost: PalmCost): PalmCost {
        const amount = discount.value;
        if (!amount) return cost;
        return cost.map((option) => {
            const next: PalmCondition = {};
            for (const [item, need] of Object.entries(option)) {
                const left = (need ?? 0) - amount;
                if (left > 0) next[item as PalmItem] = left;
            }
            return next;
        });
    }

    /** 「2 张房屋升级到 3⬆ 或更高」这类非资源门槛是否满足 */
    function requireMet(require?: { housesUpgraded?: number }): boolean {
        const need = require?.housesUpgraded;
        if (!need) return true;
        const done = deck.value.filter(
            (card) =>
                card.source === "basic" &&
                BasicCardNames[card.cardNo] === "房屋" &&
                card.area >= 3,
        ).length;
        return done >= need;
    }

    /** 这个行动被门槛挡住的原因；null 表示没被挡 */
    function blockedReason(
        card: { cardNo: number; area: PalmArea; source: PalmCardSource },
        kind: PalmActionKind,
    ): string | null {
        const content = contentOf(card.cardNo, card.area, card.source);
        if (actionCostOf(card.cardNo, card.area, kind, card.source) === null) {
            return null;
        }
        if (!content?.require || requireMet(content.require)) return null;
        return content.note ?? "条件未满足";
    }

    /** 某个行动的实际花费（已计入减免与门槛）；null 表示不可用 */
    function costOf(
        card: {
            cardNo: number;
            area: PalmArea;
            source: PalmCardSource;
            used?: boolean;
        },
        kind: PalmActionKind,
    ): PalmCost | null {
        const base = actionCostOf(card.cardNo, card.area, kind, card.source);
        if (base === null) return null;
        // 每场一次的效果用掉之后不能再生产
        if (kind === "produce" && card.used) return null;
        // 额外的牌面门槛（例如「2 张房屋升级到 3⬆ 或更高」）
        if (blockedReason(card, kind) !== null) return null;
        return discounted(base);
    }

    function makeCard(
        cardNo: number,
        source: PalmCardSource = "basic",
    ): PalmCardInstance {
        uidSeed += 1;
        return {
            uid: `${source === "villager" ? "v" : "c"}${cardNo}-${uidSeed}`,
            cardNo,
            source,
            area: areasOf({ source, cardNo })[0] ?? 1,
            stored: false,
        };
    }

    /** 当前局面导出为一份纯数据 */
    function captureState(): PalmState {
        return {
            roundsCompleted: roundsCompleted.value,
            turn: turn.value,
            upgrades: upgrades.value,
            bonusStars: bonusStars.value,
            lastEvent: lastEvent.value,
            bonus: { ...bonus.value },
            deck: deck.value.map(snapshot),
            retired: retiredCards.value.map(snapshot),
            startTasks: startTasks.value.map((task) => ({ ...task })),
        };
    }

    /** 单张牌导出为纯数据 */
    function snapshot(card: PalmCardInstance): PalmCardSnapshot {
        return {
            cardNo: card.cardNo,
            source: card.source,
            area: card.area,
            stored: card.stored,
            resource: card.resource ? { ...card.resource } : undefined,
            wild: card.wild,
            used: card.used,
            activated: card.activated,
        };
    }

    function restore(card: PalmCardSnapshot): PalmCardInstance {
        const source = card.source ?? "basic";
        uidSeed += 1;
        return {
            uid: `${source === "villager" ? "v" : "c"}${card.cardNo}-${uidSeed}`,
            cardNo: card.cardNo,
            source,
            area: card.area,
            stored: card.stored,
            resource: card.resource ? { ...card.resource } : undefined,
            wild: card.wild,
            used: card.used,
            activated: card.activated,
        };
    }

    /** 用一份纯数据覆盖当前局面 */
    function applyState(state: PalmState) {
        uidSeed = 0;
        deck.value = state.deck.map(restore);
        retiredCards.value = (state.retired ?? []).map(restore);
        startTasks.value = (state.startTasks ?? []).map((task) => ({
            ...task,
        }));
        roundsCompleted.value = state.roundsCompleted;
        turn.value = state.turn;
        upgrades.value = state.upgrades ?? 0;
        bonusStars.value = state.bonusStars ?? 0;
        lastEvent.value = state.lastEvent ?? null;
        bonus.value = { ...(state.bonus ?? {}) };
        gameOver.value = false;
        revision.value += 1;
    }

    function pushStep(label: string) {
        steps.value.push({ label, state: captureState() });
    }

    /** 开新局：洗混基础牌（可选村民 / 功绩牌），回合标记卡放在最底 */
    function start(next?: Partial<PalmSettings>) {
        if (next) settings.value = { ...settings.value, ...next };
        uidSeed = 0;
        const order: PalmCardInstance[] = cardNos.map((cardNo) =>
            makeCard(cardNo),
        );
        if (settings.value.villagers) {
            // 每局只随机抽 3 张村民加入牌库
            order.push(
                ...shuffled(villagerNos)
                    .slice(0, VILLAGER_DRAW)
                    .map((cardNo) => makeCard(cardNo, "villager")),
            );
        }
        const pick = new Set(settings.value.achievements ?? []);
        order.push(
            ...achievementNos
                .filter((cardNo) => pick.has(cardNo))
                .map((cardNo) => makeCard(cardNo, "achievement")),
        );
        deck.value = [
            ...shuffled(order),
            {
                uid: "tracker",
                cardNo: TRACKER_NO,
                source: "basic",
                area: 1,
                stored: false,
            },
        ];
        retiredCards.value = [];
        startTasks.value = buildStartTasks();
        roundsCompleted.value = 0;
        turn.value = 0;
        upgrades.value = 0;
        bonusStars.value = 0;
        gameOver.value = false;
        lastEvent.value = null;
        bonus.value = settings.value.starter ? { ...STARTER_BONUS } : {};
        steps.value = [];
        pushStep("开局");
        revision.value += 1;
    }

    function moveToBack(index: number) {
        const [card] = deck.value.splice(index, 1);
        if (card) deck.value.push(card);
    }

    /** 名字对应的基础牌编号，例如「船屋」→ 1 / 2 / 3 */
    function cardNosNamed(name: string): number[] {
        return cardNos.filter((no) => BasicCardNames[no] === name);
    }

    /** 勾选的功绩卡里，需要在开局时结算效果的那些 */
    function buildStartTasks(): PalmStartTask[] {
        const pick = new Set(settings.value.achievements ?? []);
        const tasks: PalmStartTask[] = [];
        if (pick.has(1)) {
            tasks.push({
                kind: "upgrade",
                featNo: 1,
                title: "兽牙",
                note: "游戏开始时，一个船屋升级 1⬆",
                cardNos: cardNosNamed("船屋"),
            });
        }
        if (pick.has(7)) {
            tasks.push({
                kind: "move",
                featNo: 7,
                title: "幻象石头",
                note: "游戏开始时，将任意一张牌移到牌组的前面",
                cardNos: [],
            });
        }
        if (pick.has(9)) {
            tasks.push({
                kind: "upgrade",
                featNo: 9,
                title: "伟大的斧",
                note: "游戏开始时，一个樵夫升级 1⬆",
                cardNos: cardNosNamed("樵夫"),
            });
        }
        return tasks;
    }

    /** 把一张牌移出取牌循环：仍然留在牌库列表里，但不再出现在牌库顶 */
    function retire(card: PalmCardInstance) {
        const index = deck.value.indexOf(card);
        if (index < 0) return;
        deck.value.splice(index, 1);
        card.stored = false;
        card.resource = undefined;
        card.wild = undefined;
        retiredCards.value.push(card);
    }

    /** 一项开局效果结算完毕：移出触发它的功绩卡，并记录一步 */
    function finishStartTask(task: PalmStartTask, label: string) {
        startTasks.value = startTasks.value.filter((item) => item !== task);
        const feat = deck.value.find(
            (card) =>
                card.source === "achievement" && card.cardNo === task.featNo,
        );
        if (feat) {
            const name = labelOf(feat);
            retire(feat);
            lastEvent.value = `${label}（${name} 已结算，移出取牌循环。）`;
        } else {
            lastEvent.value = label;
        }
        pushStep(label);
        revision.value += 1;
    }

    /** 结算「升级 1⬆」类开局效果：选择旋转或翻面 */
    function resolveStartUpgrade(uid: string, kind: PalmActionKind): boolean {
        const task = startTask.value;
        if (!task || task.kind !== "upgrade") return false;
        if (kind !== "rotate" && kind !== "flip") return false;
        const card = deck.value.find((item) => item.uid === uid);
        if (!card) return false;
        if (card.source !== "basic" || !task.cardNos.includes(card.cardNo)) {
            return false;
        }
        card.area =
            kind === "rotate" ? rotatedArea(card.area) : flippedArea(card.area);
        finishStartTask(
            task,
            `${task.title}：${labelOf(card)}${kind === "rotate" ? "旋转 180°" : "翻面"}，升级 1⬆。`,
        );
        return true;
    }

    /** 结算「移到牌组前面」类开局效果 */
    function resolveStartMove(uid: string): boolean {
        const task = startTask.value;
        if (!task || task.kind !== "move") return false;
        const index = deck.value.findIndex((item) => item.uid === uid);
        if (index < 0) return false;
        const [card] = deck.value.splice(index, 1);
        if (!card) return false;
        deck.value.unshift(card);
        finishStartTask(
            task,
            `${task.title}：${labelOf(card)}被移到牌库的最前面。`,
        );
        return true;
    }

    /** 开局补给只在本轮有效，轮次推进后立即失效 */
    function expireBonus() {
        if (roundsCompleted.value < 1 || !hasBonus.value) return;
        bonus.value = {};
        lastEvent.value = `${lastEvent.value ?? ""}（开局补给已过期）`;
    }

    /**
     * 每次牌序变化后结算牌库顶：回合标记卡 → 换轮；
     * 已储存的资源牌被顶上来 → 立即回收（资源浪费）。
     */
    function settle() {
        while (!gameOver.value && deck.value.length > 0) {
            const top = deck.value[0]!;
            if (top.cardNo === TRACKER_NO) {
                // 回合标记卡翻 / 转到下一个数字，再放到牌库底
                top.area = nextTrackerArea(top.area);
                moveToBack(0);
                roundsCompleted.value += 1;
                // 新一轮：村民技能重新可以发动一次
                [...deck.value, ...retiredCards.value].forEach((card) => {
                    card.activated = false;
                });
                if (roundsCompleted.value >= ROUNDS) {
                    gameOver.value = true;
                    lastEvent.value = `第 ${ROUNDS} 轮结束，本局结束。`;
                    expireBonus();
                    return;
                }
                lastEvent.value = `第 ${roundsCompleted.value} 轮结束，进入第 ${roundsCompleted.value + 1} 轮。`;
                expireBonus();
                continue;
            }
            if (top.used && !top.stored) {
                retire(top);
                continue;
            }
            if (top.stored) {
                top.stored = false;
                moveToBack(0);
                if (top.used) retire(top);
                lastEvent.value =
                    "已储存的资源牌被顶到牌库顶，按规则自动回收，资源浪费。";
                continue;
            }
            return;
        }
    }

    /**
     * 校验并执行支付：整张资源牌一次性消耗，多余资源作废；
     * 开局补给视为额外资源池，优先扣除。
     */
    function payWith(uids: string[], cost: PalmCost): boolean {
        const picked = uids
            .map((uid) => deck.value.find((card) => card.uid === uid))
            .filter((card): card is PalmCardInstance => Boolean(card));
        if (picked.length !== uids.length) return false;
        if (picked.some((card) => !card.stored)) return false;
        if (!cost.length) return picked.length === 0;

        const total = merge(totalGain(picked), bonus.value);
        const wild = totalWild(picked);
        const matched = cost.find((option) =>
            coversWithWild(total, wild, option),
        );
        if (!matched) return false;

        for (const [item, amount] of Object.entries(matched)) {
            const key = item as PalmItem;
            const fromBonus = Math.min(bonus.value[key] ?? 0, amount ?? 0);
            if (fromBonus <= 0) continue;
            const left = (bonus.value[key] ?? 0) - fromBonus;
            if (left > 0) bonus.value[key] = left;
            else delete bonus.value[key];
        }

        picked.forEach((card) => {
            card.stored = false;
            // 效果已用尽的牌交出资源后退出取牌循环
            if (card.used) retire(card);
        });
        return true;
    }

    /** 为某个花费挑一组数量最少的资源牌；null 表示付不起 */
    function findPayment(cost: PalmCost): string[] | null {
        if (!cost.length) return [];
        const pool = storedCards.value;
        let best: string[] | null = null;
        for (let mask = 0; mask < 1 << pool.length; mask += 1) {
            const subset = pool.filter((_, index) => mask & (1 << index));
            if (best !== null && subset.length >= best.length) continue;
            const total = merge(totalGain(subset), bonus.value);
            const wild = totalWild(subset);
            if (cost.some((option) => coversWithWild(total, wild, option))) {
                best = subset.map((card) => card.uid);
            }
        }
        return best;
    }

    const canAfford = (cost: PalmCost | null) =>
        cost !== null && findPayment(cost) !== null;

    /** 已选中的资源（含万能）能否付清这笔花费，供支付面板实时校验 */
    function canPay(uids: string[], cost: PalmCost): boolean {
        if (!cost.length) return true;
        const picked = uids
            .map((uid) => storedCards.value.find((card) => card.uid === uid))
            .filter((card): card is PalmCardInstance => Boolean(card));
        const total = merge(totalGain(picked), bonus.value);
        return cost.some((option) =>
            coversWithWild(total, totalWild(picked), option),
        );
    }

    /** 执行行动；index 为牌库顶的下标 0 或 1 */
    function perform(
        index: number,
        kind: PalmActionKind,
        payUids: string[] = [],
    ): boolean {
        if (gameOver.value) return false;
        if (index !== 0 && index !== 1) return false;
        const card = deck.value[index];
        if (!card || card.cardNo === TRACKER_NO) return false;

        const cost = costOf(card, kind);
        if (cost === null) return false;
        if (kind === "produce" && storedCount.value >= storeLimit.value)
            return false;

        if (!payWith(payUids, cost)) return false;

        const before = card.area;
        const label = labelOf(card);
        if (kind === "produce") {
            card.stored = true;
            card.resource = { ...gainAt(card.cardNo, card.area, card.source) };
            card.wild = wildAt(card);
            // 「每场一次」的牌生产过就标记为已消耗
            if (contentOf(card.cardNo, card.area, card.source)?.produce?.once) {
                card.used = true;
            }
            const gainText = [
                ...Object.entries(card.resource).map(
                    ([item, amount]) => `${amount}${item}`,
                ),
                card.wild ? `${card.wild}万能` : "",
            ]
                .filter(Boolean)
                .join(" ");
            lastEvent.value = `${label}被生产为资源（${gainText}）。`;
        } else {
            // 村民能力在升级前结算：这张牌自己转成村民面时，本次不计入
            const stars = upgradeStars.value;
            card.area =
                kind === "rotate" ? rotatedArea(before) : flippedArea(before);
            upgrades.value += 1;
            bonusStars.value += stars;
            lastEvent.value = `${label}${kind === "rotate" ? "旋转 180°" : "翻面"}。`;
            if (stars > 0) lastEvent.value += `村民能力 +${stars}★。`;
        }

        const stepLabel =
            kind === "produce"
                ? `生产 ${label}`
                : `${kind === "rotate" ? "旋转" : "翻面"} ${label}`;

        turn.value += 1;
        // 支付时可能有牌退出取牌循环，按下标会错位，改按实例定位
        const position = deck.value.indexOf(card);
        if (position >= 0) moveToBack(position);
        settle();
        pushStep(stepLabel);
        revision.value += 1;
        return true;
    }

    /** 弃掉牌库顶第 1 张 */
    function discardTop(): boolean {
        if (gameOver.value) return false;
        const top = deck.value[0];
        if (!top || top.cardNo === TRACKER_NO) return false;
        const label = labelOf(top);
        lastEvent.value = `弃掉 ${label}。`;
        turn.value += 1;
        moveToBack(0);
        settle();
        pushStep(`弃掉 ${label}`);
        revision.value += 1;
        return true;
    }

    /** 主动释放一张已储存的资源牌（不消耗回合） */
    function releaseStored(uid: string): boolean {
        const card = deck.value.find((item) => item.uid === uid);
        if (!card || !card.stored) return false;
        const label = labelOf(card);
        card.stored = false;
        if (card.used) retire(card);
        lastEvent.value = `丢弃了${label}。`;
        pushStep(`丢弃资源 ${label}`);
        revision.value += 1;
        return true;
    }

    /** 发动村民技能：免费，每轮一次，持续到本轮结束 */
    function activateVillager(uid: string): boolean {
        const card = deck.value.find((item) => item.uid === uid);
        if (!card || activateReason(card) !== null) return false;
        card.activated = true;
        const label = labelOf(card);
        lastEvent.value = `${label} 发动技能（持续到本轮结束）。`;
        pushStep(`发动 ${label}`);
        revision.value += 1;
        return true;
    }

    /** 撤回上一步 */
    function undo(): boolean {
        if (!canUndo.value) return false;
        steps.value.pop();
        const prev = steps.value[steps.value.length - 1];
        if (!prev) return false;
        applyState(prev.state);
        return true;
    }

    /** 导出存档（含历史步骤，支持撤回与回放） */
    function exportSave(): PalmSaveFile {
        const history: PalmStep[] = steps.value.map((step) => ({
            label: step.label,
            state: cloneState(step.state),
        }));
        // 末位强制对齐当前局面，避免漏掉未入栈的细微变化
        const last = history[history.length - 1];
        if (last) last.state = captureState();
        return {
            version: 4,
            savedAt: Date.now(),
            steps: history,
        };
    }

    /**
     * 把整局历史压成精简的复盘记录：每步只留「做了什么」和之后的关键状态，
     * 避免把 17–24 张的完整快照写进 localStorage。
     */
    function replaySteps(): PalmReplayStep[] {
        return steps.value.map((step) => {
            const { state } = step;
            const names = (card: PalmState["deck"][number]) =>
                labelOf({
                    cardNo: card.cardNo,
                    source: card.source ?? "basic",
                    area: card.area,
                });
            return {
                label: step.label,
                round: Math.min(ROUNDS, state.roundsCompleted + 1),
                turn: state.turn,
                score:
                    [...state.deck, ...(state.retired ?? [])].reduce(
                        (sum, card) =>
                            sum + repuAt(card.cardNo, card.area, card.source),
                        0,
                    ) + (state.bonusStars ?? 0),
                upgrades: state.upgrades ?? 0,
                top: state.deck.slice(0, 2).map((card) => ({
                    cardNo: card.cardNo,
                    source: card.source ?? "basic",
                    area: card.area,
                })),
                stored: state.deck
                    .filter((card) => card.stored)
                    .map((card) => ({
                        name: names(card),
                        gain: card.resource ?? gainAt(card.cardNo, card.area, card.source),
                        wild: card.wild ?? 0,
                    })),
            };
        });
    }

    /** 从存档恢复 */
    function importSave(file: PalmSaveFile): boolean {
        if (!file || !Array.isArray(file.steps) || !file.steps.length) {
            return false;
        }
        // 非法局面（例如功绩卡停在解锁条件面）直接拒绝
        if (!file.steps.every((step) => isState(step.state))) return false;
        steps.value = file.steps.map((step) => ({
            label: step.label,
            state: cloneState(step.state),
        }));
        const last = steps.value[steps.value.length - 1]!;
        applyState(last.state);
        lastEvent.value = `已恢复存档：第 ${roundsCompleted.value + 1} 轮，第 ${turn.value} 回合。`;
        return true;
    }

    return {
        deck,
        retiredCards,
        startTasks,
        startTask,
        resolveStartUpgrade,
        resolveStartMove,
        activateVillager,
        canActivate,
        activateReason,
        blockedReason,
        topCards,
        peekCards,
        trackerCard,
        storedCards,
        storedEntries,
        storedCount,
        round,
        roundsCompleted,
        remaining,
        turn,
        upgrades,
        bonusStars,
        score,
        storeLimit,
        activeAbilities,
        gameOver,
        lastEvent,
        bonus,
        hasBonus,
        steps,
        canUndo,
        settings,
        start,
        perform,
        discardTop,
        releaseStored,
        undo,
        exportSave,
        importSave,
        replaySteps,
        revision,
        findPayment,
        canAfford,
        canPay,
        costOf,
        discount,
    };
});
