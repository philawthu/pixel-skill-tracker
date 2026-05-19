import type { Skill, TitleUnlock } from '../types';

interface StatsPanelProps {
  skills: Skill[];
  titleUnlocks: TitleUnlock[];
}

export function StatsPanel({ skills, titleUnlocks }: StatsPanelProps) {
  const totalCheckins = skills.reduce((sum, s) => sum + s.totalCheckins, 0);
  const totalExp = skills.reduce((sum, s) => sum + s.exp, 0);
  const maxLevel = skills.length > 0 ? Math.max(...skills.map(s => s.level)) : 0;
  const maxStreak = skills.length > 0 ? Math.max(...skills.map(s => s.streak)) : 0;

  return (
    <div className="pixel-card p-4">
      <h2 className="text-[10px] text-[#3d2010] mb-3">📊 冒险统计</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#fff8dc] p-2 pixel-border-light">
          <p className="text-[7px] text-[#8b4513]">总打卡</p>
          <p className="text-[12px] text-[#3d2010]">{totalCheckins}</p>
        </div>
        <div className="bg-[#fff8dc] p-2 pixel-border-light">
          <p className="text-[7px] text-[#8b4513]">总经验</p>
          <p className="text-[12px] text-[#3d2010]">{totalExp}</p>
        </div>
        <div className="bg-[#fff8dc] p-2 pixel-border-light">
          <p className="text-[7px] text-[#8b4513]">最高等级</p>
          <p className="text-[12px] text-[#daa520]">Lv.{maxLevel}</p>
        </div>
        <div className="bg-[#fff8dc] p-2 pixel-border-light">
          <p className="text-[7px] text-[#8b4513]">最长连续</p>
          <p className="text-[12px] text-[#32cd32]">{maxStreak}天</p>
        </div>
      </div>

      {/* Unlocked Titles (deduplicated by skillId + level) */}
      {titleUnlocks.length > 0 && (
        <div className="mt-3">
          <h3 className="text-[8px] text-[#5c3a21] mb-2">🏆 已解锁称号：</h3>
          <div className="flex flex-wrap gap-1">
            {titleUnlocks
              .filter((t, i, arr) => arr.findIndex(x => x.skillId === t.skillId && x.level === t.level) === i)
              .map((t, i) => {
              const badgeConfig = (() => {
                if (t.level >= 30) return { icon: '🌟', className: '', style: { backgroundColor: '#ff450022', borderColor: '#ff4500', color: '#8b2500' } };
                if (t.level >= 20) return { icon: '🔮', className: '', style: { backgroundColor: '#ff69b422', borderColor: '#ff69b4', color: '#8b0060' } };
                if (t.level >= 15) return { icon: '💎', className: '', style: { backgroundColor: '#00bfff22', borderColor: '#00bfff', color: '#006080' } };
                if (t.level >= 10) return { icon: '👑', className: 'pixel-badge-gold', style: undefined };
                return { icon: '🏅', className: 'pixel-badge-silver', style: undefined };
              })();
              return (
                <span
                  key={`${t.skillId}-${t.level}-${i}`}
                  className={`pixel-badge ${badgeConfig.className}`}
                  style={badgeConfig.style}
                >
                  {badgeConfig.icon} {t.skillName}·{t.title}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
