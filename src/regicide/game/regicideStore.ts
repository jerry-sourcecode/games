import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { shuffle } from "@/utils/utils";
import {
    describeCard,
    ENEMY_TOTAL,
    enemyName,
    EXACT_KILL_RECYCLES_PLAYED,
    HAND_LIMIT,
    JESTER_FLIPS,
    START_HAND,
    SUIT_META,
} from "../data/rules";
import {
    analysePlay,
    buildDeck,
    buildEnemyQueue,
    handValue,
    toEnemy,
    validatePlay,
} from "./engine";
import type { Card, Enemy, Grade, LogEntry, LogTone, Phase } from "./types";

const SAVE_KEY = "regicide:save";
const SAVE_VERSION = 2;

export function describeCards(cards: Card[]): string {
    return cards.map((card) => describeCard(card.suit, card.rank)).join(" ");
}

interface SavedState {
    version: number;
    savedAt: number;
    turn: number;
    phase: Phase;
    hand: Card[];
    drawPile: Card[];
    discard: Card[];
    enemyQueue: Card[];
    enemy: Enemy | null;
    shield: number;
    required: number;
    flips: number;
    defeated: Card[];
    converted: number;
    log: LogEntry[];
    startedAt: number;
}

export const useRegicideGame = defineStore("regicideGame", () => {
    const turn = ref(1);
    const phase = ref<Phase>("play");
    const hand = ref<Card[]>([]);
    const drawPile = ref<Card[]>([]);
    const discard = ref<Card[]>([]);
    const enemyQueue = ref<Card[]>([]);
    const enemy = ref<Enemy | null>(null);
    const shield = ref(0);
    const required = ref(0);
    const flips = ref(JESTER_FLIPS);
    const defeated = ref<Card[]>([]);
    const converted = ref(0);
    const log = ref<LogEntry[]>([]);
    const startedAt = ref(0);

    const selected = ref<string[]>([]);
    const defenseSelected = ref<string[]>([]);

    let logId = 0;

    const finished = computed(() => phase.value === "won" || phase.value === "lost");
    const bossName = computed(() =>
        enemy.value ? enemyName(enemy.value.suit, enemy.value.royal) : "",
    );
    const grade = computed<Grade>(() =>
        flips.value >= 2 ? "gold" : flips.value === 1 ? "silver" : "bronze",
    );
    /** 手牌为空时只能靠小丑续命 */
    const mustFlip = computed(
        () => phase.value === "play" && hand.value.length === 0,
    );
    const canFlip = computed(
        () =>
            flips.value > 0 &&
            drawPile.value.length > 0 &&
            (phase.value === "play" || phase.value === "defend"),
    );

    /* ---------- 选牌 ---------- */

    function pickFrom(list: Card[], ids: string[]): Card[] {
        return list.filter((card) => ids.includes(card.id));
    }

    const selectedCards = computed(() => pickFrom(hand.value, selected.value));
    const preview = computed(() => analysePlay(selectedCards.value, enemy.value));

    const defenseCards = computed(() => pickFrom(hand.value, defenseSelected.value));
    const defenseValue = computed(() => handValue(defenseCards.value));
    const defenseReady = computed(
        () => required.value > 0 && defenseValue.value >= required.value,
    );
    const defenseShort = computed(() => Math.max(0, required.value - defenseValue.value));
    const handTotal = computed(() => handValue(hand.value));

    function pushLog(text: string, tone: LogTone = "info") {
        log.value.push({ id: logId++, turn: turn.value, tone, text });
        if (log.value.length > 160) log.value.splice(0, log.value.length - 160);
    }

    /* ---------- 牌堆 ---------- */

    function draw(count: number): Card[] {
        const drawn: Card[] = [];
        while (
            drawn.length < count &&
            hand.value.length < HAND_LIMIT &&
            drawPile.value.length > 0
        ) {
            const card = drawPile.value.shift()!;
            hand.value.push(card);
            drawn.push(card);
        }
        return drawn;
    }

    /** ♥ 回收：洗混弃牌堆，随机抽若干张压到摸牌堆底部 */
    function recycle(count: number) {
        if (count <= 0 || discard.value.length === 0) return;
        const pool = shuffle([...discard.value]).slice(0, count);
        const ids = new Set(pool.map((card) => card.id));
        discard.value = discard.value.filter((card) => !ids.has(card.id));
        drawPile.value.push(...pool);
        pushLog(`♥ 回收 ${pool.length} 张牌压到摸牌堆底部（随机）`, "info");
    }

    /* ---------- 开局 / 存档 ---------- */

    function newGame() {
        const deck = buildDeck();
        enemyQueue.value = buildEnemyQueue();
        hand.value = deck.splice(0, START_HAND);
        drawPile.value = deck;
        discard.value = [];
        defeated.value = [];
        converted.value = 0;
        log.value = [];
        logId = 0;
        turn.value = 1;
        shield.value = 0;
        required.value = 0;
        flips.value = JESTER_FLIPS;
        selected.value = [];
        defenseSelected.value = [];
        startedAt.value = Date.now();

        const first = toEnemy(enemyQueue.value.shift()!);
        enemy.value = first;
        phase.value = "play";
        pushLog(
            `战斗开始：${enemyName(first.suit, first.royal)}（${first.maxHp} 血 · 攻击 ${first.attack}）`,
            "info",
        );
        save();
    }

    function snapshot(): SavedState {
        return {
            version: SAVE_VERSION,
            savedAt: Date.now(),
            turn: turn.value,
            phase: phase.value,
            hand: hand.value,
            drawPile: drawPile.value,
            discard: discard.value,
            enemyQueue: enemyQueue.value,
            enemy: enemy.value,
            shield: shield.value,
            required: required.value,
            flips: flips.value,
            defeated: defeated.value,
            converted: converted.value,
            log: log.value,
            startedAt: startedAt.value,
        };
    }

    function save() {
        if (finished.value) return;
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
        } catch {
            // 隐私模式下 localStorage 不可用，忽略
        }
    }

    function hasSave(): boolean {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as Partial<SavedState>;
            return (
                parsed.version === SAVE_VERSION &&
                parsed.phase !== "won" &&
                parsed.phase !== "lost" &&
                parsed.enemy !== null &&
                Array.isArray(parsed.hand)
            );
        } catch {
            return false;
        }
    }

    function load(): boolean {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw) as SavedState;
            if (data.version !== SAVE_VERSION || !data.enemy) return false;

            turn.value = data.turn ?? 1;
            phase.value = data.phase === "defend" ? "defend" : "play";
            hand.value = data.hand ?? [];
            drawPile.value = data.drawPile ?? [];
            discard.value = data.discard ?? [];
            enemyQueue.value = data.enemyQueue ?? [];
            enemy.value = data.enemy;
            shield.value = data.shield ?? 0;
            required.value = data.required ?? 0;
            flips.value = data.flips ?? JESTER_FLIPS;
            defeated.value = data.defeated ?? [];
            converted.value = data.converted ?? 0;
            log.value = data.log ?? [];
            startedAt.value = data.startedAt ?? Date.now();
            logId = log.value.reduce((max, item) => Math.max(max, item.id + 1), 0);
            selected.value = [];
            defenseSelected.value = [];
            return true;
        } catch {
            return false;
        }
    }

    function clearSave() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // 忽略
        }
    }

    /* ---------- 出牌 ---------- */

    function toggleCard(id: string) {
        if (phase.value !== "play") return;
        if (selected.value.includes(id)) {
            selected.value = selected.value.filter((item) => item !== id);
            return;
        }
        const card = hand.value.find((item) => item.id === id);
        if (!card) return;

        const next = [...selected.value, id];
        // 不合法的组合直接以新点的这张牌重新开始
        selected.value = validatePlay(pickFrom(hand.value, next)).legal ? next : [id];
    }

    function clearSelection() {
        selected.value = [];
    }

    function confirmPlay() {
        if (phase.value !== "play") return;
        const current = enemy.value;
        const info = preview.value;
        if (!current || !info.legal) return;

        const ids = new Set(info.cards.map((card) => card.id));
        hand.value = hand.value.filter((card) => !ids.has(card.id));
        selected.value = [];

        /* 1. 花色效果：红桃回收先于方块抽牌 */
        shield.value += info.shield;
        pushLog(
            `打出 ${describeCards(info.cards)}，攻击值 ${info.total}${info.doubled ? `，♣ 翻倍 → ${info.damage}` : ""
            }`,
            "good",
        );
        if (info.blocked.length > 0) {
            pushLog(
                `${bossName.value} 压制了${info.blocked
                    .map((suit) => `${SUIT_META[suit].symbol}${SUIT_META[suit].power}`)
                    .join("、")}效果`,
                "bad",
            );
        }
        if (info.shield > 0) {
            pushLog(`♠ 削弱攻击力 ${info.shield} 点（本场累计 ${shield.value}）`, "good");
        }
        if (info.recycle > 0) recycle(info.recycle);
        if (info.draw > 0) {
            const drawn = draw(info.draw);
            pushLog(
                `♦ 抽牌 ${drawn.length}/${info.draw} 张${drawn.length < info.draw ? "（手牌已满或摸牌堆已空）" : ""
                }`,
                "info",
            );
        }

        /* 2. 造成伤害并结算 */
        current.hp -= info.damage;

        if (current.hp < 0) {
            discard.value.push(...info.cards, current.card);
            defeated.value.push(current.card);
            pushLog(
                `击败 ${enemyName(current.suit, current.royal)}（${defeated.value.length}/${ENEMY_TOTAL}）`,
                "good",
            );
            nextEnemy();
            return;
        }

        if (current.hp === 0) {
            // 精确伤害：皇室成员被感化，进入摸牌堆顶部
            if (EXACT_KILL_RECYCLES_PLAYED) {
                drawPile.value.unshift(current.card, ...info.cards);
            } else {
                drawPile.value.unshift(current.card);
                discard.value.push(...info.cards);
            }
            defeated.value.push(current.card);
            converted.value += 1;
            pushLog(
                `刚好 ${info.damage} 点伤害感化了 ${enemyName(current.suit, current.royal)}，它加入摸牌堆顶部${EXACT_KILL_RECYCLES_PLAYED ? "，打出的牌也一并回到牌堆顶部" : ""
                }`,
                "good",
            );
            nextEnemy();
            return;
        }

        discard.value.push(...info.cards);
        beginDefense();
    }

    /* ---------- 结算 ---------- */

    function nextEnemy() {
        enemy.value = null;
        // 黑桃削弱只对当前敌人生效，换人后清零
        shield.value = 0;
        if (enemyQueue.value.length === 0) {
            phase.value = "won";
            clearSave();
            return;
        }
        const next = toEnemy(enemyQueue.value.shift()!);
        enemy.value = next;
        pushLog(
            `下一名：${enemyName(next.suit, next.royal)}（${next.maxHp} 血 · 攻击 ${next.attack}）`,
            "info",
        );
        endTurn();
    }

    function beginDefense() {
        const current = enemy.value!;
        const need = Math.max(0, current.attack - shield.value);
        required.value = need;

        if (need <= 0) {
            pushLog(`♠ 削弱完全抵消了 ${enemyName(current.suit, current.royal)} 的反击`, "good");
            endTurn();
            return;
        }

        if (handTotal.value < need && !(flips.value > 0 && drawPile.value.length > 0)) {
            pushLog(
                `${enemyName(current.suit, current.royal)} 反击 ${need} 点，手牌不足以抵挡`,
                "bad",
            );
            lose();
            return;
        }

        pushLog(
            `${enemyName(current.suit, current.royal)} 反击 ${need} 点，弃牌抵挡`,
            "hurt",
        );
        if (handTotal.value < need) {
            pushLog("手牌不足，只能翻一张小丑重抽", "bad");
        }
        defenseSelected.value = [];
        phase.value = "defend";
        save();
    }

    function toggleDefenseCard(id: string) {
        if (phase.value !== "defend") return;
        defenseSelected.value = defenseSelected.value.includes(id)
            ? defenseSelected.value.filter((item) => item !== id)
            : [...defenseSelected.value, id];
    }

    function clearDefense() {
        defenseSelected.value = [];
    }

    function confirmDefense() {
        if (!defenseReady.value) return;
        const cards = defenseCards.value;
        const ids = new Set(cards.map((card) => card.id));
        hand.value = hand.value.filter((card) => !ids.has(card.id));
        discard.value.push(...cards);
        const over = defenseValue.value - required.value;
        pushLog(
            `弃掉 ${describeCards(cards)} 抵挡 ${required.value} 点${over > 0 ? `（溢出 ${over} 点）` : ""
            }`,
            "hurt",
        );
        defenseSelected.value = [];
        required.value = 0;
        endTurn();
    }

    function endTurn() {
        turn.value += 1;
        selected.value = [];
        defenseSelected.value = [];
        required.value = 0;
        // 黑桃削弱对当前敌人持续有效，这里不清零
        phase.value = "play";

        if (hand.value.length === 0) {
            if (flips.value > 0 && drawPile.value.length > 0) {
                pushLog("手牌已空，只能翻一张小丑重抽", "bad");
            } else {
                pushLog("手牌已空，既无法出牌也无法让步", "bad");
                lose();
                return;
            }
        }
        save();
    }

    function flipJester() {
        if (!canFlip.value) return;
        flips.value -= 1;
        const used = hand.value.length;
        if (used > 0) {
            discard.value.push(...hand.value);
            hand.value = [];
        }
        const drawn = draw(HAND_LIMIT);
        selected.value = [];
        defenseSelected.value = [];
        pushLog(
            `翻出小丑：弃掉 ${used} 张手牌，重抽 ${drawn.length} 张`,
            "info",
        );
        if (phase.value === "defend" && handTotal.value < required.value) {
            if (flips.value > 0 && drawPile.value.length > 0) {
                pushLog("重抽后仍然不足，还可以再翻一张小丑", "bad");
            } else {
                pushLog(`重抽后仍然无法抵挡 ${required.value} 点反击`, "bad");
                lose();
                return;
            }
        }
        save();
    }

    function lose() {
        phase.value = "lost";
        clearSave();
    }

    return {
        turn,
        phase,
        hand,
        drawPile,
        discard,
        enemyQueue,
        enemy,
        shield,
        required,
        flips,
        defeated,
        converted,
        log,
        startedAt,
        selected,
        defenseSelected,
        finished,
        bossName,
        grade,
        mustFlip,
        canFlip,
        selectedCards,
        preview,
        defenseCards,
        defenseValue,
        defenseReady,
        defenseShort,
        handTotal,
        newGame,
        hasSave,
        load,
        clearSave,
        toggleCard,
        clearSelection,
        confirmPlay,
        toggleDefenseCard,
        clearDefense,
        confirmDefense,
        flipJester,
    };
});
