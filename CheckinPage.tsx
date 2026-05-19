import { useState, useMemo } from 'react';
import type { Skill, SkillCategory, CheckinRecord } from '../types';
import { getTodayString } from '../utils';
import { SkillCard } from './SkillCard';

interface CheckinPageProps {
  skills: Skill[];
  categories: SkillCategory[];
  checkinRecords: CheckinRecord[];
  onCheckin: (skillId: string, note: string, timeSlot: string) => void;
  onMakeupCheckin: (skillId: string, date: string, note: string, timeSlot: string) => void;
  onDelete: (skillId: string) => void;
  onAddSkill: () => void;
  onBack: () => void;
  onSkillDetail: (skillId: string) => void;
}

export function CheckinPage({
  skills,
  categories,
  checkinRecords,
  onCheckin,
  onMakeupCheckin,
  onDelete,
  onAddSkill,
  onBack,
  onSkillDetail,
}: CheckinPageProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const todayStr = getTodayString();

  // 今日打卡统计
  const todayRecords = useMemo(() =>
    checkinRecords.filter(r => r.date === todayStr),
    [checkinRecords, todayStr]
  );
  const todayTotalCheckins = todayRecords.length;
  const todayActiveSkills = new Set(todayRecords.map(r => r.skillId)).size;
  const todayCheckinsBySkill = useMemo(() => {
    const map: Record<string, number> = {};
    todayRecords.forEach(r => {
      map[r.skillId] = (map[r.skillId] || 0) + 1;
    });
    return map;
  }, [todayRecords]);

  // 按分类分组
  const skillsByCategory = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const cat of categories) {
      map[cat.id] = [];
    }
    map['uncategorized'] = [];
    for (const skill of skills) {
      const catId = skill.categoryId;
      if (map[catId]) {
        map[catId].push(skill);
      } else {
        map['uncategorized'].push(skill);
      }
    }
    return map;
  }, [skills, categories]);

  // 筛选
  const filteredCategories = useMemo(() => {
    if (activeFilter === 'all') return categories;
    return categories.filter(c => c.id === activeFilter);
  }, [categories, activeFilter]);

  return (
    <div>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="pixel-btn bg-[#8b4513] text-[#faf0e6] px-3 py-1.5 text-[8px]"
        >
          ← 返回首页
        </button>
        <h2 className="text-[11px] text-[#faf0e6]">⚔️ 每日打卡</h2>
        <button
          onClick={onAddSkill}
          className="pixel-btn bg-[#32cd32] text-white px-3 py-1.5 text-[8px] animate-pulse"
        >
          ➕ 新技能
        </button>
      </div>

      {/* 今日打卡进度条 */}
      <div className="pixel-card p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-[#3d2010]">📊 今日打卡进度</span>
          <span className="text-[7px] text-[#8b4513]">{todayStr}</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[14px] text-[#32cd32] font-bold">{todayTotalCheckins}</p>
            <p className="text-[6px] text-[#8b4513] mt-1">打卡次数</p>
          </div>
          <div className="flex-1 bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[14px] text-[#4169e1] font-bold">{todayActiveSkills}<span className="text-[8px] text-[#8b4513]">/{skills.length}</span></p>
            <p className="text-[6px] text-[#8b4513] mt-1">已打卡技能</p>
          </div>
          <div className="flex-1 bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[14px] text-[#daa520] font-bold">{skills.length - todayActiveSkills}</p>
            <p className="text-[6px] text-[#8b4513] mt-1">待打卡</p>
          </div>
        </div>
        {/* 打卡进度条 */}
        {skills.length > 0 && (
          <div className="mt-2">
            <div className="w-full h-[6px] bg-[#deb887] rounded-full overflow-hidden pixel-border-light">
              <div
                className="h-full bg-[#32cd32] transition-all duration-500"
                style={{ width: `${Math.min(100, (todayActiveSkills / skills.length) * 100)}%` }}
              />
            </div>
            <p className="text-[6px] text-[#8b4513] text-center mt-1">
              {todayActiveSkills === skills.length ? '🎉 所有技能已打卡！' : `还有 ${skills.length - todayActiveSkills} 项技能待打卡`}
            </p>
          </div>
        )}
      </div>

      {/* 快速打卡区 - 未打卡的技能优先显示 */}
      {skills.length > 0 && todayActiveSkills < skills.length && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] text-[#faf0e6]">⚡ 待打卡技能</span>
            <div className="h-[2px] flex-1 bg-[#cd5c5c] rounded-full opacity-40" />
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills
              .filter(s => !todayCheckinsBySkill[s.id])
              .map(skill => (
                <button
                  key={skill.id}
                  onClick={() => {
                    // 滚动到对应的技能卡片
                    const el = document.getElementById(`checkin-skill-${skill.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-[#32cd32]', 'ring-offset-2');
                      setTimeout(() => el.classList.remove('ring-2', 'ring-[#32cd32]', 'ring-offset-2'), 2000);
                    }
                  }}
                  className="pixel-btn bg-[#cd5c5c] text-white px-2 py-1 text-[7px] hover:bg-[#e74c3c] transition-colors"
                >
                  {skill.icon} {skill.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 分类筛选标签 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={`pixel-btn px-2 py-1 text-[7px] transition-colors ${
            activeFilter === 'all'
              ? 'bg-[#daa520] text-[#3d2010]'
              : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
          }`}
        >
          全部 ({skills.length})
        </button>
        {categories.map(cat => {
          const count = skillsByCategory[cat.id]?.length || 0;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id === activeFilter ? 'all' : cat.id)}
              className={`pixel-btn px-2 py-1 text-[7px] transition-colors ${
                activeFilter === cat.id
                  ? 'text-white'
                  : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
              }`}
              style={activeFilter === cat.id ? { backgroundColor: cat.color } : undefined}
            >
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* 技能卡片列表 - 按分类分组 */}
      {skills.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <div className="text-4xl mb-3">🗡️</div>
          <p className="text-[10px] text-[#3d2010] mb-2">还没有任何技能！</p>
          <p className="text-[8px] text-[#8b4513] mb-4">点击下方按钮开始你的冒险</p>
          <button
            onClick={onAddSkill}
            className="pixel-btn bg-[#daa520] text-[#3d2010] px-6 py-3 text-[12px]"
          >
            ➕ 添加第一个技能
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map(cat => {
            const catSkills = skillsByCategory[cat.id] || [];
            if (catSkills.length === 0 && activeFilter === 'all') return null;

            return (
              <div key={cat.id}>
                {/* 分类标题 */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">{cat.icon}</span>
                  <h3 className="text-[9px] text-[#faf0e6]">{cat.name}</h3>
                  <div
                    className="h-[2px] flex-1 rounded-full opacity-40"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[7px] text-[#8fbc8f]">{catSkills.length} 项</span>
                </div>

                {catSkills.length === 0 ? (
                  <div className="pixel-card p-3 text-center">
                    <p className="text-[7px] text-[#8b4513]">该分类暂无技能</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {catSkills.map(skill => (
                      <div key={skill.id} id={`checkin-skill-${skill.id}`} className="max-w-lg mx-auto transition-all duration-300">
                        <SkillCard
                          skill={skill}
                          records={checkinRecords.filter(r => r.skillId === skill.id)}
                          onCheckin={onCheckin}
                          onMakeupCheckin={onMakeupCheckin}
                          onDelete={onDelete}
                        />
                        {/* 查看详情按钮 */}
                        <div className="text-center mt-1 mb-2">
                          <button
                            onClick={() => onSkillDetail(skill.id)}
                            className="text-[7px] text-[#6b8dd6] hover:text-[#4169e1] underline underline-offset-2 transition-colors"
                          >
                            📋 查看完整详情（背包/课程/复利）
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 未分类技能 */}
          {activeFilter === 'all' && (skillsByCategory['uncategorized']?.length || 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-base">📦</span>
                <h3 className="text-[9px] text-[#faf0e6]">未分类</h3>
                <div className="h-[2px] flex-1 rounded-full bg-[#808080] opacity-40" />
              </div>
              <div className="space-y-3">
                {skillsByCategory['uncategorized'].map(skill => (
                  <div key={skill.id} id={`checkin-skill-${skill.id}`} className="max-w-lg mx-auto transition-all duration-300">
                    <SkillCard
                      skill={skill}
                      records={checkinRecords.filter(r => r.skillId === skill.id)}
                      onCheckin={onCheckin}
                      onMakeupCheckin={onMakeupCheckin}
                      onDelete={onDelete}
                    />
                    <div className="text-center mt-1 mb-2">
                      <button
                        onClick={() => onSkillDetail(skill.id)}
                        className="text-[7px] text-[#6b8dd6] hover:text-[#4169e1] underline underline-offset-2 transition-colors"
                      >
                        📋 查看完整详情（背包/课程/复利）
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部固定添加技能按钮 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        <button
          onClick={onAddSkill}
          className="pixel-btn bg-[#32cd32] text-white px-4 py-2.5 text-[10px] shadow-lg hover:bg-[#2eb82e] transition-colors"
          style={{ boxShadow: '0 4px 12px rgba(50,205,50,0.4)' }}
        >
          ➕ 添加新技能
        </button>
        <button
          onClick={onBack}
          className="pixel-btn bg-[#8b4513] text-[#faf0e6] px-4 py-2.5 text-[10px] shadow-lg"
        >
          🏠 回首页
        </button>
      </div>

      {/* 底部间距，避免被固定按钮遮挡 */}
      <div className="h-16" />
    </div>
  );
}
