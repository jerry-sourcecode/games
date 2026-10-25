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
    while (alive()) {
        habits.round++;
        habits.step = 1;
        await wait(1000);
        if (!alive()) return;

        const evCard = habits.states.getCard(habits.states.tag);
        const row = habits.states.idxToPos(habits.states.tag)[0];
        const col = habits.states.idxToPos(habits.states.tag)[1];
        for (let i of habitsEffectRanges[evCard.toString()]) {
            const nrow = i[0] + row;
            const ncol = i[1] + col;
            if (nrow > 0 && nrow <= 3 && ncol > 0 && ncol <= 3) {
                if (habits.states.getCard(nrow, ncol).attu === 'Good') {
                    habits.states.flip(nrow, ncol);
                }
            }
        }
        await wait(1000);
        if (!alive()) return;

        habits.step = 2;
        await wait(500);
        if (!alive()) return;
        for (let i = 1; i <= 9; i++) {
            habits.states.getCard(i).protected = false;
        }
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
        habits.hasActed = false;
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
        habits.states.tagMove();
        await wait(1000);
    }
}
