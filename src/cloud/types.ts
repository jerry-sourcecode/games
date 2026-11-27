/** 后端 user_data 的 source：所有游戏共用这一个 key */
export const CLOUD_SOURCE = "games";
/** 云存档负载格式版本 */
export const CLOUD_VERSION = 2;

/** 一份完整的云存档：所有游戏的数据合成一个 JSON */
export interface CloudPayload {
	version: number;
	/** 上传时刻，用于判断云端与本地谁更新 */
	savedAt: number;
	/** 每个游戏一份数据，key 由 src/cloud/games.ts 的适配器决定 */
	games: Record<string, unknown>;
}
