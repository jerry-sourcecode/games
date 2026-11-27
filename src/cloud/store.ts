import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { usePalmSave } from "@/palm/data/palmSave";
import {
	CLOUD_BASE_URL,
	CloudError,
	cloudApi,
	cloudErrorMessage,
} from "./api";
import { CLOUD_GAMES } from "./games";
import { CLOUD_SOURCE, CLOUD_VERSION, type CloudPayload } from "./types";

/** 记住账号密码用的本地键（后端每次请求都要明文密码校验） */
const AUTH_KEY = "games:cloud-auth";
/** 单份数据不宜太大，超过这个长度就裁剪对局历史 */
const MAX_PAYLOAD = 900_000;
/** 上报前保留的最近步骤数 */
const KEEP_STEPS = 40;

export type CloudStatus = "idle" | "syncing" | "synced" | "error";

interface StoredAuth {
	username: string;
	password?: string;
}


export const useCloudSave = defineStore("cloudSave", () => {
	const username = ref("");
	const password = ref("");
	/** 是否把密码也存进 localStorage */
	const remember = ref(true);
	const status = ref<CloudStatus>("idle");
	const error = ref<string | null>(null);
	const busy = ref(false);
	const dirty = ref(false);
	const lastSyncAt = ref<number | null>(null);
	const cloudUpdatedAt = ref<number | null>(null);

	const loggedIn = computed(() =>
		Boolean(username.value && password.value),
	);

	/* ---------- 凭据 ---------- */

	function loadAuth() {
		try {
			const raw = localStorage.getItem(AUTH_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as Partial<StoredAuth>;
			if (typeof parsed.username === "string") {
				username.value = parsed.username;
			}
			if (typeof parsed.password === "string") {
				password.value = parsed.password;
				remember.value = true;
			}
		} catch {
			// 忽略损坏的凭据
		}
	}

	function persistAuth() {
		try {
			const payload: StoredAuth = { username: username.value };
			if (remember.value) payload.password = password.value;
			localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
		} catch {
			// 忽略写入失败
		}
	}

	/* ---------- 局面采集 / 应用 ---------- */

	/** 采集所有游戏的数据 */
	function capture(): CloudPayload {
		const games: Record<string, unknown> = {};
		for (const game of CLOUD_GAMES) games[game.key] = game.collect();
		return { version: CLOUD_VERSION, savedAt: Date.now(), games };
	}

	/** 本地所有游戏里最新的时间戳 */
	function localStamp(): number {
		return CLOUD_GAMES.reduce(
			(max, game) => Math.max(max, game.stamp() || 0),
			0,
		);
	}

	/** 解析云端负载；兼容只覆盖棕榈岛的 v1 结构 */
	function parsePayload(raw: string | null): CloudPayload | null {
		if (!raw) return null;
		try {
			const parsed = JSON.parse(raw) as Record<string, unknown> | null;
			if (!parsed || typeof parsed !== "object") return null;
			const savedAt =
				typeof parsed.savedAt === "number" ? parsed.savedAt : 0;
			const legacy = parsed as {
				palm?: unknown;
				habits?: unknown;
			};
			const games =
				parsed.games && typeof parsed.games === "object"
					? (parsed.games as Record<string, unknown>)
					: // v1：各游戏数据直接挂在顶层
						{
							palm: legacy.palm,
							habits: legacy.habits,
						};
			const keys = CLOUD_GAMES.map((game) => game.key);
			if (!keys.some((key) => games[key] !== undefined)) return null;
			return {
				version:
					typeof parsed.version === "number"
						? parsed.version
						: CLOUD_VERSION,
				savedAt,
				games,
			};
		} catch {
			return null;
		}
	}

	/** 用云端负载覆盖本地（localStorage 与运行中的 store 一起更新） */
	function apply(payload: CloudPayload) {
		for (const game of CLOUD_GAMES) {
			const data = payload.games[game.key];
			if (data === undefined) continue;
			game.apply(data);
		}
	}

	/** 超过大小限制时按各游戏自己的规则裁剪 */
	function fitPayload(payload: CloudPayload): string {
		let json = JSON.stringify(payload);
		if (json.length <= MAX_PAYLOAD) return json;
		const games: Record<string, unknown> = { ...payload.games };
		for (const game of CLOUD_GAMES) {
			const data = games[game.key];
			if (data !== undefined && game.shrink) {
				games[game.key] = game.shrink(data);
			}
		}
		json = JSON.stringify({ ...payload, games });
		return json;
	}

	/* ---------- 网络 ---------- */

	function fail(err: unknown) {
		status.value = "error";
		error.value = cloudErrorMessage(err);
	}

	async function push(): Promise<boolean> {
		if (!loggedIn.value) return false;
		busy.value = true;
		status.value = "syncing";
		try {
			const json = fitPayload(capture());
			const res = await cloudApi.saveData(
				username.value,
				password.value,
				CLOUD_SOURCE,
				json,
			);
			cloudUpdatedAt.value = res.updatedAt;
			lastSyncAt.value = Date.now();
			status.value = "synced";
			error.value = null;
			dirty.value = false;
			return true;
		} catch (err) {
			fail(err);
			return false;
		} finally {
			busy.value = false;
		}
	}

	/** 拉取云端；云端更新就覆盖本地，本地更新就上传 */
	async function pull(): Promise<"applied" | "pushed" | "same"> {
		if (!loggedIn.value) throw new CloudError("请先登录", "NO_AUTH");
		busy.value = true;
		status.value = "syncing";
		error.value = null;
		try {
			const res = await cloudApi.loadData(
				username.value,
				password.value,
				CLOUD_SOURCE,
			);
			cloudUpdatedAt.value = res.updatedAt ?? null;
			const remote = parsePayload(res.data);
			const local = localStamp();
			if (!remote) {
				status.value = "synced";
				lastSyncAt.value = Date.now();
				if (local > 0) {
					await push();
					return "pushed";
				}
				return "same";
			}
			if (remote.savedAt > local) {
				apply(remote);
				status.value = "synced";
				lastSyncAt.value = Date.now();
				return "applied";
			}
			if (local > remote.savedAt) {
				await push();
				return "pushed";
			}
			status.value = "synced";
			lastSyncAt.value = Date.now();
			return "same";
		} catch (err) {
			fail(err);
			throw err;
		} finally {
			busy.value = false;
		}
	}

	/** 强制用云端覆盖本地（手动「从云端下载」） */
	async function download(): Promise<boolean> {
		if (!loggedIn.value) throw new CloudError("请先登录", "NO_AUTH");
		busy.value = true;
		status.value = "syncing";
		error.value = null;
		try {
			const res = await cloudApi.loadData(
				username.value,
				password.value,
				CLOUD_SOURCE,
			);
			cloudUpdatedAt.value = res.updatedAt ?? null;
			const remote = parsePayload(res.data);
			if (!remote) {
				status.value = "synced";
				error.value = "云端还没有数据";
				return false;
			}
			apply(remote);
			lastSyncAt.value = Date.now();
			status.value = "synced";
			return true;
		} catch (err) {
			fail(err);
			return false;
		} finally {
			busy.value = false;
		}
	}

	/* ---------- 自动同步 ---------- */

	let timer: ReturnType<typeof setTimeout> | undefined;

	/** 数据变了：延迟上传，避免每次行动都请求一次 */
	function markDirty() {
		dirty.value = true;
		if (!loggedIn.value) return;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			if (!dirty.value) return;
			void push();
		}, 2500);
	}

	/** 页面即将卸载时尽量把待上传的数据发出去 */
	function flush() {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		if (!loggedIn.value || !dirty.value) return;
		const json = fitPayload(capture());
		// keepalive 请求体有大小上限，过大就留给下次自动上传
		if (json.length > 60_000) return;
		dirty.value = false;
		try {
			void fetch(`${CLOUD_BASE_URL}/api/data/save`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: username.value,
					password: password.value,
					source: CLOUD_SOURCE,
					data: json,
				}),
				keepalive: true,
			}).catch(() => undefined);
		} catch {
			// 忽略
		}
	}

	/* ---------- 登录 / 注册 ---------- */

	async function login(
		name: string,
		secret: string,
		rememberMe = true,
	): Promise<"applied" | "pushed" | "same"> {
		const user = name.trim();
		if (!user || !secret) {
			throw new CloudError("请输入用户名和密码", "INVALID_INPUT");
		}
		status.value = "syncing";
		error.value = null;
		try {
			await cloudApi.query(user, secret);
			username.value = user;
			password.value = secret;
			remember.value = rememberMe;
			persistAuth();
			return await pull();
		} catch (err) {
			fail(err);
			throw err;
		}
	}

	async function register(
		name: string,
		secret: string,
		inviteCode: string,
		passwordHint?: string,
	): Promise<"applied" | "pushed" | "same"> {
		const user = name.trim();
		const invite = inviteCode.trim();
		if (!user || !secret) {
			throw new CloudError("请输入用户名和密码", "INVALID_INPUT");
		}
		if (!invite) throw new CloudError("请填写邀请码", "INVALID_INPUT");
		status.value = "syncing";
		error.value = null;
		try {
			await cloudApi.register(
				user,
				secret,
				invite,
				passwordHint?.trim() || undefined,
			);
			username.value = user;
			password.value = secret;
			remember.value = true;
			persistAuth();
			return await pull();
		} catch (err) {
			fail(err);
			throw err;
		}
	}

	function logout() {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		username.value = "";
		password.value = "";
		remember.value = true;
		dirty.value = false;
		status.value = "idle";
		error.value = null;
		lastSyncAt.value = null;
		cloudUpdatedAt.value = null;
		try {
			localStorage.removeItem(AUTH_KEY);
		} catch {
			// 忽略
		}
	}

	/* ---------- 启动 ---------- */

	let readyPromise: Promise<void> | null = null;
	let listening = false;

	async function boot() {
		// 先把本地设置读出来，避免用默认值覆盖云端的设置
		usePalmSave().loadSettings();
		loadAuth();
		if (!listening && typeof window !== "undefined") {
			listening = true;
			window.addEventListener("pagehide", flush);
		}
		if (!loggedIn.value) return;
		try {
			await pull();
		} catch {
			// 错误已经写进 status / error
		}
	}

	/** 每个页面只跑一次；各视图在初始化前 await 它 */
	function ready(): Promise<void> {
		if (!readyPromise) readyPromise = boot();
		return readyPromise;
	}

	return {
		username,
		password,
		remember,
		status,
		error,
		busy,
		dirty,
		lastSyncAt,
		cloudUpdatedAt,
		loggedIn,
		ready,
		login,
		register,
		logout,
		push,
		pull,
		download,
		markDirty,
		flush,
	};
});
