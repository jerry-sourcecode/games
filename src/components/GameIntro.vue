<script setup lang="ts">
import {
	computed,
	h,
	onBeforeUnmount,
	onMounted,
	ref,
	shallowRef,
	useTemplateRef,
} from "vue";
import { useRouter } from "vue-router";
import gsap from "gsap";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { GameDetail, GameFact } from "@/types/game";
import { NDataTable } from "naive-ui";
import { useHabitsRecord } from "@/habits/data/gameRecord";
import { formatDateTime } from "@/utils/utils";
import { HabitsResultRecord } from "@/habits/modal/habitModal";

const props = defineProps<{ game: GameDetail }>();
const emit = defineEmits<{ start: [] }>();

const router = useRouter();

const rootRef = useTemplateRef<HTMLElement>("rootRef");
const setX = shallowRef<(value: number) => void>();
const setY = shallowRef<(value: number) => void>();

const tabs = [
	{ id: "gameplay", label: "游戏玩法" },
	{ id: "author", label: "关于作者" },
	{ id: "record", label: "游戏记录" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const activeTab = ref<TabId>("gameplay");

const habitsRecord = useHabitsRecord();

const accent = computed(() => props.game.accent ?? "#34D399");
const accentGlow = computed(() => `${accent.value}24`);
const accentLine = computed(() => `${accent.value}3d`);
const accentTint = computed(() => `${accent.value}1a`);

const facts = computed<GameFact[]>(() => [
	{ label: "时长", value: props.game.duration },
	{ label: "人数", value: props.game.players },
	{ label: "适合年龄", value: props.game.age },
	{ label: "版本", value: props.game.version },
	{ label: "分类", value: props.game.category },
]);

const gameplayHtml = computed(() =>
	DOMPurify.sanitize(
		marked.parse(props.game.gameplay, {
			async: false,
			gfm: true,
			breaks: true,
		}),
	),
);

const authorInitial = computed(
	() =>
		props.game.author?.name
			.trim()
			.replace(/^[^\p{L}\p{N}]+/u, "")
			.charAt(0) || "",
);

const hasAuthor = computed(() => Boolean(props.game.author));

const handleStart = () => {
	const to = props.game.cta?.to;
	if (to) router.push(to);
	else emit("start");
};

const spotlightStyle = computed(() => ({
	background: `radial-gradient(460px circle at var(--mx) var(--my), ${accentGlow.value}, transparent 68%)`,
}));

const handleMove = (e: PointerEvent) => {
	const el = rootRef.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	setX.value?.(e.clientX - rect.left);
	setY.value?.(e.clientY - rect.top);
};

let observer: IntersectionObserver | undefined;

onMounted(() => {
	const el = rootRef.value;
	if (!el) return;

	setX.value = gsap.quickSetter(el, "--mx", "px") as (value: number) => void;
	setY.value = gsap.quickSetter(el, "--my", "px") as (value: number) => void;
	setX.value(el.clientWidth / 2);
	setY.value(el.clientHeight / 3);

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				observer?.unobserve(entry.target);
				const target = entry.target as HTMLElement;
				gsap.to(target, {
					opacity: 1,
					y: 0,
					duration: 0.6,
					ease: "power3.out",
					delay: Number(target.dataset.revealIndex ?? 0) * 0.05,
				});
			}
		},
		{ rootMargin: "0px 0px -8% 0px" },
	);

	el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) =>
		observer?.observe(item),
	);
});

onBeforeUnmount(() => {
	observer?.disconnect();
	observer = undefined;
});
</script>

