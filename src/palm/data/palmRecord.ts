import { defineStore } from "pinia";
import { ref } from "vue";
import type { PalmArea, PalmCardSource, PalmCondition } from "../game/palmStore";

/** 评价等级 */
export type PalmGrade = "S" | "A" | "B" | "C" | "D" | "—";

/** 复盘里的一步：玩家做了什么 + 做完之后的关键状态 */
export interface PalmReplayStep {
    /** 玩家做了什么，例如「第 3 号牌旋转」 */
    label: string;
    /** 第几轮（1–8） */
    round: number;
    /** 第几回合 */
    turn: number;
    score: number;
    upgrades: number;
    /** 这一步之后的牌库顶 2 张（用于缩略图） */
    top: { cardNo: number; source: PalmCardSource; area: PalmArea }[];
    /** 这一步之后的已储存资源 */
    stored: { name: string; gain: PalmCondition; wild?: number }[];
}

export interface PalmRecord {
    time: number;
    score: number;
    /** 升级次数：执行旋转 / 翻面的累计次数 */
    upgrades: number;
    grade: PalmGrade;
    turns: number;
    /** 整局复盘；老记录没有这个字段 */
    replay?: PalmReplayStep[];
}

/** 10–19 C、20–29 B、30–39 A、40+ S */
export function gradeOf(score: number): PalmGrade {
    if (score >= 40) return "S";
    if (score >= 30) return "A";
    if (score >= 20) return "B";
    if (score >= 10) return "C";
    return "D";
}

export const usePalmRecord = defineStore(
    "palmRecord",
    () => {
        /** 最多保留多少条记录 */
        const MAX_RECORDS = 50;
        /** 只有最近这么多局保留复盘，避免 localStorage 被撑爆 */
        const MAX_REPLAYS = 10;

        const records = ref<PalmRecord[]>([]);

        function add(record: PalmRecord) {
            records.value.push(record);
            if (records.value.length > MAX_RECORDS) {
            	records.value.splice(0, records.value.length - MAX_RECORDS);
            }
            const withReplay = records.value.filter(
            	(item) => item.replay && item.replay.length,
            );
            if (withReplay.length > MAX_REPLAYS) {
            	for (const old of withReplay.slice(
            		0,
            		withReplay.length - MAX_REPLAYS,
            	)) {
            		old.replay = undefined;
            	}
            }
        }

        return { records, add };
    },
    { persist: true },
);
