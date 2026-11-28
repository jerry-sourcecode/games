import gameplay from "./gameplay.md?raw";
import type { GameDetail } from "@/types/game";

export const regicideGame: GameDetail = {
	name: "弑君者",
	tagline: "独自面对十二名王室，用一副扑克掀翻王座。",
	cover: "/regicide/index.jpg",
	category: "合作卡牌",
	duration: "15~30 分钟",
	players: "1 人",
	age: "12 岁以上",
	version: "v0.1",
	tags: ["卡牌", "肉鸽", "单人"],	status: "已上线",
	accent: "#A78BFA",
	gradient: "linear-gradient(160deg, #2a1140 0%, #140b1f 60%, #05060a 100%)",
	gameplay,
	author: {
		name: "Paul Abrahams · Badgers from Mars",
		role: "《Regicide》原版设计师",
		bio: "《弑君者》改编自 Paul Abrahams 设计、Badgers from Mars 出版的合作卡牌游戏 Regicide，本站使用其扑克牌原画素材实现了单人版本。",
	},
};