<template>
	<section
		ref="rootRef"
		class="game-intro relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-9"
		:style="{ '--accent': accent }"
		@pointermove="handleMove">
		<div
			class="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
			:style="spotlightStyle" />

		<div
			class="relative z-10 grid gap-7 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-9">
			<div
				data-reveal="0"
				data-reveal-index="0"
				class="mx-auto w-full max-w-[264px] lg:mx-0">
				<div
					class="relative overflow-hidden rounded-[22px] border border-white/10"
					:style="{
						background: game.gradient,
						boxShadow: `0 30px 80px -50px ${accent}`,
					}">
					<img
						:src="game.cover"
						:alt="game.name"
						class="block aspect-[4/5] w-full object-cover" />
					<span
						v-if="game.status"
						class="absolute top-3 left-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10.5px] font-medium text-white/75 backdrop-blur">
						{{ game.status }}
					</span>
				</div>
			</div>

			<div class="min-w-0">
				<p
					data-reveal
					data-reveal-index="1"
					class="text-[10.5px] font-medium tracking-[0.32em] uppercase"
					:style="{ color: accent }">
					分类 · {{ game.category }}
				</p>

				<h1
					data-reveal
					data-reveal-index="2"
					class="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
					{{ game.name }}
				</h1>

				<p
					data-reveal
					data-reveal-index="3"
					class="mt-3 max-w-xl text-sm leading-6 text-white/50">
					{{ game.tagline }}
				</p>

				<div
					v-if="game.tags?.length"
					data-reveal
					data-reveal-index="4"
					class="mt-4 flex flex-wrap gap-1.5">
					<span
						v-for="tag in game.tags"
						:key="tag"
						class="rounded-md border px-2 py-1 text-[11.5px] leading-4"
						:style="{
							borderColor: accentLine,
							background: accentTint,
							color: accent,
						}">
						{{ tag }}
					</span>
				</div>

				<dl
					data-reveal
					data-reveal-index="5"
					class="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
					<div
						v-for="fact in facts"
						:key="fact.label"
						class="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
						<dt class="text-[10px] tracking-[0.16em] text-white/30">
							{{ fact.label }}
						</dt>
						<dd
							class="mt-1 truncate text-[13px] font-medium text-white/85">
							{{ fact.value }}
						</dd>
					</div>
				</dl>

				<div
					data-reveal
					data-reveal-index="6"
					class="mt-6 flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#04120c] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
						:style="{
							background: accent,
							boxShadow: `0 18px 44px -20px ${accent}`,
						}"
						@click="handleStart">
						<span aria-hidden="true" class="text-[10px]">▶</span>
						{{ game.cta?.label ?? "开始游戏" }}
					</button>
					<span v-if="game.status" class="text-[11px] text-white/30">
						当前版本 {{ game.version }} · {{ game.status }}
					</span>
				</div>
			</div>
		</div>

		<div class="relative z-10 mt-8 border-t border-white/10 pt-6">
			<div
				class="flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
				role="tablist"
				aria-label="游戏信息">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					role="tab"
					:aria-selected="activeTab === tab.id"
					:aria-controls="`panel-${tab.id}`"
					:id="`tab-${tab.id}`"
					class="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
					:class="
						activeTab === tab.id
							? ''
							: 'text-white/45 hover:text-white/70'
					"
					:style="
						activeTab === tab.id
							? {
									background: accentTint,
									color: accent,
									boxShadow: `inset 0 0 0 1px ${accentLine}`,
								}
							: undefined
					"
					@click="activeTab = tab.id">
					{{ tab.label }}
				</button>
			</div>

			<div
				v-if="activeTab === 'gameplay'"
				id="panel-gameplay"
				role="tabpanel"
				aria-labelledby="tab-gameplay"
				class="game-prose mt-5"
				v-html="gameplayHtml" />

			<div
				v-if="activeTab === 'author'"
				id="panel-author"
				role="tabpanel"
				aria-labelledby="tab-author"
				class="mt-5">
				<div
					v-if="hasAuthor"
					class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
					<div
						class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-base font-semibold"
						:style="{
							borderColor: accentLine,
							background: accentTint,
							color: accent,
						}"
						aria-hidden="true">
						{{ authorInitial }}
					</div>

					<div class="min-w-0">
						<p class="text-sm font-semibold text-white">
							{{ game.author?.name }}
						</p>
						<p
							v-if="game.author?.role"
							class="mt-0.5 text-[11.5px] text-white/35">
							{{ game.author.role }}
						</p>
						<p
							v-if="game.author?.bio"
							class="mt-2.5 text-[12.5px] leading-6 whitespace-pre-line text-white/55">
							{{ game.author.bio }}
						</p>

						<ul
							v-if="game.author?.links?.length"
							class="mt-4 flex flex-wrap gap-2">
							<li
								v-for="link in game.author.links"
								:key="link.href">
								<a
									:href="link.href"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] text-white/60 transition-colors hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none">
									<span class="font-medium">{{
										link.label
									}}</span>
									<span class="text-white/30">{{
										link.value
									}}</span>
								</a>
							</li>
						</ul>
					</div>
				</div>

				<p v-else class="text-[12px] text-white/35">暂无作者信息。</p>
			</div>

			<div
				v-if="activeTab === 'record'"
				id="panel-record"
				role="tabpanel">
				<NDataTable
					:columns="[
						{
							title: '时间',
							key: 'time',
							render(rowData: HabitsResultRecord) {
								return h(
									'p',
									null,
									formatDateTime(rowData.time),
								);
							},
						},
						{
							title: '使用轮次',
							key: 'round',
						},
						{
							title: '结果',
							key: 'result',
							render(rowData: HabitsResultRecord) {
								const isSuccess = rowData.result === 'win';
								return h(
									'div',
									{
										style: {
											display: 'inline-flex',
											alignItems: 'center',
											padding: '3px 12px',
											borderRadius: '6px',
											fontSize: '14px',
											// 绿色 / 红色主题
											color: isSuccess
												? '#16a34a'
												: '#dc2626',
											backgroundColor: isSuccess
												? 'rgba(22, 163, 74, 0.1)'
												: 'rgba(220, 38, 38, 0.1)',
											border: `1px solid ${
												isSuccess
													? 'rgba(22, 163, 74, 0.3)'
													: 'rgba(220, 38, 38, 0.3)'
											}`,
										},
									},
									h('span', isSuccess ? '胜利' : '失败'),
								);
							},
						},
					]"
					:data="habitsRecord.result"></NDataTable>
			</div>
		</div>
	</section>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
	.game-intro [data-reveal] {
		opacity: 0;
		transform: translateY(18px);
	}
}

