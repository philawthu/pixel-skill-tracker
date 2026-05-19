export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  color: string;       // 分类标签颜色
  isPreset: boolean;   // 是否预设分类（不可删除）
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  level: number;
  exp: number;
  totalCheckins: number;
  streak: number;
  lastCheckin: string | null;
  todayCheckins: number;
  createdAt: string;
  title5: string;
  title10: string;
  title15: string;
  title20: string;
  title30: string;
  categoryId: string;  // 所属分类 ID
}

export interface CheckinRecord {
  id: string;
  skillId: string;
  date: string;
  time: string;
  timeSlot: string;      // 打卡时间段（如 "09:00-10:00"、"14:00-15:30"）
  expGained: number;
  note: string;
}

export interface TitleUnlock {
  skillId: string;
  skillName: string;
  title: string;
  level: number;
  unlockedAt: string;
}

export interface Equipment {
  id: string;
  skillId: string;       // 所属技能 ID
  name: string;          // 装备名称
  acquiredDate: string;  // 获得日期 YYYY-MM-DD
  acquiredMethod: string; // 获得方式（如 购买、比赛奖品、朋友赠送...）
  price: string;         // 价格（字符串，允许写"免费"、"¥199"等）
  icon: string;          // 装备图标
  note?: string;         // 额外备注
  createdAt: string;     // 记录创建时间
  retired?: boolean;     // 是否为历史装备（不再使用）
  retiredAt?: string;    // 标记为历史装备的时间
}

export interface Course {
  id: string;
  skillId: string;       // 所属技能 ID
  name: string;          // 课程名称
  date: string;          // 上课日期 YYYY-MM-DD
  duration: string;      // 课程时长（如 "1小时"、"90分钟"、"2小时"）
  price: string;         // 课程价格（字符串，如 "¥200"、"免费"）
  note?: string;         // 备注
  createdAt: string;     // 记录创建时间
}

export type ReturnCategory = 'money' | 'emotion' | 'social' | 'health' | 'growth' | 'other';

export interface SkillReturn {
  id: string;
  skillId: string;       // 所属技能 ID
  title: string;         // 收获标题（如 "接到了一个商业演出"）
  category: ReturnCategory; // 收获类别
  date: string;          // 收获日期 YYYY-MM-DD
  moneyAmount?: string;  // 金钱数额（如 "¥5000"）— 仅当 category 含金钱时
  description: string;   // 详细描述
  note?: string;         // 额外备注
  createdAt: string;     // 记录创建时间
}
