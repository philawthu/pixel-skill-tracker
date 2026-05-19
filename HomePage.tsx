import { useState, useMemo } from 'react';
import type { Skill, SkillCategory, CheckinRecord, TitleUnlock, Equipment, Course, SkillReturn } from '../types';
import { getTodayString } from '../utils';
import { SkillMiniCard } from './SkillMiniCard';
import { StatsPanel } from './StatsPanel';
import { CheckinCalendar } from './CheckinCalendar';

/** 从价格字符串中提取数值 */
function extractPrice(priceStr: string): number {
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

interface HomePageProps {
  skills: Skill[];
  categories: SkillCategory[];
  checkinRecords: CheckinRecord[];
  titleUnlocks: TitleUnlock[];
  equipments: Equipment[];
  courses: Course[];
  skillReturns: SkillReturn[];
  onSkillClick: (skillId: string) => void;
  onAddSkill: () => void;
  onManageCategories: () => void;
  onOpenBackpack: () => void;
  onOpenCourses: () => void;
  onOpenReturns: () => void;
  onGoCheckin: () => void;
}

export function HomePage({
  skills,
  categories,
  checkinRecords,
  titleUnlocks,
  equipments,
  courses,
  skillReturns,
  onSkillClick,
  onAddSkill,
  onManageCategories,
  onOpenBackpack,
  onOpenCourses,
  onOpenReturns,
  onGoCheckin,
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const todayStr = getTodayString();

  // 按分类分组技能
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

  // 获取技能今日打卡次数
  const todayCheckinsBySkill = useMemo(() => {
    const map: Record<string, number> = {};
    checkinRecords
      .filter(r => r.date === todayStr)
      .forEach(r => {
        map[r.skillId] = (map[r.skillId] || 0) + 1;
      });
    return map;
  }, [checkinRecords, todayStr]);

  // 筛选后的分类
  const filteredCategories = useMemo(() => {
    if (activeFilter === 'all') return categories;
    return categories.filter(c => c.id === activeFilter);
  }, [categories, activeFilter]);

  // 今日统计
  const todayTotalCheckins = checkinRecords.filter(r => r.date === todayStr).length;
  const todayActiveSkills = new Set(checkinRecords.filter(r => r.date === todayStr).map(r => r.skillId)).size;

  return (
    <div>
      {/* 今日概览 + 去打卡 */}
      <div className="pixel-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] text-[#3d2010]">📊 今日概览</h2>
          <span className="text-[7px] text-[#8b4513]">{todayStr}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#8b4513]">打卡次数</p>
            <p className="text-[12px] text-[#32cd32]">{todayTotalCheckins}</p>
          </div>
          <div className="bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#8b4513]">活跃技能</p>
            <p className="text-[12px] text-[#4169e1]">{todayActiveSkills}/{skills.length}</p>
          </div>
          <div className="bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#8b4513]">技能总数</p>
            <p className="text-[12px] text-[#daa520]">{skills.length}</p>
          </div>
        </div>
        {/* 打卡进度条 */}
        {skills.length > 0 && (
          <div className="mb-3">
            <div className="w-full h-[6px] bg-[#deb887] rounded-full overflow-hidden pixel-border-light">
              <div
                className="h-full bg-[#32cd32] transition-all duration-500"
                style={{ width: `${Math.min(100, (todayActiveSkills / skills.length) * 100)}%` }}
              />
            </div>
            <p className="text-[6px] text-[#8b4513] text-center mt-1">
              {todayActiveSkills === skills.length ? '🎉 今日全部技能已打卡！' : `还有 ${skills.length - todayActiveSkills} 项技能待打卡`}
            </p>
          </div>
        )}
        {/* 大按钮区域 */}
        <div className="flex gap-2">
          <button
            onClick={onGoCheckin}
            className="flex-1 pixel-btn bg-[#32cd32] text-white py-3 text-[12px] hover:bg-[#2eb82e] transition-colors"
            style={{ boxShadow: '0 4px 12px rgba(50,205,50,0.3)' }}
          >
            ⚔️ 去打卡
          </button>
          <button
            onClick={onAddSkill}
            className="pixel-btn bg-[#daa520] text-[#3d2010] py-3 px-4 text-[10px] hover:bg-[#c4961a] transition-colors"
          >
            ➕ 新技能
          </button>
        </div>
      </div>

      {/* 📅 打卡日历 */}
      {checkinRecords.length > 0 && (
        <div className="pixel-card p-4 mb-4">
          <h2 className="text-[10px] text-[#3d2010] mb-3">📅 打卡日历</h2>
          <CheckinCalendar
            records={checkinRecords}
            skills={skills}
          />
        </div>
      )}

      {/* 冒险统计 */}
      {skills.length > 0 && (
        <div className="mb-4">
          <StatsPanel skills={skills} titleUnlocks={titleUnlocks} />
        </div>
      )}

      {/* 背包入口 */}
      {equipments.length > 0 && (() => {
        const currentCount = equipments.filter(e => !e.retired).length;
        const historyCount = equipments.filter(e => e.retired).length;
        const currentEquips = equipments.filter(e => !e.retired);
        return (
          <div className="pixel-card p-3 mb-4">
            <div
              onClick={onOpenBackpack}
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🎒</span>
                <div>
                  <h3 className="text-[9px] text-[#3d2010]">我的背包</h3>
                  <p className="text-[7px] text-[#8b4513]">
                    {equipments.length} 件装备 · 当前 {currentCount} / 历史 {historyCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* 显示最近几件当前装备图标 */}
                <div className="flex -space-x-1">
                  {currentEquips.slice(0, 5).map(e => (
                    <span key={e.id} className="text-sm bg-[#fff8dc] rounded-sm px-0.5 border border-[#daa520]/30">
                      {e.icon}
                    </span>
                  ))}
                  {currentEquips.length > 5 && (
                    <span className="text-[6px] text-[#8b4513] ml-1">+{currentEquips.length - 5}</span>
                  )}
                </div>
                <span className="text-[8px] text-[#8b4513]">▶</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 课程汇总入口 */}
      {courses.length > 0 && (() => {
        const totalCost = courses.reduce((sum, c) => sum + extractPrice(c.price), 0);
        const skillsWithCourses = new Set(courses.map(c => c.skillId)).size;
        return (
          <div className="pixel-card p-3 mb-4">
            <div
              onClick={onOpenCourses}
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📖</span>
                <div>
                  <h3 className="text-[9px] text-[#2c3e7a]">已上课程</h3>
                  <p className="text-[7px] text-[#6b8dd6]">
                    {courses.length} 节课 · {skillsWithCourses} 项技能
                    {totalCost > 0 && <span className="ml-1 text-[#e74c3c]">· 总花费 ¥{totalCost.toFixed(0)}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {courses.slice(0, 3).map(c => (
                    <span key={c.id} className="text-[6px] bg-[#e8f0fe] text-[#2c3e7a] rounded-sm px-1 border border-[#4169e1]/20">
                      {c.name.slice(0, 4)}
                    </span>
                  ))}
                  {courses.length > 3 && (
                    <span className="text-[6px] text-[#6b8dd6] ml-1">+{courses.length - 3}</span>
                  )}
                </div>
                <span className="text-[8px] text-[#6b8dd6]">▶</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 技能复利汇总入口 */}
      {skillReturns.length > 0 && (() => {
        const totalMoney = skillReturns.reduce((sum, r) => {
          if (r.moneyAmount) {
            const match = r.moneyAmount.match(/[\d.]+/);
            return sum + (match ? parseFloat(match[0]) : 0);
          }
          return sum;
        }, 0);
        const skillsWithReturns = new Set(skillReturns.map(r => r.skillId)).size;
        // Category distribution
        const catCounts: Record<string, number> = {};
        for (const r of skillReturns) {
          catCounts[r.category] = (catCounts[r.category] || 0) + 1;
        }
        const catIcons: Record<string, string> = {
          money: '💰', emotion: '😊', social: '🤝', health: '💪', growth: '🌱', other: '✨',
        };
        return (
          <div className="pixel-card p-3 mb-4">
            <div
              onClick={onOpenReturns}
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🌟</span>
                <div>
                  <h3 className="text-[9px] text-[#7d6608]">技能复利</h3>
                  <p className="text-[7px] text-[#b7950b]">
                    {skillReturns.length} 项收获 · {skillsWithReturns} 项技能
                    {totalMoney > 0 && <span className="ml-1 text-[#27ae60]">· 金钱收入 +¥{totalMoney.toLocaleString()}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Object.entries(catCounts).slice(0, 4).map(([cat, count]) => (
                  <span key={cat} className="text-[6px] bg-[#fffde7] text-[#7d6608] rounded-sm px-1 border border-[#f39c12]/20">
                    {catIcons[cat] || '✨'}{count}
                  </span>
                ))}
                <span className="text-[8px] text-[#b7950b]">▶</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 分类标签导航 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] text-[#faf0e6]">🗂️ 技能分类</h2>
          <button
            onClick={onManageCategories}
            className="pixel-btn bg-[#8b4513] text-[#faf0e6] px-2 py-1 text-[7px]"
          >
            ⚙️ 管理分类
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`pixel-btn px-3 py-1.5 text-[8px] transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#daa520] text-[#3d2010]'
                : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
            }`}
          >
            全部 ({skills.length})
          </button>
          {categories.map(cat => {
            const count = skillsByCategory[cat.id]?.length || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id === activeFilter ? 'all' : cat.id)}
                className={`pixel-btn px-3 py-1.5 text-[8px] transition-colors ${
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
      </div>

      {/* 分类区块 */}
      {skills.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <div className="text-4xl mb-3">🗡️</div>
          <p className="text-[10px] text-[#3d2010] mb-2">还没有任何技能！</p>
          <p className="text-[8px] text-[#8b4513] mb-4">点击下方按钮开始你的冒险</p>
          <button
            onClick={onAddSkill}
            className="pixel-btn bg-[#daa520] text-[#3d2010] px-4 py-2 text-[10px]"
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
                  <span className="text-lg">{cat.icon}</span>
                  <h3 className="text-[10px] text-[#faf0e6]">{cat.name}</h3>
                  <div
                    className="h-[3px] flex-1 rounded-full opacity-40"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[7px] text-[#8fbc8f]">{catSkills.length} 项</span>
                </div>

                {catSkills.length === 0 ? (
                  <div className="pixel-card p-4 text-center">
                    <p className="text-[8px] text-[#8b4513]">暂无技能，点击添加</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {catSkills.map(skill => (
                      <SkillMiniCard
                        key={skill.id}
                        skill={skill}
                        todayCheckins={todayCheckinsBySkill[skill.id] || 0}
                        onClick={() => onSkillClick(skill.id)}
                      />
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
                <span className="text-lg">📦</span>
                <h3 className="text-[10px] text-[#faf0e6]">未分类</h3>
                <div className="h-[3px] flex-1 rounded-full bg-[#808080] opacity-40" />
                <span className="text-[7px] text-[#8fbc8f]">{skillsByCategory['uncategorized'].length} 项</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {skillsByCategory['uncategorized'].map(skill => (
                  <SkillMiniCard
                    key={skill.id}
                    skill={skill}
                    todayCheckins={todayCheckinsBySkill[skill.id] || 0}
                    onClick={() => onSkillClick(skill.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部快捷操作 */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onGoCheckin}
          className="pixel-btn bg-[#32cd32] text-white px-6 py-2.5 text-[10px] hover:bg-[#2eb82e] transition-colors"
          style={{ boxShadow: '0 4px 12px rgba(50,205,50,0.3)' }}
        >
          ⚔️ 去打卡
        </button>
        <button
          onClick={onAddSkill}
          className="pixel-btn bg-[#daa520] text-[#3d2010] px-4 py-2.5 text-[10px]"
        >
          ➕ 添加新技能
        </button>
      </div>
    </div>
  );
}
