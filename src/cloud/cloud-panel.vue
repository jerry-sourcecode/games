<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PalmModal from "@/palm/component/palm-modal.vue";
import { CLOUD_BASE_URL, cloudErrorMessage } from "./api";
import { CLOUD_GAMES } from "./games";
import { useCloudSave } from "./store";

const show = defineModel<boolean>("show", { default: false });

const cloud = useCloudSave();

/** 参与同步的游戏名，展示在面板底部 */
const gameLabels = computed(() =>
	CLOUD_GAMES.map((game) => game.label).join(" · "),
);

type Tab = "login" | "register";

const TABS: { key: Tab; label: string }[] = [
	{ key: "login", label: "登录" },
	{ key: "register", label: "注册" },
];

const tab = ref<Tab>("login");
const name = ref("");
const secret = ref("");
const invite = ref("");
const hint = ref("");
const rememberMe = ref(true);
const pending = ref(false);
const message = ref<string | null>(null);
const messageTone = ref<"error" | "ok">("error");
/** 手动下载的二次确认 */
const confirmDownload = ref(false);

function sayError(err: unknown) {
	messageTone.value = "error";
	message.value = cloudErrorMessage(err);
}

function sayOk(text: string) {
	messageTone.value = "ok";
	message.value = text;
}

function setTab(next: Tab) {
	tab.value = next;
	message.value = null;
}

/** 打开面板时用已记住的账号预填 */
function prime() {
	name.value = cloud.username || name.value;
	secret.value = "";
	message.value = null;
	confirmDownload.value = false;
}

watch(show, (value) => {
	if (value) prime();
});

async function submit() {
	if (pending.value) return;
	pending.value = true;
	message.value = null;
	try {
		const outcome =
			tab.value === "login"
				? await cloud.login(name.value, secret.value, rememberMe.value)
				: await cloud.register(
						name.value,
						secret.value,
						invite.value,
						hint.value,
					);
		secret.value = "";
		if (outcome === "applied") {
			sayOk("已用云端数据覆盖本地，正在重新加载…");
			setTimeout(() => window.location.reload(), 700);
			return;
		}
		sayOk(
			outcome === "pushed"
				? "已登录，这台设备的数据已上传到云端"
				: "已登录，云端与本地数据一致",
		);
	} catch (err) {
		sayError(err);
	} finally {
		pending.value = false;
	}
}

async function upload() {
	if (pending.value) return;
	pending.value = true;
	message.value = null;
	const ok = await cloud.push();
	if (ok) sayOk("已上传到云端");
	else sayError(cloud.error ?? "上传失败");
	pending.value = false;
}

async function download() {
	if (pending.value) return;
	confirmDownload.value = false;
	pending.value = true;
	message.value = null;
	const ok = await cloud.download();
	if (ok) {
		sayOk("已用云端数据覆盖本地，正在重新加载…");
		setTimeout(() => window.location.reload(), 700);
	} else {
		sayError(cloud.error ?? "云端没有数据");
	}
	pending.value = false;
}

const statusText = computed(() => {
	if (!cloud.loggedIn) return "未登录 · 数据只保存在这台设备";
	if (cloud.status === "syncing") return "同步中…";
	if (cloud.status === "error") return "同步失败，稍后会自动重试";
	if (cloud.dirty) return "有改动待上传";
	if (cloud.lastSyncAt) {
		return `已同步 · ${new Date(cloud.lastSyncAt).toLocaleTimeString()}`;
	}
	return "已登录";
});

const badge = computed(() => {
	if (cloud.status === "error") return { label: "离线", tone: "error" };
	if (cloud.loggedIn) return { label: "云端", tone: "ok" };
	return { label: "本地", tone: "idle" };
});

const fieldClass =
	"mt-1 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] text-white/85 placeholder:text-white/25 focus:border-sky-400/50 focus:outline-none";
</script>

