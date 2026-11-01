import { randint, wait } from "@/utils/utils";
import { habitsEffectRanges, useHabits } from "./data/habitData";

/**
 * 代际令牌：每次重开都会自增，正在跑的旧循环检测到令牌变化后自行退出，
 * 因此不需要额外的「正在运行」标记，也不会有两条循环同时驱动棋盘。
 */
let generation = 0;

/** 重置整局游戏的状态，卡牌会重新洗牌 */
export function resetGame() {
    generation++;
    const habits = useHabits();
    habits.states.init();
    habits.step = 0;
    habits.round = 0;
    habits.result = null;
    habits.selectedIdx = null;
    habits.swapFrom = null;
    habits.swapPaid = null;
    habits.hasActed = false;
    habits.swapCount = 0;
    habits.allInUsed = false;
    habits.allInResult = null;
    habits.coverFrom = null;
    habits.rerollLeft = habits.rerollLimit();
    habits.feintLeft = habits.feintLimit();
    habits.enemySkip = 0;
    habits.feintPending = false;
    habits.feintResult = null;
    habits.anchorLeft = habits.anchorLimit();
    habits.anchorTarget = null;
    habits.anchorPaid = null;
    habits.anchorNotice = null;
    habits.strategyPoints = 0;
    habits.tacticsAUsed = false;
    habits.tacticsBUsed = false;
    habits.surgeRage = 0;
    habits.surgeNotice = null;
    habits.markPicking = false;
    habits.markPicked = [];
    habits.markFlipPending = false;
    habits.markFlipNature = null;
    habits.markNotice = null;
    habits.morale = 0;
    habits.moraleWaiting = false;
    habits.moraleNotice = null;
    habits.vigilNotice = null;
    habits.swapBadLeft = 0;
    habits.dices = [1, 1];
    habits.dicesLeft = [1, 1];
}

/** 重开一局 */
export async function restartGame() {
    resetGame();
    await gameStart();
}

export async function gameStart() {
    const gen = ++generation;
    const alive = () => gen === generation;

    await wait(1000);
    if (!alive()) return;

    const habits = useHabits();
    habits.rerollLeft = habits.rerollLimit();
    habits.feintLeft = habits.feintLimit();
    habits.anchorLeft = habits.anchorLimit();
    while (alive()) {
        habits.round++;
        // 狂战士：回合开始时的怒气衰减判定
        habits.surgeRoundStart();
        habits.step = 1;
        await wait(1000);
        if (!alive()) return;

        const evCard = habits.states.getCard(habits.states.tag);
        const row = habits.states.idxToPos(habits.states.tag)[0];
        const col = habits.states.idxToPos(habits.states.tag)[1];

        habits.vigilNotice = null;
        // 诈降：敌人跳过其下一个行动回合
        if (habits.enemySkip > 0) {
            habits.enemySkip--;
        } else {
            for (let i of habitsEffectRanges[evCard.toString()]) {
                const nrow = i[0] + row;
                const ncol = i[1] + col;
                if (nrow > 0 && nrow <= 3 && ncol > 0 && ncol <= 3) {
                    habits.flipToBad(nrow, ncol, habits.states.tag);
                }
            }
        }
        await wait(1000);
        if (!alive()) return;

        // 标要：敌方行动之后、我方行动之前倒数重要习惯，到期转为普通并翻面
        habits.tickImportant();

        habits.step = 2;
        await wait(500);
        if (!alive()) return;
        // 保护回合数 −1，归零的牌解除保护
        habits.tickProtection();
        await wait(500);
        if (!alive()) return;

        for (let i = 1; i <= 6; i++) {
            for (let i = 0; i < habits.dices.length; i++) {
                habits.dices[i] = randint(1, 6);
            }
            if (i != 6) await wait(100 * i);
        }
        if (!alive()) return;

        habits.dicesLeft = [...habits.dices];
        // 诈降：本次投掷的改骰
        habits.applyFeintDice();
        // 狂战士：投掷阶段结束后的怒气爆发判定
        habits.surgeAfterRoll();
        // 骄兵必败：等待士气 +1 / −1 的选择
        habits.beginMoralePhase();
        habits.hasActed = false;
        habits.swapCount = 0;
        habits.allInUsed = false;
        habits.allInResult = null;
        habits.coverFrom = null;
        habits.tacticsAUsed = false;
        habits.tacticsBUsed = false;
        habits.anchorNotice = null;
        habits.step = 3;
        // 玩家结束回合，或对局因任意原因提前结束
        await wait(() => habits.step == 4 || habits.result != null || !alive());
        if (!alive()) return;

        let cntOfB = 0, cntOfA = 0;
        for (let i = 1; i <= 9; i++) {
            const obj = habits.states.getCard(i);
            if (obj.attu === 'Bad') {
                cntOfB++;
            } else {
                cntOfA++;
            }
        }
        if (cntOfA === 9) {
            habits.result = 'win';
            return;
        }
        if (cntOfB === 9) {
            habits.result = 'lose';
            return;
        }

        await wait(1000);
        if (!alive()) return;
        habits.step = 0;
        await wait(1000);
        if (!alive()) return;
        // 转移标记：预言指定的落点合法时优先，不合法则取消技能并返还费用
        const anchorTarget = habits.anchorTarget;
        if (anchorTarget == null) {
            habits.states.tagMove();
        } else {
            const legal =
                habits.states.getCard(anchorTarget)?.attu === 'Bad';
            if (!legal) {
                habits.refundAnchor();
                habits.states.tagMove();
            } else if (anchorTarget === habits.states.tag) {
                // 落点与当前标记相同，无需移动
                habits.settleAnchor();
            } else {
                habits.states.tagMove(anchorTarget);
                habits.settleAnchor();
            }
        }
        await wait(1000);
    }
}
