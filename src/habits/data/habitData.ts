import habitCover from '@/assets/covers/habits.webp'
import habitGameplay from '@/habits/content/habitGameplay.md?raw'
import type { GameDetail } from '@/types/game'
import { HabitStates, type EffectRanges, type HabitCard, type SkillLoadout } from '../modal/habitModal'
import { defineStore } from 'pinia'
import { type Ref, computed, ref } from 'vue'
import { randint } from '@/utils/utils'
import { drawSkillCandidates, type SkillKey } from './skills'

/**
 * 目前唯一的游戏。文案为占位稿，直接改这里即可同步主页卡片与详情页介绍。
 */
export const habitGame: GameDetail = {
    name: '习惯',
    tagline: '智商考验，牵一发而动全身。',
    cover: habitCover,
    category: '策略',
    duration: '3~5 分钟',
    players: '1 人',
    age: '8 岁以上',
    version: 'v0.1 正式版',
    tags: ['九卡', '谜题', '轻量'],
    status: '已上线',
    accent: '#34D399',
    gradient: 'linear-gradient(150deg, #064e3b 0%, #0b1220 60%, #05060a 100%)',
    gameplay: habitGameplay,
    author: {
        name: 'Chris de Villiers',
        role: '设计师',
        links: [
            { label: 'BGG', value: 'boardgamegeek.com/boardgame/422255/habits', href: 'https://boardgamegeek.com/boardgame/422255/habits' },
        ],
    },
}

export const habitsText = {
    a1: "短暂放松",
    b1: "借酒麻痹",

    a2: "向外探索",
    b2: "停滞不前",

    a3: "腾出时间",
    b3: "寻找借口",

    a4: "早起",
    b4: "熬夜",

    a5: "自己做饭",
    b5: "食用外卖",

    a6: "始终保持联络",
    b6: "一直沉迷网络",

    a7: "尝试一下",
    b7: "轻言放弃",

    a8: "张弛有度",
    b8: "身心透支",

    a9: "线下相聚",
    b9: "沉迷社媒"
};

export interface HabitStep {
    title: string;
    detail: string;
    tip?: string;
}