<template>
	<PalmModal
		v-model:show="show"
		title="云存档"
		subtitle="登录可以将游戏数据存储到云服务器，包含所有游戏的对局存档、游戏记录与本地设置。"
		max-width="520px">
		<div class="space-y-3">
			<div
				class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
				<div class="min-w-0">
					<p class="text-[12px] font-medium text-white/85">
						{{ cloud.loggedIn ? cloud.username : "未登录" }}
					</p>
					<p class="mt-0.5 text-[10.5px] text-white/40">
						{{ statusText }}
					</p>
				</div>
				<span
					class="rounded-full border px-2 py-0.5 text-[10px]"
					:class="
						badge.tone === 'error'
							? 'border-rose-400/40 bg-rose-400/10 text-rose-100'
							: badge.tone === 'ok'
								? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
								: 'border-white/15 bg-white/5 text-white/45'
					">
					{{ badge.label }}
				</span>
			</div>

			<!-- 未登录：登录 / 注册 -->
			<template v-if="!cloud.loggedIn">
				<div class="flex items-center gap-1.5">
					<button
						v-for="item in TABS"
						:key="item.key"
						type="button"
						class="rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
						:class="
							tab === item.key
								? 'bg-white/12 text-white'
								: 'text-white/40 hover:text-white/70'
						"
						@click="setTab(item.key)">
						{{ item.label }}
					</button>
				</div>

				<label class="block">
					<span class="text-[11px] text-white/45">用户名</span>
					<input
						v-model="name"
						type="text"
						autocomplete="username"
						placeholder="3–32 个字符"
						:class="fieldClass" />
				</label>

				<label class="block">
					<span class="text-[11px] text-white/45">密码</span>
					<input
						v-model="secret"
						type="password"
						:autocomplete="
							tab === 'login'
								? 'current-password'
								: 'new-password'
						"
						:placeholder="
							tab === 'login' ? '账号密码' : '至少 6 个字符'
						"
						:class="fieldClass"
						@keyup.enter="submit" />
				</label>

				<template v-if="tab === 'register'">
					<label class="block">
						<span class="text-[11px] text-white/45">邀请码</span>
						<input
							v-model="invite"
							type="text"
							placeholder="向管理员索取，一次性使用"
							:class="fieldClass" />
					</label>
					<label class="block">
						<span class="text-[11px] text-white/45">
							主密码提示（可选）
						</span>
						<input
							v-model="hint"
							type="text"
							placeholder="只会在密码错误时提示，别写敏感信息"
							:class="fieldClass" />
					</label>
				</template>

				<label
					v-if="tab === 'login'"
					class="flex cursor-pointer items-center gap-2 text-[11px] text-white/50">
					<input
						v-model="rememberMe"
						type="checkbox"
						class="h-3.5 w-3.5 accent-sky-400" />
					记住我
				</label>

				<div class="flex items-center justify-end gap-2">
					<button
						type="button"
						class="rounded-full px-4 py-1.5 text-[11.5px] font-semibold text-[#031420] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
						style="background: #38bdf8"
						:disabled="pending"
						@click="submit">
						{{
							pending
								? "请稍候…"
								: tab === "login"
									? "登录并同步"
									: "注册并同步"
						}}
					</button>
				</div>
			</template>

			<!-- 已登录：同步操作 -->
			<template v-else>
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="rounded-xl border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-[11.5px] font-medium text-sky-100 transition-colors hover:bg-sky-400/20 focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
						:disabled="pending"
						@click="upload">
						立即上传
					</button>
					<button
						type="button"
						class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[11.5px] text-white/70 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
						:disabled="pending"
						@click="confirmDownload = true">
						从云端下载
					</button>
				</div>

				<div
					v-if="confirmDownload"
					class="rounded-2xl border border-rose-400/35 bg-rose-400/[0.08] px-3 py-2.5">
					<p class="text-[11px] leading-4 text-rose-100/80">
						会用云端数据覆盖这台设备上的对局存档、游戏记录与设置，覆盖后页面会重新加载。
					</p>
					<div class="mt-2 flex items-center justify-end gap-2">
						<button
							type="button"
							class="rounded-full border border-white/12 px-3 py-1 text-[11px] text-white/60 transition-colors hover:text-white focus-visible:outline-none"
							@click="confirmDownload = false">
							取消
						</button>
						<button
							type="button"
							class="rounded-full bg-rose-400 px-3 py-1 text-[11px] font-semibold text-rose-950 transition-opacity hover:opacity-90 focus-visible:outline-none"
							@click="download">
							确认覆盖
						</button>
					</div>
				</div>

				<div
					class="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
					<p class="text-[10.5px] leading-4 text-white/35">
						改动约 2 秒后自动上传；进入游戏时会自动拉取最新数据。
					</p>
					<button
						type="button"
						class="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50 transition-colors hover:border-rose-400/40 hover:text-rose-200 focus-visible:outline-none"
						@click="cloud.logout()">
						退出登录
					</button>
				</div>
			</template>

			<p
				v-if="message"
				class="rounded-xl border px-3 py-2 text-[11px] leading-4"
				:class="
					messageTone === 'error'
						? 'border-rose-400/35 bg-rose-400/[0.08] text-rose-100/85'
						: 'border-emerald-400/35 bg-emerald-400/[0.08] text-emerald-100/85'
				">
				{{ message }}
			</p>
		</div>
	</PalmModal>
</template>
