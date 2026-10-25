<script setup lang="ts">
import { onMounted, computed, useTemplateRef, shallowRef, reactive } from 'vue';
import gsap from 'gsap';

interface CardItem {
  image: string;
  title: string;
  subtitle: string;
  /** Small chips rendered under the subtitle. */
  tags?: string[];
  /** Status pill on the right of the title, e.g. 已上线 / 测试中. */
  status?: string;
  borderColor?: string;
  gradient?: string;
  /** Absolute http(s) URLs open in a new tab; internal paths are handled by the parent via `select`. */
  url?: string;
  /** Call-to-action label, defaults to 开始游戏. */
  cta?: string;
}

interface GridMotionProps {
  items?: CardItem[];
  className?: string;
  radius?: number;
  damping?: number;
  fadeOut?: number;
  ease?: string;
}

const props = withDefaults(defineProps<GridMotionProps>(), {
  items: () => [],
  className: '',
  radius: 300,
  damping: 0.45,
  fadeOut: 0.6,
  ease: 'power3.out'
});

const emit = defineEmits<{ select: [item: CardItem, index: number] }>();

const rootRef = useTemplateRef<HTMLElement>('rootRef');
const fadeRef = useTemplateRef<HTMLElement>('fadeRef');
const setX = shallowRef<(value: number | string) => void>();
const setY = shallowRef<(value: number | string) => void>();
const pos = reactive({ x: 0, y: 0 });

const demo: CardItem[] = [
  {
    image: 'https://i.pravatar.cc/300?img=8',
    title: 'Alex Rivera',
    subtitle: 'Full Stack Developer',
    tags: ['TypeScript', 'Vue'],
    status: '已上线',
    borderColor: '#4F46E5',
    gradient: 'linear-gradient(145deg,#4F46E5,#000)',
    url: 'https://github.com/'
  },
  {
    image: 'https://i.pravatar.cc/300?img=11',
    title: 'Jordan Chen',
    subtitle: 'DevOps Engineer',
    tags: ['CI/CD', 'K8s'],
    status: '测试中',
    borderColor: '#10B981',
    gradient: 'linear-gradient(210deg,#10B981,#000)',
    url: 'https://linkedin.com/in/'
  },
  {
    image: 'https://i.pravatar.cc/300?img=3',
    title: 'Morgan Blake',
    subtitle: 'UI/UX Designer',
    tags: ['Figma', 'Branding'],
    status: '已上线',
    borderColor: '#F59E0B',
    gradient: 'linear-gradient(165deg,#F59E0B,#000)',
    url: 'https://dribbble.com/'
  }
];

const data = computed(() => (props.items.length ? props.items : demo));

onMounted(() => {
  const el = rootRef.value;
  if (!el) return;

  setX.value = gsap.quickSetter(el, '--x', 'px') as (value: number | string) => void;
  setY.value = gsap.quickSetter(el, '--y', 'px') as (value: number | string) => void;
  const { width, height } = el.getBoundingClientRect();
  pos.x = width / 2;
  pos.y = height / 2;
  setX.value?.(pos.x);
  setY.value?.(pos.y);
});

const moveTo = (x: number, y: number) => {
  gsap.to(pos, {
    x,
    y,
    duration: props.damping,
    ease: props.ease,
    onUpdate: () => {
      setX.value?.(pos.x);
      setY.value?.(pos.y);
    },
    overwrite: true
  });
};

const handleMove = (e: PointerEvent) => {
  const r = rootRef.value?.getBoundingClientRect();
  if (!r) return;
  moveTo(e.clientX - r.left, e.clientY - r.top);
  if (fadeRef.value) {
    gsap.to(fadeRef.value, { opacity: 0, duration: 0.25, overwrite: true });
  }
};

const handleLeave = () => {
  if (fadeRef.value) {
    gsap.to(fadeRef.value, {
      opacity: 1,
      duration: props.fadeOut,
      overwrite: true
    });
  }
};

const handleSelect = (item: CardItem, index: number) => {
  emit('select', item, index);
  if (item.url && /^https?:\/\//i.test(item.url)) {
    window.open(item.url, '_blank', 'noopener,noreferrer');
  }
};

const handleCardMove = (e: MouseEvent) => {
  const c = e.currentTarget as HTMLElement;
  const rect = c.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  c.style.setProperty('--mouse-x', `${x}px`);
  c.style.setProperty('--mouse-y', `${y}px`);
};

