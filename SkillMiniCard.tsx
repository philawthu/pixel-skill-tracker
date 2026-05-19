import type { Skill } from '../types';
import { getStarTier, getExpInCurrentLevel, getExpToNextLevel } from '../utils';

interface SkillMiniCardProps {
  skill: Skill;
  todayCheckins: number;
  onClick: () => void;
}

export function SkillMiniCard({ skill, todayCheckins, onClick }: SkillMiniCardProps) {
  const starTier = getStarTier(skill.level);
  const currentExp = getExpInCurrentLevel(skill);
  const nextLevelExp = getExpToNextLevel(skill);
  const progress = nextLevelExp > 0 ? (currentExp / nextLevelExp) * 100 : 0;

  // 显示最高称号
  const getHighestTitle = () => {
    if (skill.level >= 30) return { icon: '🌟', title: skill.title30 };
    if (skill.level >= 20) return { icon: '🔮', title: skill.title20 };
    if (skill.level >= 15) return { icon: '💎', title: skill.title15 };
    if (skill.level >= 10) return { icon: '👑', title: skill.title10 };
    if (skill.level >= 5) return { icon: '🏅', title: skill.title5 };
    return null;
  };

  const highestTitle = getHighestTitle();

  return (
    <div
      onClick={onClick}
      className="pixel-card p-3 cursor-pointer hover:translate-y-[-2px] transition-transform duration-200 relative group"
    >
      {/* 今日已打卡标记 */}
      {todayCheckins > 0 && (
        <div className="absolute -top-1 -right-1 bg-[#32cd32] text-white text-[6px] px-1.5 py-0.5 rounded-sm border-2 border-[#228b22] z-10">
          x{todayCheckins}
        </div>
      )}

      {/* 图标 + 名称 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[9px] text-[#3d2010] truncate">{skill.name}</h4>
          <p className="text-[7px]" style={{ color: starTier.color }}>
            Lv.{skill.level} {starTier.label}
          </p>
        </div>
      </div>

      {/* 迷你进度条 */}
      <div className="mb-1.5">
        <div className="h-[10px] bg-[#3d2010] border-2 border-[#5c3a21] rounded-sm overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: starTier.color,
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[6px] text-[#5c3a21]">{currentExp}/{nextLevelExp}</span>
          <span className="text-[6px] text-[#5c3a21]">🔥{skill.streak}天</span>
        </div>
      </div>

      {/* 最高称号 */}
      {highestTitle && (
        <div className="text-[6px] text-center py-0.5 px-1 bg-[#faebd7]/60 rounded-sm truncate" style={{ color: starTier.color }}>
          {highestTitle.icon} {highestTitle.title}
        </div>
      )}

      {/* 星星显示（简化：只显示当前段的星星） */}
      <div className="flex justify-center gap-0.5 mt-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`pixel-star ${i >= (skill.level % 5 || 5) ? 'pixel-star-empty' : ''}`}
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: i < (skill.level % 5 || 5) ? starTier.color : undefined,
            }}
          />
        ))}
      </div>

      {/* Hover 提示 */}
      <div className="absolute inset-0 bg-[#3d2010]/0 group-hover:bg-[#3d2010]/5 transition-colors rounded-sm pointer-events-none" />
    </div>
  );
}