@media (hover: none) {
	.game-intro > div:first-child {
		display: none;
	}
}

.game-prose :deep(h2),
.game-prose :deep(h3),
.game-prose :deep(h4) {
	margin: 1.1rem 0 0.45rem;
	font-size: 12.5px;
	font-weight: 600;
	letter-spacing: 0.02em;
	color: rgb(255 255 255 / 0.82);
}

.game-prose :deep(h2:first-child),
.game-prose :deep(h3:first-child),
.game-prose :deep(h4:first-child) {
	margin-top: 0;
}

.game-prose :deep(p) {
	margin: 0.6rem 0 0;
	font-size: 12.5px;
	line-height: 1.8;
	color: rgb(255 255 255 / 0.55);
}

.game-prose :deep(p:first-child) {
	margin-top: 0;
}

.game-prose :deep(ol),
.game-prose :deep(ul) {
	display: grid;
	gap: 0.3rem;
	margin: 0.5rem 0 0;
	padding-left: 1.15rem;
}

.game-prose :deep(ol) {
	list-style: decimal;
}

.game-prose :deep(ul) {
	list-style: disc;
}

.game-prose :deep(li) {
	padding-left: 0.15rem;
	font-size: 12.5px;
	line-height: 1.7;
	color: rgb(255 255 255 / 0.55);
}

.game-prose :deep(li::marker) {
	color: var(--accent);
}

.game-prose :deep(strong) {
	font-weight: 600;
	color: rgb(255 255 255 / 0.85);
}

.game-prose :deep(em) {
	color: rgb(255 255 255 / 0.7);
}

.game-prose :deep(code) {
	border-radius: 0.35rem;
	background: rgb(255 255 255 / 0.08);
	padding: 0.1rem 0.3rem;
	font-size: 11.5px;
	color: var(--accent);
}

.game-prose :deep(blockquote) {
	margin: 0.6rem 0 0;
	border-left: 2px solid var(--accent);
	padding: 0.1rem 0 0.1rem 0.75rem;
	font-size: 12.5px;
	line-height: 1.7;
	color: rgb(255 255 255 / 0.45);
}

.game-prose :deep(blockquote p) {
	margin: 0;
	color: inherit;
}

.game-prose :deep(a) {
	color: var(--accent);
	text-decoration: underline;
	text-underline-offset: 2px;
}

.game-prose :deep(hr) {
	margin: 1rem 0;
	border: 0;
	border-top: 1px solid rgb(255 255 255 / 0.1);
}

.game-prose :deep(table) {
	width: 100%;
	margin-top: 0.6rem;
	border-collapse: collapse;
	font-size: 12px;
}

.game-prose :deep(th),
.game-prose :deep(td) {
	border: 1px solid rgb(255 255 255 / 0.1);
	padding: 0.35rem 0.5rem;
	text-align: left;
	color: rgb(255 255 255 / 0.55);
}

.game-prose :deep(th) {
	font-weight: 600;
	color: rgb(255 255 255 / 0.75);
}
</style>
