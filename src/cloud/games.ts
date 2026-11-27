import { useHabitsRecord } from "@/habits/data/gameRecord";
import {
	DEFAULT_SETTINGS,
	PALM_SAVE_KEY,
	PALM_SETTINGS_KEY,
	usePalmSave,
	type PalmSaveFile,
	type PalmSettings,
} from "@/palm/data/palmSave";
import { usePalmRecord } from "@/palm/data/palmRecord";

/**
 * 一个游戏在云存档里的接入口。
 * 新增游戏时只要实现并加入 CLOUD_GAMES，就会自动被上传 / 下载覆盖。
 */
export interface CloudGame {
	/** 云端负载里的 key，程序内固定不变 */
	key: string;
	/** 面板上展示的名字 */
	label: string;
	/** 采集本地可序列化数据 */
	collect(): unknown;
	/** 用云端数据覆盖本地 */
	apply(data: unknown): void;
	/** 本地最新时间戳，用来判断新旧；没有数据返回 0 */
	stamp(): number;
	/** 数据过大时的裁剪（可选） */
	shrink?(data: unknown): unknown;
}

interface PalmCloud {
	save: PalmSaveFile | null;
	settings: PalmSettings;
	records: ReturnType<typeof usePalmRecord>["records"];
}

function readLocalPalmSave(): PalmSaveFile | null {
	try {
		const raw = localStorage.getItem(PALM_SAVE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		return parsed && typeof parsed === "object"
			? (parsed as PalmSaveFile)
			: null;
	} catch {
		return null;
	}
}

/** 上报前保留的最近步骤数（超过大小限制时裁掉中间历史） */
const KEEP_STEPS = 40;

const palmGame: CloudGame = {
	key: "palm",
	label: "棕榈岛",
	collect(): PalmCloud {
		const palmSave = usePalmSave();
		return {
			save: palmSave.snapshot ?? readLocalPalmSave(),
			settings: {
				...palmSave.settings,
				achievements: [...palmSave.settings.achievements],
			},
			records: usePalmRecord().records,
		};
	},
	apply(data) {
		if (!data || typeof data !== "object") return;
		const payload = data as Partial<PalmCloud>;
		const save = payload.save ?? null;
		try {
			if (save) {
				localStorage.setItem(
					PALM_SAVE_KEY,
					JSON.stringify({
						...save,
						savedAt: save.savedAt ?? Date.now(),
					}),
				);
			} else {
				localStorage.removeItem(PALM_SAVE_KEY);
			}
			localStorage.setItem(
				PALM_SETTINGS_KEY,
				JSON.stringify({
					...DEFAULT_SETTINGS,
					...(payload.settings ?? {}),
				}),
			);
		} catch {
			// 忽略写入失败
		}
		usePalmRecord().$patch({
			records: Array.isArray(payload.records) ? payload.records : [],
		});
		const palmSave = usePalmSave();
		palmSave.loadSettings();
		palmSave.load();
	},
	stamp() {
		const save = usePalmSave().snapshot ?? readLocalPalmSave();
		const times = [
			save?.savedAt ?? 0,
			...usePalmRecord().records.map((item) => item.time ?? 0),
		];
		return times.reduce((max, time) => (time > max ? time : max), 0);
	},
	shrink(data) {
		if (!data || typeof data !== "object") return data;
		const payload = data as Partial<PalmCloud>;
		const save = payload.save;
		const steps = save?.steps ?? [];
		if (!save || steps.length <= KEEP_STEPS + 1) return data;
		const head = steps.slice(0, 1);
		const tail = steps.slice(-KEEP_STEPS);
		return { ...payload, save: { ...save, steps: [...head, ...tail] } };
	},
};

interface HabitsCloud {
	records: ReturnType<typeof useHabitsRecord>["result"];
}

const habitsGame: CloudGame = {
	key: "habits",
	label: "Habits",
	collect(): HabitsCloud {
		return { records: useHabitsRecord().result };
	},
	apply(data) {
		const payload = (data ?? {}) as Partial<HabitsCloud>;
		useHabitsRecord().$patch({
			result: Array.isArray(payload.records) ? payload.records : [],
		});
	},
	stamp() {
		return useHabitsRecord().result.reduce(
			(max, item) => ((item.time ?? 0) > max ? (item.time ?? 0) : max),
			0,
		);
	},
};

/** 参与云存档的全部游戏；新游戏加在这里即可 */
export const CLOUD_GAMES: CloudGame[] = [palmGame, habitsGame];