const spotlightStyle = {
  backdropFilter: 'grayscale(1) brightness(0.78)',
  WebkitBackdropFilter: 'grayscale(1) brightness(0.78)',
  background: 'rgba(0,0,0,0.001)',
  maskImage:
    'radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0%,transparent 15%,rgba(0,0,0,0.10) 30%,rgba(0,0,0,0.22) 45%,rgba(0,0,0,0.35) 60%,rgba(0,0,0,0.50) 75%,rgba(0,0,0,0.68) 88%,white 100%)',
  WebkitMaskImage:
    'radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0%,transparent 15%,rgba(0,0,0,0.10) 30%,rgba(0,0,0,0.22) 45%,rgba(0,0,0,0.35) 60%,rgba(0,0,0,0.50) 75%,rgba(0,0,0,0.68) 88%,white 100%)'
};

const fadeStyle = {
  ...spotlightStyle,
  maskImage:
    'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90) 30%,rgba(255,255,255,0.78) 45%,rgba(255,255,255,0.65) 60%,rgba(255,255,255,0.50) 75%,rgba(255,255,255,0.32) 88%,transparent 100%)',
  WebkitMaskImage:
    'radial-gradient(circle var(--r) at var(--x) var(--y),white 0%,white 15%,rgba(255,255,255,0.90) 30%,rgba(255,255,255,0.78) 45%,rgba(255,255,255,0.65) 60%,rgba(255,255,255,0.50) 75%,rgba(255,255,255,0.32) 88%,transparent 100%)',
  opacity: 1
};
</script>

<template>
  <div
    ref="rootRef"
    class="relative grid h-full w-full grid-cols-1 content-start gap-4 md:grid-cols-2"
    :class="className"
    :style="{
      '--r': `${props.radius}px`,
      '--x': '50%',
      '--y': '50%'
    }"
    @pointermove="handleMove"
    @pointerleave="handleLeave"
  >
    <article
      v-for="(c, i) in data"
      :key="`${c.title}-${i}`"
      class="group relative flex min-w-0 items-stretch overflow-hidden rounded-[20px] border border-[#333] p-2.5 transition-all duration-300 hover:border-[var(--card-border)]"
      :class="
        c.url
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_var(--card-border)] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none'
          : 'cursor-default'
      "
      :style="{
        '--mouse-x': '50%',
        '--mouse-y': '50%',
        '--card-border': c.borderColor || 'transparent',
        '--spotlight-color': 'rgba(255,255,255,0.3)',
        background: c.gradient,
        cursor: c.url ? 'pointer' : 'default'
      }"
      :tabindex="c.url ? 0 : -1"
      :role="c.url ? 'link' : undefined"
      @mousemove="handleCardMove"
      @click="handleSelect(c, i)"
      @keydown.enter.prevent="handleSelect(c, i)"
      @keydown.space.prevent="handleSelect(c, i)"
    >
      <div
        class="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        :style="{
          background:
            'radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)'
        }"
      />

      <div class="relative z-10 w-[92px] shrink-0 self-center sm:w-[112px] md:w-[140px]">
        <img
          :src="c.image"
          :alt="c.title"
          loading="lazy"
          class="block aspect-square w-full rounded-[14px] object-cover"
        />
      </div>

      <div class="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 md:px-4">
        <div class="flex items-start justify-between gap-2">
          <h3 class="m-0 truncate font-sans text-[1.05rem] leading-6 font-semibold text-white">
            {{ c.title }}
          </h3>
          <span
            v-if="c.status"
            class="mt-0.5 shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] leading-4 font-medium text-white/50"
          >
            {{ c.status }}
          </span>
        </div>

        <p class="m-0 line-clamp-2 font-sans text-[12.5px] leading-5 text-white/45">
          {{ c.subtitle }}
        </p>

        <div v-if="c.tags?.length" class="mt-0.5 flex flex-wrap gap-1.5">
          <span
            v-for="tag in c.tags"
            :key="tag"
            class="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-sans text-[11px] leading-4 text-white/55"
          >
            {{ tag }}
          </span>
        </div>

        <div
          v-if="c.cta || c.url"
          class="mt-1.5 inline-flex items-center gap-1 font-sans text-[11.5px] font-medium"
          :style="{ color: c.borderColor || '#a7f3d0' }"
        >
          <span>{{ c.cta || '开始游戏' }}</span>
          <span aria-hidden="true" class="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </div>
    </article>

    <div class="chroma-spotlight pointer-events-none absolute inset-0 z-30" :style="spotlightStyle" />
    <div
      ref="fadeRef"
      class="chroma-fade pointer-events-none absolute inset-0 z-40 transition-opacity duration-[250ms]"
      :style="fadeStyle"
    />
  </div>
</template>

<style scoped>
/* No pointer, no spotlight: keep the cards in full color on touch-only devices. */
@media (hover: none) {
  .chroma-spotlight,
  .chroma-fade {
    display: none;
  }
}
</style>
