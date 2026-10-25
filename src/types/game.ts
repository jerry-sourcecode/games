export interface GameFact {
  label: string
  value: string
}

export interface GameAuthorLink {
  label: string
  value: string
  href: string
}

export interface GameAuthor {
  name: string
  role?: string
  /** 作者自述，纯文本，换行会保留 */
  bio?: string
  links?: GameAuthorLink[]
}

export interface GameDetail {
  /** 游戏名称 */
  name: string
  /** 一句话简介 */
  tagline: string
  cover: string
  /** 分类，如「谜题」 */
  category: string
  /** 单局时长 */
  duration: string
  /** 支持人数 */
  players: string
  /** 适合年龄 */
  age: string
  /** 版本号 */
  version: string
  tags?: string[]
  /** 状态胶囊，如「开发中」「已上线」 */
  status?: string
  /** 6 位十六进制主题色，驱动高光与强调色 */
  accent?: string
  /** 封面卡片底色 */
  gradient?: string
  /** 玩法说明，Markdown 文本 */
  gameplay: string
  /** 原作者信息 */
  author?: GameAuthor
  /** 可选行动按钮；带 `to` 时点击跳转站内路由，否则由父组件监听 `start` */
  cta?: { label: string; to?: string }
}