export const useHabits = defineStore('habits', () => {
    const states = ref(new HabitStates());
    const dices = ref([1, 1]);
    /** 每颗骰子剩余可用点数，与 dices 下标一一对应 */
    const dicesLeft = ref([1, 1]);
    const step = ref(0);
    /** 选中的卡牌下标（1–9），null 表示未选中 */
    const selectedIdx: Ref<number | null> = ref(null);
    /** 交换行动：已完成支付、等待选择第二张牌时记录第一张牌的下标 */
    const swapFrom: Ref<number | null> = ref(null);
    /** 待完成的交换已支付的骰子点数，取消时原额返还 */
    const swapPaid: Ref<[number, number] | null> = ref(null);
    /** 本回合是否已经执行过「使用」或「交换」 */
    const hasActed = ref(false);
    /** 对局结果；null 表示仍在进行 */
    const result: Ref<"win" | "lose" | null> = ref(null);
    /** 已进行的回合数 */
    const round = ref(0);
    /** 本局技能配置；null 表示尚未完成选取 */
    const loadout: Ref<SkillLoadout | null> = ref(null);
    /** 主技能候选（每次抽取后固定，不重抽） */
    const mainCandidates: Ref<SkillKey[]> = ref([]);
    /** 副技能候选，独立随机，允许与主技能候选重叠 */
    const subCandidates: Ref<SkillKey[]> = ref([]);
    /** 本回合已完成的交换次数，用于折冲 III 的首次减费 */
    const swapCount = ref(0);
    /** 本回合是否已发动孤注一掷，每回合限一次 */
    const allInUsed = ref(false);
    /** 孤注一掷的结果说明，用于面板提示 */
    const allInResult: Ref<string | null> = ref(null);
    /** 协防：已保护第一张、等待选择第二张时的下标 */
    const coverFrom: Ref<number | null> = ref(null);
    /** 太公兵法：本局剩余重掷次数 */
    const rerollLeft = ref(0);
    /** 诈降：本局剩余使用次数 */
    const feintLeft = ref(0);
    /** 诈降：敌方需跳过的行动回合数 */
    const enemySkip = ref(0);
    /** 诈降：下一次投掷是否要改写骰子 */
    const feintPending = ref(false);
    /** 诈降改骰的结果说明 */
    const feintResult: Ref<string | null> = ref(null);
    /** 预言：本局剩余次数 */
    const anchorLeft = ref(0);
    /** 预言：已指定的敌方下一次标记落点（1–9） */
    const anchorTarget: Ref<number | null> = ref(null);
    /** 预言：本次已支付的点数，落点不合法时原额返还 */
    const anchorPaid: Ref<[number, number] | null> = ref(null);
    /** 预言：落点不合法等提示信息 */
    const anchorNotice: Ref<string | null> = ref(null);
    /** 计谋：谋略点，跨回合保留 */
    const strategyPoints = ref(0);
    /** 计谋：本次投掷是否已使用 a / b */
    const tacticsAUsed = ref(false);
    const tacticsBUsed = ref(false);
    /** 狂战士：怒气值 */
    const surgeRage = ref(0);
    /** 狂战士：怒气爆发等提示信息 */
    const surgeNotice: Ref<string | null> = ref(null);
    /** 标要：正在挑选候选卡牌 */
    const markPicking = ref(false);
    /** 标要：已挑选的候选卡牌下标 */
    const markPicked = ref<number[]>([]);
    /** 标要：重要习惯到期后等待玩家选择翻面目标（III 级） */
    const markFlipPending = ref(false);
    /** 标要：到期时需要翻面的性质 */
    const markFlipNature: Ref<"Good" | "Bad" | null> = ref(null);
    /** 标要：说明与提示 */
    const markNotice: Ref<string | null> = ref(null);
    /** 骄兵必败：士气值 */
    const morale = ref(0);
    /** 骄兵必败：投掷阶段结束后等待选择士气 +1 / −1 */
    const moraleWaiting = ref(false);
    /** 骄兵必败：本次投掷的说明 */
    const moraleNotice: Ref<string | null> = ref(null);
    /** 警戒：反弹判定说明 */
    const vigilNotice: Ref<string | null> = ref(null);
    /** 乾坤挪移：本次交换还可以纳入的坏习惯数量 */
    const swapBadLeft = ref(0);

    /**
     * 当前本局拥有效能等级：主技能 II、副技能 I、同名合并 III，未拥有则 0
     */
    function skillLevel(key: SkillKey): 0 | 1 | 2 | 3 {
        const current = loadout.value;
        if (!current) return 0;
        if (current.kind === "merged") return current.skill === key ? 3 : 0;
        if (current.main === key) return 2;
        if (current.sub === key) return 1;
        return 0;
    }

    /** 交换费用：基础 6，折冲按等级降低；III 级每回合首次交换额外 −1，最低 0 */
    const swapCost = computed(() => {
        const level = skillLevel("bargain");
        const base = level === 3 ? 3 : level === 2 ? 4 : level === 1 ? 5 : 6;
        const firstSwapBonus = level === 3 && swapCount.value === 0 ? 1 : 0;
        return Math.max(0, base - firstSwapBonus);
    });

    /** 乾坤挪移：本次交换最多可纳入的坏习惯数量 */
    const purgeBadMax = computed(() => {
        const level = skillLevel("purge");
        return level === 3 ? 2 : level > 0 ? 1 : 0;
    });

    /** 乾坤挪移 I 级：纳入坏习惯的额外费用 */
    const purgeFee = computed(() => (skillLevel("purge") === 1 ? 2 : 0));

    /** 纳入坏习惯的交换费用 */
    const swapCostWithBad = computed(() => swapCost.value + purgeFee.value);

    /** 能否以这张牌发起交换：好习惯需未受保护，坏习惯仅乾坤挪移 III 级允许 */
    function canStartSwap(idx: number | null): boolean {
        if (step.value !== 3 || idx == null) return false;
        if (swapFrom.value != null || coverFrom.value != null) return false;
        const card = states.value.getCard(idx);
        if (!card) return false;
        if (card.attu === "Good") return !card.protected;
        return skillLevel("purge") === 3;
    }

    /** 能否把这张牌作为交换的另一张：坏习惯受本次乾坤挪移额度的限制 */
    function canSwapWith(idx: number | null): boolean {
        if (swapFrom.value == null || idx == null) return false;
        if (idx === swapFrom.value) return true;
        const card = states.value.getCard(idx);
        if (!card) return false;
        if (card.attu === "Good") return !card.protected;
        return swapBadLeft.value > 0;
    }

    /** 开始一次交换：记录第一张牌与已支付点数，并确定可纳入的坏习惯额度 */
    function beginSwap(idx: number, withBad: boolean): boolean {
        if (!canStartSwap(idx)) return false;
        const card = states.value.getCard(idx);
        const used = card.attu === "Bad" ? 1 : 0;
        const allowance = withBad
            ? Math.max(0, purgeBadMax.value - used)
            : 0;
        swapFrom.value = idx;
        swapBadLeft.value = allowance;
        return true;
    }

    /** 奉还骰面；孤注一掷等改骰后，剩余点数同步为新面值 */
    function setDieValue(index: number, value: number) {
        dices.value[index] = value;
        dicesLeft.value[index] = value;
    }

    /** 孤注一掷是否可发动：行动阶段、本回合尚未行动且未发动过 */
    const allInAvailable = computed(
        () =>
            step.value === 3 &&
            !hasActed.value &&
            !allInUsed.value &&
            coverFrom.value == null &&
            skillLevel("allIn") > 0,
    );

    /**
     * 发动孤注一掷，返回本次判定结果说明。
     * I：随机 1 枚；II：点数最小的 1 枚；III：点数最小的 2 枚整体判定。
     * 75% 变为 6，否则变为 1。
     */
    function rollAllIn(): string | null {
        const level = skillLevel("allIn");
        if (!level || !allInAvailable.value) return null;

        const values = [...dices.value];
        let picked: number[];

        if (level === 1) {
            picked = [Math.floor(Math.random() * values.length)];
        } else if (level === 2) {
            const min = Math.min(...values);
            const candidates = values
                .map((value, index) => (value === min ? index : -1))
                .filter((index) => index >= 0);
            picked = [
                candidates[Math.floor(Math.random() * candidates.length)] ?? 0,
            ];
        } else {
            picked = values
                .map((value, index) => ({ value, index }))
                .sort((a, b) => a.value - b.value)
                .slice(0, 2)
                .map((entry) => entry.index);
        }

        const success = Math.random() < 0.75;
        const next = success ? 6 : 1;
        picked.forEach((index) => setDieValue(index, next));

        allInUsed.value = true;
        const names = picked
            .sort((a, b) => a - b)
            .map((index) => `骰子 ${index + 1}`)
            .join("、");
        allInResult.value = `${success ? "成功" : "失败"}：${names} 变为 ${next} 点`;
        return allInResult.value;
    }

    /** 协防是否可触发额外目标 */
    const coverAvailable = computed(() => {
        const level = skillLevel("cover");
        if (!level) return false;
        if (level === 3) return true;
        // I / II 级要求本回合尚未进行「激活」或「交换」
        if (hasActed.value) return false;
        if (level === 2) return true;
        // I 级还要求本次保护的点数和 ≥ 6
        const sum = dicesLeft.value.reduce((total, left) => total + left, 0);
        return sum >= 6;
    });

    /** 放弃协防的额外目标：保留已完成的保护 */
    function clearCover() {
        coverFrom.value = null;
    }

    /** 太公兵法每局可用次数上限 */
    function rerollLimit() {
        const level = skillLevel("reroll");
        return level === 3 ? 6 : level > 0 ? 4 : 0;
    }

    /** 太公兵法是否可重掷：行动前的行动阶段 */
    const rerollAvailable = computed(
        () =>
            step.value === 3 &&
            !hasActed.value &&
            coverFrom.value == null &&
            rerollLeft.value > 0 &&
            skillLevel("reroll") > 0,
    );

    /**
     * 重掷骰子。I 级忽略传入值、重掷全部；II / III 级重掷至多 2 枚。
     * @returns 是否成功重掷
     */
    function rerollDice(indices: number[] = []): boolean {
        const level = skillLevel("reroll");
        if (!level || !rerollAvailable.value) return false;

        const targets =
            level === 1 ? dices.value.map((_, i) => i) : [...indices].slice(0, 2);
        if (!targets.length) return false;

        targets.forEach((index) => setDieValue(index, randint(1, 6)));
        rerollLeft.value = Math.max(0, rerollLeft.value - 1);
        return true;
    }

    /** 给指定格子上的牌施加保护 */
    function protectCard(idx: number, turns = 1) {
        const card = states.value.getCard(idx);
        if (!card) return;
        card.protected = true;
        card.protectTurns = turns;
    }

    /** 幕僚：坏习惯翻面为好习惯后，按等级决定保护回合 */
    function grantAfterglow(card: HabitCard) {
        const level = skillLevel("afterglow");
        if (!level) return;
        const lucky = Math.random() < 0.5;
        const turns =
            level === 1
                ? lucky
                    ? 1
                    : 0
                : level === 2
                    ? lucky
                        ? 2
                        : 1
                    : lucky
                        ? 3
                        : 2;
        if (turns <= 0) return;
        card.protected = true;
        card.protectTurns = turns;
    }

    /** 翻面一张牌；若由坏习惯变为好习惯，触发幕僚、士气 +3 */
    function flipCard(row: number, col: number): boolean {
        const card = states.value.getCard(row, col);
        if (!card || card.protected) return false;
        const wasBad = card.attu === "Bad";
        states.value.flip(row, col);
        if (card.attu === "Bad") {
            gainRage();
            addMorale(-3);
            return true;
        }
        if (!wasBad) return false;
        addMorale(3);
        grantAfterglow(card);
        // 预言指定的落点被翻回好习惯：技能失效，立即返还费用（本回合仍可使用该点数）
        if (anchorTarget.value === states.value.posToIdx([row, col])) {
            refundAnchor("预言落点已变回好习惯，已取消本次技能并返还费用。");
        }
        return true;
    }

    /** 把好习惯翻面为坏习惯：敌方触发、诈降、标要等共用 */
    function flipToBad(row: number, col: number, source?: number): boolean {
        const card = states.value.getCard(row, col);
        if (!card || card.attu !== "Good") return false;
        if (card.protected) {
            // 警戒：受保护的牌即将被翻面，防止翻面并按概率反弹来源
            if (source != null) tryVigil(card, source);
            return false;
        }
        states.value.flip(row, col);
        gainRage();
        addMorale(-3);
        return true;
    }

    /** 警戒：反弹概率 */
    const vigilChance = computed(() => {
        const level = skillLevel("vigil");
        return level === 1 ? 0.15 : level === 2 ? 0.3 : level === 3 ? 0.45 : 0;
    });

    /** 警戒：受保护的牌免于翻面后，尝试让伤害来源翻面 */
    function tryVigil(target: HabitCard, source: number) {
        const chance = vigilChance.value;
        if (!chance) return;
        const targetName = habitsText[target.toString()];
        const sourceCard = states.value.getCard(source);
        if (!sourceCard) return;
        const sourceName = habitsText[sourceCard.toString()];
        if (Math.random() >= chance) {
            vigilNotice.value = `警戒：${targetName} 未触发反弹。`;
            return;
        }
        if (sourceCard.protected) {
            vigilNotice.value = `警戒：已防止翻面，但来源「${sourceName}」受保护，反弹无效。`;
            return;
        }
        const [row, col] = states.value.idxToPos(source);
        flipCard(row, col);
        vigilNotice.value = `警戒：${targetName} 反弹成功生效，来源「${sourceName}」被翻面。`;
    }

    /** 按下标翻面：按原性质选择入口，保证怒气 / 士气 / 幕僚等联动一致 */
    function flipByIndex(idx: number): boolean {
        const card = states.value.getCard(idx);
        if (!card) return false;
        const [row, col] = states.value.idxToPos(idx);
        return card.attu === "Good"
            ? flipToBad(row, col)
            : flipCard(row, col);
    }

    /** 回合开始：所有保护回合数 −1，归零则解除 */
    function tickProtection() {
        for (let i = 1; i <= 9; i++) {
            const card = states.value.getCard(i);
            if (!card || !card.protected) continue;
            card.protectTurns = Math.max(0, card.protectTurns - 1);
            if (card.protectTurns === 0) card.protected = false;
        }
    }

    /** 骄兵必败：士气变化（好习惯被翻面 −3、坏习惯被翻面 +3） */
    function addMorale(delta: number) {
        if (!skillLevel("morale")) return;
        morale.value += delta;
    }

    /** 骄兵必败：加值区间 */
    const moraleWindow = computed<[number, number]>(() => {
        const level = skillLevel("morale");
        return level === 1 ? [3, 3] : [2, 4];
    });

    /** 骄兵必败：进入士气选择阶段（投掷阶段结束后） */
    function beginMoralePhase() {
        moraleNotice.value = null;
        moraleWaiting.value = skillLevel("morale") > 0;
    }

    /**
     * 骄兵必败：选择士气 +1 / −1（III 级可 0 / ±1 / ±2），
     * 随后判定本次投掷是否获得加值。
     */
    function applyMoraleChoice(delta: number): boolean {
        const level = skillLevel("morale");
        if (!level || !moraleWaiting.value) return false;
        const allowed =
            level === 3 ? [0, 1, -1, 2, -2] : [1, -1];
        if (!allowed.includes(delta)) return false;

        morale.value += delta;
        moraleWaiting.value = false;

        const [lo, hi] = moraleWindow.value;
        if (morale.value < lo || morale.value > hi) {
            moraleNotice.value = `士气 ${morale.value} 不在 [${lo}, ${hi}] 区间，本次投掷没有加值。`;
            return true;
        }

        const raised: number[] = [];
        for (let i = 0; i < dices.value.length; i++) {
            const before = dices.value[i] ?? 0;
            const after = Math.min(6, before + 1);
            setDieValue(i, after);
            if (after > before) raised.push(i + 1);
        }

        let extra = "";
        if (level === 3) {
            let minIndex = 0;
            dices.value.forEach((value, index) => {
                if (value < (dices.value[minIndex] ?? 0)) minIndex = index;
            });
            const before = dices.value[minIndex] ?? 0;
            if (before < 6) {
                setDieValue(minIndex, before + 1);
                extra = `，其中点数最小的第 ${minIndex + 1} 枚再 +1`;
            }
        }

        moraleNotice.value = raised.length
            ? `士气 ${morale.value} 在 [${lo}, ${hi}] 区间：第 ${raised.join("、")} 枚骰子点数 +1${extra}。`
            : `士气 ${morale.value} 在 [${lo}, ${hi}] 区间，但骰子已达 6 点，无实际加值。`;
        return true;
    }

    /** 标要：需要挑选的候选数量 */
    const markPickCount = computed(() => {
        const level = skillLevel("mark");
        return level === 1 ? 6 : level === 2 ? 4 : level === 3 ? 2 : 0;
    });

    /** 标要：场上重要习惯的下标 */
    const importantIdx = computed(() => {
        for (let i = 1; i <= 9; i++) {
            if (states.value.getCard(i)?.important) return i;
        }
        return null;
    });

    /** 标要是否可发动：行动阶段、场上没有重要习惯 */
    const markAvailable = computed(
        () =>
            skillLevel("mark") > 0 &&
            step.value === 3 &&
            importantIdx.value == null &&
            !markPicking.value &&
            !markFlipPending.value,
    );

    /** 标要：开始挑选候选卡牌 */
    function beginMarkPick(): boolean {
        if (!markAvailable.value) return false;
        markPicking.value = true;
        markPicked.value = [];
        markNotice.value = null;
        return true;
    }

    /** 标要：取消挑选 */
    function cancelMarkPick() {
        markPicking.value = false;
        markPicked.value = [];
    }

    /** 标要：点击卡牌增减候选 */
    function toggleMarkPick(idx: number): boolean {
        if (!markPicking.value) return false;
        if (!states.value.getCard(idx)) return false;
        if (markPicked.value.includes(idx)) {
            markPicked.value = markPicked.value.filter((item) => item !== idx);
            return true;
        }
        if (markPicked.value.length >= markPickCount.value) return false;
        markPicked.value = [...markPicked.value, idx];
        return true;
    }

    /** 标要：随机一个候选成为重要习惯，持续 3 个完整回合 */
    function confirmMarkPick(): boolean {
        if (!markPicking.value) return false;
        if (markPicked.value.length < markPickCount.value) return false;
        const idx = markPicked.value[randint(0, markPicked.value.length - 1)]!;
        const card = states.value.getCard(idx);
        if (!card) return false;
        card.important = true;
        card.importantTurns = 3;
        markPicking.value = false;
        markPicked.value = [];
        // 位置与剩余回合由面板状态行展示，这里不再重复一行说明
        markNotice.value = null;
        return true;
    }

    /** 标要：回合开始倒数；归零时转为普通并翻面 */
    function tickImportant() {
        for (let i = 1; i <= 9; i++) {
            const card = states.value.getCard(i);
            if (!card?.important) continue;
            card.importantTurns = Math.max(0, card.importantTurns - 1);
            if (card.importantTurns > 0) continue;
            card.important = false;
            expireImportant(card.attu);
        }
    }

    /** 标要：重要习惯转为普通后，翻面一张性质相反的习惯 */
    function expireImportant(nature: "Good" | "Bad") {
        const level = skillLevel("mark");
        if (!level) return;
        const opposite = nature === "Good" ? "Bad" : "Good";
        const candidates: number[] = [];
        for (let i = 1; i <= 9; i++) {
            const card = states.value.getCard(i);
            if (card && card.attu === opposite) candidates.push(i);
        }
        if (!candidates.length) {
            markNotice.value = `重要习惯已转为普通，但场上没有${opposite === "Good" ? "好习惯" : "坏习惯"
                }，本次翻面作废。`;
            return;
        }
        if (level === 3) {
            markFlipPending.value = true;
            markFlipNature.value = opposite;
            markNotice.value = `重要习惯已转为普通，请点击 1 个${opposite === "Good" ? "好习惯" : "坏习惯"
                }翻面。`;
            return;
        }
        const idx = candidates[randint(0, candidates.length - 1)]!;
        settleMarkFlip(idx);
    }

    /** 标要：III 级由玩家选择翻面目标 */
    function resolveMarkFlip(idx: number): boolean {
        if (!markFlipPending.value) return false;
        const card = states.value.getCard(idx);
        if (!card || card.attu !== markFlipNature.value) return false;
        settleMarkFlip(idx);
        return true;
    }

    /** 标要：执行翻面并收尾 */
    function settleMarkFlip(idx: number) {
        const card = states.value.getCard(idx);
        flipByIndex(idx);
        markFlipPending.value = false;
        markFlipNature.value = null;
        if (card) {
            const [row, col] = states.value.idxToPos(idx);
            markNotice.value = `重要习惯已转为普通，第 ${row} 行第 ${col} 列的「${habitsText[card.toString()]}」被翻面。`;
        }
    }

    /** 诈降每局可用次数 */
    function feintLimit() {
        const level = skillLevel("feint");
        return level === 3 ? 4 : level > 0 ? 3 : 0;
    }

    /** 诈降是否可发动：选中的必须是未受保护的好习惯 */
    const feintAvailable = computed(() => {
        if (step.value !== 3) return false;
        if (feintLeft.value <= 0) return false;
        if (swapFrom.value != null || coverFrom.value != null) return false;
        const idx = selectedIdx.value;
        if (idx == null) return false;
        const card = states.value.getCard(idx);
        return Boolean(card) && card.attu === "Good" && !card.protected;
    });

    /** 发动诈降：翻面选中的好习惯，敌人跳过下次行动，下次投掷改写骰子 */
    function useFeint(): boolean {
        if (!feintAvailable.value) return false;
        const idx = selectedIdx.value!;
        const [row, col] = states.value.idxToPos(idx);
        flipToBad(row, col);
        feintLeft.value = Math.max(0, feintLeft.value - 1);
        enemySkip.value = Math.max(enemySkip.value, 1);
        feintPending.value = true;
        selectedIdx.value = null;
        return true;
    }

    /** 预言每局可用次数 */
    function anchorLimit() {
        const level = skillLevel("anchor");
        return level === 3 ? 4 : level === 2 ? 3 : level === 1 ? 2 : 0;
    }

    /** 预言每次支付的费用 */
    const anchorCost = computed(() => {
        const level = skillLevel("anchor");
        return level === 3 ? 3 : level === 2 ? 4 : level === 1 ? 6 : 0;
    });

    /** 预言是否可发动：行动阶段、有次数、无待完成动作、点数足够支付 */
    const anchorAvailable = computed(() => {
        if (step.value !== 3) return false;
        if (anchorLeft.value <= 0) return false;
        if (anchorTarget.value != null) return false;
        if (swapFrom.value != null || coverFrom.value != null) return false;
        const sum = dicesLeft.value.reduce((total, left) => total + left, 0);
        return sum >= anchorCost.value;
    });

    /** 选定落点：取当前选中的卡牌作为敌方下一次标记的落点，合法则等待支付 */
    function armAnchor(idx: number | null): boolean {
        if (!anchorAvailable.value) return false;
        if (idx == null) {
            anchorNotice.value = "请先点击一张坏习惯卡牌，再使用预言。";
            return false;
        }
        if (states.value.getCard(idx)?.attu !== "Bad") {
            anchorNotice.value = "预言只能指定坏习惯作为落点，请重新选择。";
            return false;
        }
        anchorTarget.value = idx;
        anchorNotice.value = null;
        return true;
    }

    /** 放弃已指定的落点（未支付或已失效） */
    function clearAnchorTarget() {
        anchorTarget.value = null;
    }

    /** 支付成功后扣减预言次数，并记录本次支付 */
    function consumeAnchor(pays: [number, number]) {
        anchorLeft.value = Math.max(0, anchorLeft.value - 1);
        anchorPaid.value = [pays[0], pays[1]];
    }

    /** 预言落点不合法：取消技能，返还点数与次数 */
    function refundAnchor(
        notice = "预言落点不合法，已取消本次技能并返还费用。",
    ) {
        if (anchorPaid.value) {
            refundDices([...anchorPaid.value]);
            anchorPaid.value = null;
        }
        anchorLeft.value = Math.min(
            anchorLimit(),
            anchorLeft.value + 1,
        );
        anchorTarget.value = null;
        anchorNotice.value = notice;
    }

    /** 指定落点已被正常消耗 */
    function settleAnchor() {
        anchorTarget.value = null;
        anchorPaid.value = null;
        anchorNotice.value = null;
    }

    /** 狂战士：怒气累积步长（I 级 1，II / III 级 2） */
    const surgeGain = computed(() => {
        const level = skillLevel("surge");
        return level === 1 ? 1 : level > 0 ? 2 : 0;
    });

    /** 狂战士：回合开始时怒气衰减的概率（II 级必定衰减） */
    const surgeDecayChance = computed(() => {
        const level = skillLevel("surge");
        return level === 1 ? 0.75 : level === 2 ? 1 : level === 3 ? 0.7 : 0;
    });

    /** 狂战士：有 1 个好习惯被翻面 */
    function gainRage() {
        if (!surgeGain.value) return;
        surgeRage.value += surgeGain.value;
    }

    /** 狂战士：回合开始时的怒气衰减判定 */
    function surgeRoundStart() {
        surgeNotice.value = null;
        if (!surgeGain.value) return;
        if (surgeRage.value > 0 && Math.random() < surgeDecayChance.value) {
            surgeRage.value = Math.max(0, surgeRage.value - 1);
        }
    }

    /** 狂战士：投掷阶段结束后的怒气爆发判定 */
    function surgeAfterRoll(): boolean {
        if (!surgeGain.value || surgeRage.value <= 2) return false;
        surgeRage.value = 0;
        enemySkip.value++;
        surgeNotice.value = "狂战士：怒气爆发，敌方跳过其下一个行动回合。";
        return true;
    }

    /** 计谋：谋略点上限 */
    const strategyCap = computed(() => {
        const level = skillLevel("tactics");
        return level === 1 ? 5 : level > 0 ? 7 : 0;
    });

    /** 计谋：投掷阶段结束后、行动前 */
    const tacticsPhaseOpen = computed(
        () => step.value === 3 && !hasActed.value,
    );

    /** 计谋 a 是否可用：I / II 级与 b 二选一，III 级各一次 */
    const tacticsAAllowed = computed(() => {
        const level = skillLevel("tactics");
        if (!level || !tacticsPhaseOpen.value || tacticsAUsed.value) return false;
        return level === 3 ? true : !tacticsBUsed.value;
    });

    /** 计谋 b 是否可用 */
    const tacticsBAllowed = computed(() => {
        const level = skillLevel("tactics");
        if (!level || !tacticsPhaseOpen.value || tacticsBUsed.value) return false;
        if (strategyPoints.value < 1) return false;
        return level === 3 ? true : !tacticsAUsed.value;
    });

    /**
     * 计谋 a：选择 1 枚骰子，点数为 X，谋略点 +max(0, X−k)（k = 2 / 1 / 0），
     * 随后该骰子本阶段视为 1 点。
     */
    function useTacticsA(index: number): boolean {
        const level = skillLevel("tactics");
        if (!level || !tacticsAAllowed.value) return false;
        const x = dicesLeft.value[index] ?? 0;
        if (x < 1) return false;
        const gain = Math.max(0, x - (level === 1 ? 2 : level === 2 ? 1 : 0));
        strategyPoints.value = Math.min(
            strategyCap.value,
            strategyPoints.value + gain,
        );
        dicesLeft.value[index] = 1;
        tacticsAUsed.value = true;
        return true;
    }

    /** 计谋 b：支付 X 点谋略点，使 1 枚骰子点数 +X（最高 6） */
    function useTacticsB(index: number, x: number): boolean {
        const level = skillLevel("tactics");
        if (!level || !tacticsBAllowed.value) return false;
        const left = dicesLeft.value[index] ?? 0;
        const max = Math.min(strategyPoints.value, 6 - left);
        if (x < 1 || x > max) return false;
        strategyPoints.value -= x;
        dicesLeft.value[index] = left + x;
        tacticsBUsed.value = true;
        return true;
    }

    /**
     * 投掷结束后结算诈降的改骰：     * I 级最小骰 ≤2 改为 6；II 级 ≤3 改为 6；III 级最小两枚中所有 ≤3 的骰子改为 6。
     */
    function applyFeintDice(): string | null {
        if (!feintPending.value) return null;
        feintPending.value = false;
        feintResult.value = null;

        const level = skillLevel("feint");
        if (!level) return null;

        const order = dices.value
            .map((value, index) => ({ value, index }))
            .sort((a, b) => a.value - b.value);

        let targets: number[];
        if (level === 3) {
            targets = order
                .slice(0, 2)
                .filter((entry) => entry.value <= 3)
                .map((entry) => entry.index);
        } else {
            const threshold = level === 1 ? 2 : 3;
            const min = order[0];
            targets = min && min.value <= threshold ? [min.index] : [];
        }

        if (!targets.length) {
            feintResult.value = "诈降改骰：本次投掷没有满足条件的骰子";
            return feintResult.value;
        }

        targets.forEach((index) => setDieValue(index, 6));
        const names = targets
            .sort((a, b) => a - b)
            .map((index) => `骰子 ${index + 1}`)
            .join("、");
        feintResult.value = `诈降改骰：${names} 变为 6 点`;
        return feintResult.value;
    }

    /** 扣除骰子点数；剩余点数保留，可用于后续行动 */
    function payDices(pays: number[]) {
        pays.forEach((pay, i) => {
            const left = dicesLeft.value[i];
            if (left === undefined) return;
            dicesLeft.value[i] = Math.max(0, left - pay);
        });
    }

    /** 返还骰子点数，不会超过骰子面值 */
    function refundDices(pays: number[]) {
        pays.forEach((pay, i) => {
            const left = dicesLeft.value[i];
            const face = dices.value[i];
            if (left === undefined || face === undefined) return;
            dicesLeft.value[i] = Math.min(face, left + pay);
        });
    }

    /** 放弃尚未完成的交换：返还已支付的点数 */
    function cancelSwap() {
        if (swapPaid.value) {
            refundDices([...swapPaid.value]);
            swapPaid.value = null;
        }
        swapFrom.value = null;
        swapBadLeft.value = 0;
    }

    /** 生成本局的技能候选；已有候选时不重复抽取 */
    function beginSkillSelection() {
        if (!mainCandidates.value.length) {
            mainCandidates.value = drawSkillCandidates(3);
        }
        if (!subCandidates.value.length) {
            subCandidates.value = drawSkillCandidates(3);
        }
    }

    /** 确认本局技能配置 */
    function setLoadout(next: SkillLoadout) {
        loadout.value = next;
    }

    /** 重新开始技能选取（重开对局时保留已有配置，只有显式调用才清空） */
    function clearLoadout() {
        loadout.value = null;
        mainCandidates.value = [];
        subCandidates.value = [];
    }

    return {
        states,
        step,
        dices,
        dicesLeft,
        selectedIdx,
        swapFrom,
        swapPaid,
        hasActed,
        result,
        round,
        loadout,
        mainCandidates,
        subCandidates,
        swapCount,
        swapCost,
        swapCostWithBad,
        purgeBadMax,
        purgeFee,
        swapBadLeft,
        canStartSwap,
        canSwapWith,
        beginSwap,
        skillLevel,
        allInUsed,
        allInResult,
        allInAvailable,
        rollAllIn,
        coverFrom,
        coverAvailable,
        clearCover,
        rerollLeft,
        rerollLimit,
        rerollAvailable,
        rerollDice,
        feintLeft,
        feintLimit,
        feintAvailable,
        feintResult,
        feintPending,
        enemySkip,
        useFeint,
        applyFeintDice,
        anchorLeft,
        anchorLimit,
        anchorCost,
        anchorAvailable,
        anchorTarget,
        anchorPaid,
        anchorNotice,
        armAnchor,
        clearAnchorTarget,
        consumeAnchor,
        refundAnchor,
        settleAnchor,
        strategyPoints,
        strategyCap,
        tacticsPhaseOpen,
        tacticsAUsed,
        tacticsBUsed,
        tacticsAAllowed,
        tacticsBAllowed,
        useTacticsA,
        useTacticsB,
        surgeRage,
        surgeNotice,
        surgeGain,
        surgeDecayChance,
        gainRage,
        flipToBad,
        surgeRoundStart,
        surgeAfterRoll,
        markPickCount,
        markPicking,
        markPicked,
        markFlipPending,
        markFlipNature,
        markNotice,
        importantIdx,
        markAvailable,
        beginMarkPick,
        cancelMarkPick,
        toggleMarkPick,
        confirmMarkPick,
        tickImportant,
        resolveMarkFlip,
        morale,
        moraleWindow,
        moraleWaiting,
        moraleNotice,
        beginMoralePhase,
        applyMoraleChoice,
        vigilChance,
        vigilNotice,
        protectCard,
        flipCard,
        tickProtection,
        payDices,
        refundDices,
        cancelSwap,
        beginSkillSelection,
        setLoadout,
        clearLoadout
    }
})

