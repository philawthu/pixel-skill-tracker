import { useState, useMemo } from 'react';
import type { Skill, SkillReturn, ReturnCategory } from '../types';

interface ReturnsPageProps {
  skills: Skill[];
  skillReturns: SkillReturn[];
  onBack: () => void;
  onSkillClick: (skillId: string) => void;
}

/** 从价格字符串中提取数值 */
function extractPrice(priceStr: string): number {
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

const CAT_CONFIG: Record<ReturnCategory, { icon: string; label: string; color: string; bgColor: string }> = {
  money:   { icon: '💰', label: '金钱收入', color: '#daa520', bgColor: '#fff8dc' },
  emotion: { icon: '😊', label: '好心情',   color: '#ff69b4', bgColor: '#fff0f5' },
  social:  { icon: '🤝', label: '人际关系', color: '#4169e1', bgColor: '#e8f0fe' },
  health:  { icon: '💪', label: '健康提升', color: '#32cd32', bgColor: '#f0fff0' },
  growth:  { icon: '🌱', label: '个人成长', color: '#9370db', bgColor: '#f3e8ff' },
  other:   { icon: '✨', label: '其他收获', color: '#ff8c00', bgColor: '#fff5e6' },
};

export function ReturnsPage({ skills, skillReturns, onBack, onSkillClick }: ReturnsPageProps) {
  const [activeSkillFilter, setActiveSkillFilter] = useState<string>('all');
  const [activeCatFilter, setActiveCatFilter] = useState<ReturnCategory | 'all'>('all');
  const [selectedReturn, setSelectedReturn] = useState<SkillReturn | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'category' | 'skill'>('date');

  const skillMap = useMemo(() => new Map(skills.map(s => [s.id, s])), [skills]);

  // 按技能分组
  const returnsBySkill = useMemo(() => {
    const map: Record<string, SkillReturn[]> = {};
    for (const r of skillReturns) {
      if (!map[r.skillId]) map[r.skillId] = [];
      map[r.skillId].push(r);
    }
    return map;
  }, [skillReturns]);

  // 有收获的技能
  const skillsWithReturns = useMemo(
    () => skills.filter(s => (returnsBySkill[s.id]?.length || 0) > 0),
    [skills, returnsBySkill]
  );

  // 类别统计
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of skillReturns) {
      map[r.category] = (map[r.category] || 0) + 1;
    }
    return map;
  }, [skillReturns]);

  // 过滤 & 排序
  const filteredReturns = useMemo(() => {
    let list = [...skillReturns];
    if (activeSkillFilter !== 'all') {
      list = list.filter(r => r.skillId === activeSkillFilter);
    }
    if (activeCatFilter !== 'all') {
      list = list.filter(r => r.category === activeCatFilter);
    }

    switch (sortBy) {
      case 'date':
        list.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'category':
        list.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'skill':
        list.sort((a, b) => {
          const sa = skillMap.get(a.skillId)?.name || '';
          const sb = skillMap.get(b.skillId)?.name || '';
          return sa.localeCompare(sb);
        });
        break;
    }
    return list;
  }, [skillReturns, activeSkillFilter, activeCatFilter, sortBy, skillMap]);

  // 金钱收入总计
  const totalMoney = useMemo(
    () => skillReturns.reduce((sum, r) => sum + (r.moneyAmount ? extractPrice(r.moneyAmount) : 0), 0),
    [skillReturns]
  );

  // 按月分组
  const returnsByMonth = useMemo(() => {
    const map: Record<string, SkillReturn[]> = {};
    for (const r of filteredReturns) {
      const month = r.date.substring(0, 7);
      if (!map[month]) map[month] = [];
      map[month].push(r);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredReturns]);

  return (
    <div>
      {/* 返回按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="pixel-btn bg-[#7d6608] text-[#faf0e6] px-3 py-1.5 text-[8px]"
        >
          ← 返回首页
        </button>
        <span className="text-[8px] text-[#b7950b]">🌟 全部技能复利</span>
      </div>

      {/* 汇总统计 */}
      <div className="pixel-card p-4 mb-4">
        <h2 className="text-[10px] text-[#7d6608] mb-3">🌟 技能复利汇总</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#fffde7] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#b7950b]">收获总数</p>
            <p className="text-[12px] text-[#f39c12]">{skillReturns.length}</p>
          </div>
          <div className="bg-[#fffde7] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#b7950b]">涉及技能</p>
            <p className="text-[12px] text-[#7d6608]">{skillsWithReturns.length}</p>
          </div>
          <div className="bg-[#fffde7] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#b7950b]">金钱收入</p>
            <p className="text-[12px] text-[#27ae60]">{totalMoney > 0 ? `+¥${totalMoney.toLocaleString()}` : '-'}</p>
          </div>
        </div>

        {/* 类别分布 */}
        <div className="mb-2">
          <p className="text-[7px] text-[#b7950b] mb-1.5">收获类别分布</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(catCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const info = CAT_CONFIG[cat as ReturnCategory] || CAT_CONFIG.other;
                return (
                  <span
                    key={cat}
                    className="text-[7px] px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.icon} {info.label} ({count})
                  </span>
                );
              })}
          </div>
        </div>

        {/* 按技能分项 */}
        <div className="space-y-1">
          {skillsWithReturns.map(s => {
            const sReturns = returnsBySkill[s.id] || [];
            const sMoney = sReturns.reduce((sum, r) => sum + (r.moneyAmount ? extractPrice(r.moneyAmount) : 0), 0);
            return (
              <div key={s.id} className="flex items-center justify-between px-2 py-1 bg-[#fffde7] rounded">
                <div className="flex items-center gap-1">
                  <span
                    className="text-[7px] text-[#f39c12] cursor-pointer hover:underline"
                    onClick={() => onSkillClick(s.id)}
                  >
                    {s.icon} {s.name}
                  </span>
                  <span className="text-[6px] text-[#b7950b]">({sReturns.length}项)</span>
                </div>
                {sMoney > 0 && <span className="text-[7px] text-[#27ae60]">+¥{sMoney.toLocaleString()}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {skillReturns.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <div className="text-4xl mb-3">🌟</div>
          <p className="text-[10px] text-[#3d2010] mb-2">暂无技能复利记录！</p>
          <p className="text-[8px] text-[#8b4513]">在各个技能详情页中记录你的收获吧</p>
        </div>
      ) : (
        <>
          {/* 筛选 & 排序 */}
          <div className="mb-4 space-y-2">
            {/* 技能筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveSkillFilter('all')}
                className={`pixel-btn px-2.5 py-1 text-[7px] ${
                  activeSkillFilter === 'all'
                    ? 'bg-[#f39c12] text-white'
                    : 'bg-[#fffde7] text-[#7d6608] hover:bg-[#fff8dc]'
                }`}
              >
                全部技能 ({skillReturns.length})
              </button>
              {skillsWithReturns.map(s => {
                const sReturns = returnsBySkill[s.id] || [];
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSkillFilter(s.id === activeSkillFilter ? 'all' : s.id)}
                    className={`pixel-btn px-2.5 py-1 text-[7px] ${
                      activeSkillFilter === s.id
                        ? 'bg-[#f39c12] text-white'
                        : 'bg-[#fffde7] text-[#7d6608] hover:bg-[#fff8dc]'
                    }`}
                  >
                    {s.icon} {s.name} ({sReturns.length})
                  </button>
                );
              })}
            </div>

            {/* 类别筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCatFilter('all')}
                className={`pixel-btn px-2.5 py-1 text-[7px] ${
                  activeCatFilter === 'all'
                    ? 'bg-[#7d6608] text-white'
                    : 'bg-[#fffde7] text-[#7d6608] hover:bg-[#fff8dc]'
                }`}
              >
                全部类别
              </button>
              {(Object.entries(CAT_CONFIG) as [ReturnCategory, typeof CAT_CONFIG[ReturnCategory]][]).map(([key, cfg]) => {
                const count = catCounts[key] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCatFilter(key === activeCatFilter ? 'all' : key)}
                    className={`pixel-btn px-2.5 py-1 text-[7px] ${
                      activeCatFilter === key
                        ? 'text-white'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: activeCatFilter === key ? cfg.color : cfg.bgColor,
                      color: activeCatFilter === key ? 'white' : cfg.color,
                    }}
                  >
                    {cfg.icon} {cfg.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <span className="text-[7px] text-[#b7950b]">排序:</span>
              {[
                { key: 'date' as const, label: '📅 日期' },
                { key: 'category' as const, label: '🏷️ 类别' },
                { key: 'skill' as const, label: '⭐ 技能' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`text-[7px] px-2 py-0.5 rounded ${
                    sortBy === opt.key
                      ? 'bg-[#7d6608] text-[#faf0e6]'
                      : 'text-[#b7950b] hover:bg-[#fffde7]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 按月分组收获列表 */}
          <div className="space-y-4">
            {returnsByMonth.map(([month, monthReturns]) => {
              const monthMoney = monthReturns.reduce((s, r) => s + (r.moneyAmount ? extractPrice(r.moneyAmount) : 0), 0);
              return (
                <div key={month}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[9px] text-[#7d6608]">📅 {month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] text-[#b7950b]">{monthReturns.length}项</span>
                      {monthMoney > 0 && <span className="text-[7px] text-[#27ae60]">+¥{monthMoney.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {monthReturns.map(ret => {
                      const skill = skillMap.get(ret.skillId);
                      const isSelected = selectedReturn?.id === ret.id;
                      const catInfo = CAT_CONFIG[ret.category] || CAT_CONFIG.other;

                      return (
                        <div
                          key={ret.id}
                          onClick={() => setSelectedReturn(isSelected ? null : ret)}
                          className={`pixel-card p-3 cursor-pointer transition-transform duration-200 ${
                            isSelected ? 'ring-2 translate-y-[-2px]' : 'hover:translate-y-[-1px]'
                          }`}
                          style={{
                            borderColor: isSelected ? catInfo.color : undefined,
                            boxShadow: isSelected ? `0 0 0 2px ${catInfo.color}40` : undefined,
                          }}
                        >
                          {/* 头部 */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-lg shrink-0">{catInfo.icon}</span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[8px] text-[#3d2010] truncate">{ret.title}</h4>
                                {skill && (
                                  <p
                                    className="text-[6px] cursor-pointer hover:underline"
                                    style={{ color: catInfo.color }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSkillClick(skill.id);
                                    }}
                                  >
                                    {skill.icon} {skill.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span
                                className="text-[6px] px-1.5 py-0.5 rounded text-white"
                                style={{ backgroundColor: catInfo.color }}
                              >
                                {catInfo.label}
                              </span>
                              <p className="text-[6px] text-[#8b4513]/60 mt-0.5">{ret.date}</p>
                            </div>
                          </div>

                          {/* 简要信息 */}
                          <div className="flex gap-2 text-[6px]">
                            {ret.moneyAmount && (
                              <span className="text-[#27ae60]">💰 {ret.moneyAmount}</span>
                            )}
                            {ret.description && (
                              <span className="text-[#8b4513]/60 truncate">{ret.description}</span>
                            )}
                          </div>

                          {/* 展开详情 */}
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: `${catInfo.color}30` }}>
                              <div className="text-[6px]">
                                <span className="text-[#8b4513]/60">🌟 收获标题: </span>
                                <span className="text-[#3d2010]">{ret.title}</span>
                              </div>
                              <div className="text-[6px]">
                                <span className="text-[#8b4513]/60">🏷️ 类别: </span>
                                <span style={{ color: catInfo.color }}>{catInfo.icon} {catInfo.label}</span>
                              </div>
                              <div className="text-[6px]">
                                <span className="text-[#8b4513]/60">📅 收获日期: </span>
                                <span className="text-[#3d2010]">{ret.date}</span>
                              </div>
                              {ret.moneyAmount && (
                                <div className="text-[6px]">
                                  <span className="text-[#8b4513]/60">💰 金额: </span>
                                  <span className="text-[#27ae60]">{ret.moneyAmount}</span>
                                </div>
                              )}
                              {ret.description && (
                                <div className="text-[6px]">
                                  <span className="text-[#8b4513]/60">📝 详细描述: </span>
                                  <span className="text-[#3d2010]">{ret.description}</span>
                                </div>
                              )}
                              {ret.note && (
                                <div className="text-[6px]">
                                  <span className="text-[#8b4513]/60">💬 备注: </span>
                                  <span className="text-[#3d2010]">{ret.note}</span>
                                </div>
                              )}
                              <div className="text-[6px]">
                                <span className="text-[#8b4513]/60">🕐 记录时间: </span>
                                <span className="text-[#3d2010]">{new Date(ret.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                              {/* 跳转技能 */}
                              {skill && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSkillClick(skill.id);
                                  }}
                                  className="mt-1 text-[7px] hover:underline"
                                  style={{ color: catInfo.color }}
                                >
                                  → 查看「{skill.name}」技能详情
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
