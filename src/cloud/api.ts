/**
 * 云存档后端的 fetch 封装。
 * 所有接口都是 POST + JSON，用户接口用 username + password 校验身份，
 * 数据接口额外带 source（程序标识）。
 */

const FALLBACK_BASE_URL = "http://localhost:8787";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

/**
 * 页面是 HTTPS 时，绝对不能请求 http 后端（浏览器按 mixed content 直接拦截）。
 * 这里把 http 地址自动升级成 https，只有本机地址例外——
 * 本地开发常用 https 预览 + http 后端，而浏览器把 localhost 视为可信来源。
 */
function normalizeBaseUrl(raw: string): string {
	const trimmed = raw.replace(/\/+$/, "");
	if (!trimmed.toLowerCase().startsWith("http://")) return trimmed;
	const isBrowser = typeof window !== "undefined";
	if (!isBrowser || window.location.protocol !== "https:") return trimmed;
	try {
		const url = new URL(trimmed);
		if (LOCAL_HOSTS.includes(url.hostname)) return trimmed;
		url.protocol = "https:";
		return url.toString().replace(/\/+$/, "");
	} catch {
		return trimmed;
	}
}

export const CLOUD_BASE_URL = normalizeBaseUrl(
	import.meta.env.VITE_CLOUD_BASE_URL || FALLBACK_BASE_URL,
);

export type CloudErrorCode =
	| "USERNAME_TAKEN"
	| "INVITE_INVALID"
	| "INVITE_NOT_FOUND"
	| "USER_NOT_FOUND"
	| "PASSWORD_MISMATCH"
	| "INVALID_ADMIN_PASSWORD"
	| "INTERNAL"
	| "NETWORK"
	| "NO_AUTH"
	| (string & {});

/** 后端返回的业务错误；hint 是用户设置的主密码提示 */
export class CloudError extends Error {
	code: CloudErrorCode;
	hint?: string;

	constructor(message: string, code: CloudErrorCode = "UNKNOWN", hint?: string) {
		super(message);
		this.name = "CloudError";
		this.code = code;
		if (hint) this.hint = hint;
	}
}

interface ErrorBody {
	success?: boolean;
	code?: string;
	message?: string;
	hint?: string;
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
	let res: Response;
	try {
		res = await fetch(`${CLOUD_BASE_URL}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	} catch {
		throw new CloudError("无法连接云端，请检查网络或后端地址", "NETWORK");
	}

	let data: unknown = null;
	try {
		data = await res.json();
	} catch {
		data = null;
	}

	const parsed = (data ?? {}) as ErrorBody;
	if (!res.ok || parsed.success === false) {
		throw new CloudError(
			parsed.message ?? `HTTP ${res.status}`,
			parsed.code ?? `HTTP_${res.status}`,
			parsed.hint,
		);
	}
	return data as T;
}

export interface RegisterResult {
	success: boolean;
	uid: string;
}

export interface SaveDataResult {
	success: boolean;
	source: string;
	updatedAt: number;
}

export interface LoadDataResult {
	success: boolean;
	uid: string;
	source: string;
	data: string | null;
	updatedAt: number | null;
}

export interface QueryResult {
	success: boolean;
	uid: string;
	username: string;
	data: string;
	dataUpdatedAt: number | null;
	updatedAt: number;
}

export interface SuccessResult {
	success: boolean;
}

export const cloudApi = {
	register(
		username: string,
		password: string,
		inviteCode: string,
		passwordHint?: string,
	) {
		return request<RegisterResult>("/api/auth/register", {
			username,
			password,
			inviteCode,
			passwordHint,
		});
	},

	/** 校验身份；不带 source 时不返回数据 */
	query(username: string, password: string) {
		return request<QueryResult>("/api/auth/query", { username, password });
	},

	changePassword(
		username: string,
		oldPassword: string,
		newPassword: string,
		passwordHint?: string,
	) {
		return request<SuccessResult>("/api/auth/change-password", {
			username,
			oldPassword,
			newPassword,
			passwordHint,
		});
	},

	saveData(username: string, password: string, source: string, data: string) {
		return request<SaveDataResult>("/api/data/save", {
			username,
			password,
			source,
			data,
		});
	},

	loadData(username: string, password: string, source: string) {
		return request<LoadDataResult>("/api/data/load", {
			username,
			password,
			source,
		});
	},
};

/** 错误对象转成给玩家看的文字 */
export function cloudErrorMessage(err: unknown): string {
	if (err instanceof CloudError) {
		const hint = err.hint ? `（密码提示：${err.hint}）` : "";
		return `${err.message}${hint}`;
	}
	if (err instanceof Error) return err.message;
	return "未知错误";
}
