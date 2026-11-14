import palmGameplay from '@/palm/content/palmGameplay.md?raw'
import type { GameDetail } from '@/types/game'

/** 棕榈岛：目前只完成介绍页，对局功能开发中 */
export const palmGame: GameDetail = {
    name: '棕榈岛',
    tagline: '开发并收集资源，培养一个可以放在你手掌上的小岛。',
    cover: '/PalmIsland/index.webp',
    category: '策略',
    duration: '15~30 分钟',
    players: '1~2 人',
    age: '10 岁以上',
    version: 'v0.1 预览版',
    tags: ['牌组构筑', '单人'],
    status: '开发中',
    accent: '#38BDF8',
    gradient: 'linear-gradient(160deg, #0c4a6e 0%, #0b1220 60%, #05060a 100%)',
    gameplay: palmGameplay,
    author: {
        name: 'Jon Mietling',
        role: '设计师 · Portal Dragon',
        links: [
            {
                label: 'BGG',
                value: 'boardgamegeek.com/boardgame/258453/palm-island',
                href: 'https://boardgamegeek.com/boardgame/239464/palm-island',
            },
        ],
    },
}
