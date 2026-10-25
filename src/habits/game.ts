import { randint, wait } from "@/utils/utils";
import { habitsEffectRanges, useHabits } from "./data/habitData";

/** 同一时间只允许一个游戏循环在跑，避免重开时出现两条循环 */
let running = false;

/** 重置整局游戏的状态，卡牌会重新洗牌 */
export function resetGame() {
    const habits = useHabits();
    habits.states.init();
    habits.step = 0;
    habits.round = 0;
    habits.result = null;
    habits.selectedIdx = null;
    habits.swapFrom = null;
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
    if (running) return;
    running = true;

    try {
        await wait(1000);
        const habits = useHabits();
        while (true) {
            habits.round++;
            habits.step = 1;
            await wait(1000);
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
            habits.step = 2;
            await wait(500);
            for (let i = 1; i <= 9; i++) {
                habits.states.getCard(i).protected = false;
            }
            await wait(500);
            for (let i = 1; i <= 6; i++) {
                for (let i = 0; i < habits.dices.length; i++) {
                    habits.dices[i] = randint(1, 6);
                }
                if (i != 6) await wait(100 * i);
            }
            habits.dicesLeft = [...habits.dices];
            habits.hasActed = false;
            habits.step = 3;
            // 玩家结束回合，或对局因任意原因提前结束
            await wait(() => habits.step == 4 || habits.result != null);

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
                break;
            }
            if (cntOfB === 9) {
                habits.result = 'lose';
                break;
            }
            await wait(1000);
            habits.step = 0;
            await wait(1000);
            habits.states.tagMove();
            await wait(1000);
        }
    } finally {
        running = false;
    }
}
