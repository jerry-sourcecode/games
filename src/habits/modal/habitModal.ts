import { reactive } from "vue";
import { shuffle } from "@/utils/utils";
import type { GameResult } from "../component/result-dialog.vue";

type CardAttuType = "Good" | "Bad";

export class HabitCard {
    attu: CardAttuType;
    variety: number;
    protected: boolean = false;
    isTaged: boolean = false;
    constructor(attu: CardAttuType, variety: number) {
        this.attu = attu;
        this.variety = variety;
    }
    /**
     * @returns 卡牌编号，形似 a1 b2
     */
    toString(): HabitKey {
        return `${this.attu === 'Good' ? 'a' : 'b'}${this.variety}` as HabitKey;
    }
    static fromString(str: string) {
        const obj = new HabitCard('Good', 0);
        if (str[0] === 'b') obj.attu = 'Bad';
        obj.variety = Number(str.slice(1))
        return obj;
    }
}

export class HabitStates {
    tag: number = 1;
    private data: Map<number, HabitCard> = new Map;
    posToIdx(pos: [number, number]) {
        return (pos[0] - 1) * 3 + pos[1];
    }
    idxToPos(i: number): [number, number] {
        const row = Math.floor((i - 1) / 3) + 1;
        const col = ((i - 1) % 3) + 1;
        return [row, col];
    }
    getCard(idx: number): HabitCard;
    getCard(row: number, col: number): HabitCard;
    getCard(rowOrIdx: number, col?: number) {
        if (col) {
            rowOrIdx = this.posToIdx([rowOrIdx, col]);
        }
        return this.data.get(rowOrIdx)!
    }
    private setCard(row: number, col: number, card: HabitCard) {
        return this.data.set(this.posToIdx([row, col]), reactive(card) as HabitCard)
    }
    init() {
        let ls = [];
        for (let i = 1; i <= 9; i++) {
            ls.push(i);
        }
        shuffle(ls);
        for (let i = 1; i <= 9; i++) {
            const row = this.idxToPos(i)[0];
            const col = this.idxToPos(i)[1];
            this.setCard(row, col, new HabitCard(i % 2 ? "Bad" : "Good", ls[i - 1]!));
        }
        this.tag = 1;
        this.getCard(1, 1).isTaged = true;
    }
    tagMove() {
        this.data.get(this.tag)!.isTaged = false;
        do {
            this.tag = this.tag.nxt(9);
        } while (this.data.get(this.tag)!.attu !== 'Bad')
        this.data.get(this.tag)!.isTaged = true;
    }
    flip(row: number, col: number) {
        const obj = this.getCard(row, col);
        if (obj.protected) return;
        if (obj.attu === 'Bad') obj.attu = 'Good';
        else obj.attu = 'Bad';
    }
    swap(row1: number, col1: number, row2: number, col2: number) {
        const obj1 = this.getCard(row1, col1).toString();
        const obj2 = this.getCard(row2, col2).toString();
        this.setCard(row2, col2, HabitCard.fromString(obj1));
        this.setCard(row1, col1, HabitCard.fromString(obj2));
    }
    protect(row: number, col: number) {
        this.getCard(row, col).protected = true;
    }
    unprotect(row: number, col: number) {
        this.getCard(row, col).protected = false;
    }
}

export class HabitsResultRecord {
    time: number;
    round: number;
    result: GameResult;
    constructor(time: number, round: number, result: GameResult) {
        this.time = time;
        this.round = round;
        this.result = result;
    }
}

// 单个偏移：[row, col]
type Offset = readonly [row: number, col: number];

// 一张牌影响的偏移列表
type EffectCells = readonly Offset[];

// 全部牌：键为 a1..a9 / b1..b9
type HabitKey =
    | "a1" | "a2" | "a3" | "a4" | "a5" | "a6" | "a7" | "a8" | "a9"
    | "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7" | "b8" | "b9";

export type EffectRanges = Record<HabitKey, EffectCells>;