export const habitSteps: HabitStep[] = [
    {
        title: "转移标记",
        detail: "坏习惯标记会移动到下一个坏习惯。",
    },
    {
        title: "触发坏习惯",
        detail: "有标记存在的坏习惯会将周围特定位置的好习惯翻面为坏习惯。",
    },
    {
        title: "行动阶段",
        detail: "投掷两颗骰子。",
    },
    {
        title: "行动阶段",
        detail: "以下行动选择：激活好习惯、交换两张好习惯、保护一张好习惯。",
        tip: "点击卡牌来进行行动。",
    },
    {
        title: "结算",
        detail: "检查有没有达成终局条件。",
        tip: "当全场都是好习惯，玩家胜利，全场都是坏习惯，玩家失败。",
    },
];

export const habitsEffectRanges: EffectRanges = {
    a1: [
        [-1, -1],
        [-1, 0],
        [-1, 1]
    ],
    a2: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
    ],
    a3: [
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, 0]
    ],
    a4: [
        [1, 1],
        [1, 0],
        [1, -1]
    ],
    a5: [
        [-1, 1],
        [1, -1]
    ],
    a6: [
        [-1, -1],
        [1, 1]
    ],
    a7: [
        [-1, 0],
        [1, 0]
    ],
    a8: [
        [-1, 0],
        [1, -1],
        [1, 1]
    ],
    a9: [
        [0, -1],
        [0, 1]
    ],
    b1: [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 1]
    ],
    b2: [
        [-1, 0],
        [-1, 1],
        [1, -1],
        [1, 0]
    ],
    b3: [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, 0],
        [1, 1]
    ],
    b4: [
        [-1, -1],
        [-1, 1],
        [0, -1],
        [0, 1]
    ],
    b5: [
        [-1, 0],
        [-1, 1],
        [0, 1],
        [1, -1]
    ],
    b6: [
        [-1, -1],
        [0, 1],
        [1, 0]
    ],
    b7: [
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1]
    ],
    b8: [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [1, 0]
    ],
    b9: [
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1]
    ]
}

export const gameSkill = {

}