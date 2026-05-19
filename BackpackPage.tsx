import { useState, useMemo } from 'react';
import type { Skill, Equipment, Course, SkillReturn } from '../types';
import { getTodayString } from '../utils';

interface BackpackPageProps {
  skills: Skill[];
  equipments: Equipment[];
  courses: Course[];
  skillReturns: SkillReturn[];
  onBack: () => void;
  onSkillClick: (skillId: string) => void;
}

function getDaysHeld(acquiredDate: string): number {
  const acquired = new Date(acquiredDate);
  const today = new Date(getTodayString());
  const diff = today.getTime() - acquired.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function formatDaysHeld(days: number): string {
  if (days === 0) return '今天获得';
  if (days < 30) return `${days}天`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainDays = days % 30;
    return remainDays > 0 ? `${months}个月${remainDays}天` : `${months}个月`;
  }
  const years = Math.floor(days / 365);
  const remainDays = days % 365;
  const months = Math.floor(remainDays / 30);
  if (months > 0) return `${years}年${months}个月`;
  return `${years}年`;
}

/** 从价格字符串中提取数值 */
function extractPrice(priceStr: string): number {
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/** 计算每日成本 */
function calcDailyCost(priceStr: string, daysHeld: number): string {
  const price = extractPrice(priceStr);
  if (price === 0) return '-';
  if (daysHeld === 0) return `¥${price.toFixed(2)}/天`;
  const daily = price / daysHeld;
  if (daily >= 1) return `¥${daily.toFixed(2)}/天`;
  return `¥${daily.toFixed(3)}/天`;
}

export function BackpackPage({ skills, equipments, courses, skillReturns, onBack, onSkillClick }: BackpackPageProps) {
  const [activeSkillFilter, setActiveSkillFilter] = useState<string>('all');
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'skill'>('date');
  const [viewTab, setViewTab] = useState<'current' | 'history'>('current');

  const skillMap = useMemo(() => new Map(skills.map(s => [s.id, s])), [skills]);

  // 当前装备 & 历史装备
  const currentEquipments = useMemo(() => equipments.filter(e => !e.retired), [equipments]);
  const historyEquipments = useMemo(() => equipments.filter(e => e.retired), [equipments]);

  // 当前 tab 对应的源列表
  const sourceEquipments = viewTab === 'current' ? currentEquipments : historyEquipments;

  // 按技能分组的装备（基于当前 tab）
  const equipBySkill = useMemo(() => {
    const map: Record<string, Equipment[]> = {};
    for (const equip of sourceEquipments) {
      if (!map[equip.skillId]) map[equip.skillId] = [];
      map[equip.skillId].push(equip);
    }
    return map;
  }, [sourceEquipments]);

  // 有装备的技能（基于当前 tab）
  const skillsWithEquipment = useMemo(
    () => skills.filter(s => (equipBySkill[s.id]?.length || 0) > 0),
    [skills, equipBySkill]
  );

  // 过滤和排序后的装备
  const filteredEquipments = useMemo(() => {
    let list = activeSkillFilter === 'all'
      ? [...sourceEquipments]
      : sourceEquipments.filter(e => e.skillId === activeSkillFilter);

    switch (sortBy) {
      case 'date':
        list.sort((a, b) => b.acquiredDate.localeCompare(a.acquiredDate));
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
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
  }, [sourceEquipments, activeSkillFilter, sortBy, skillMap]);

  // 价值计算
  const totalValue = useMemo(() => {
    let sum = 0;
    for (const e of equipments) sum += extractPrice(e.price);
    return sum;
  }, [equipments]);

  const currentTotalValue = useMemo(() => {
    let sum = 0;
    for (const e of currentEquipments) sum += extractPrice(e.price);
    return sum;
  }, [currentEquipments]);

  const historyTotalValue = useMemo(() => {
    let sum = 0;
    for (const e of historyEquipments) sum += extractPrice(e.price);
    return sum;
  }, [historyEquipments]);

  // 按技能计算各自总价（基于当前 tab）
  const skillTotalPrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of sourceEquipments) {
      if (!map[e.skillId]) map[e.skillId] = 0;
      map[e.skillId] += extractPrice(e.price);
    }
    return map;
  }, [sourceEquipments]);

  return (
    <div>
      {/* 返回按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="pixel-btn bg-[#8b4513] text-[#faf0e6] px-3 py-1.5 text-[8px]"
        >
          ← 返回首页
        </button>
        <span className="text-[8px] text-[#8fbc8f]">🎒 全部背包</span>
      </div>

      {/* 汇总统计 */}
      <div className="pixel-card p-4 mb-4">
        <h2 className="text-[10px] text-[#3d2010] mb-3">🎒 装备汇总</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#8b4513]">装备总数</p>
            <p className="text-[12px] text-[#daa520]">{equipments.length}</p>
            <p className="text-[6px] text-[#8b4513]/60">
              当前 {currentEquipments.length} / 历史 {historyEquipments.length}
            </p>
          </div>
          <div className="bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#8b4513]">涉及技能</p>
            <p className="text-[12px] text-[#4169e1]">{new Set(equipments.map(e => e.skillId)).size}</p>
          </div>
          <div className="bg-[#fff8dc] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#8b4513]">估算总价值</p>
            <p className="text-[12px] text-[#32cd32]">{totalValue > 0 ? `¥${totalValue.toFixed(0)}` : '-'}</p>
          </div>
        </div>

        {/* 当前/历史价值分项 */}
        {totalValue > 0 && (
          <div className="bg-[#fff8dc] p-2 pixel-border-light">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] text-[#8b4513]">💰 总价值明细</span>
              <span className="text-[8px] text-[#daa520] font-pixel">¥{totalValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[6px] text-[#8b4513]/70">⚔️ 当前装备</span>
              <span className="text-[7px] text-[#32cd32]">¥{currentTotalValue.toFixed(2)}</span>
            </div>
            {historyTotalValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[6px] text-[#8b4513]/70">📦 历史装备</span>
                <span className="text-[7px] text-[#a0a0a0]">¥{historyTotalValue.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 课程汇总 */}
      {courses.length > 0 && (() => {
        const totalCourseCost = courses.reduce((sum, c) => sum + extractPrice(c.price), 0);
        const skillsWithCourses = [...new Set(courses.map(c => c.skillId))];

        // 按技能分组
        const coursesBySkill: Record<string, Course[]> = {};
        for (const c of courses) {
          if (!coursesBySkill[c.skillId]) coursesBySkill[c.skillId] = [];
          coursesBySkill[c.skillId].push(c);
        }

        return (
          <div className="pixel-card p-4 mb-4">
            <h2 className="text-[10px] text-[#2c3e7a] mb-3">📖 课程汇总</h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-[#e8f0fe] p-2 pixel-border-light text-center">
                <p className="text-[7px] text-[#6b8dd6]">课程总数</p>
                <p className="text-[12px] text-[#4169e1]">{courses.length}</p>
              </div>
              <div className="bg-[#e8f0fe] p-2 pixel-border-light text-center">
                <p className="text-[7px] text-[#6b8dd6]">涉及技能</p>
                <p className="text-[12px] text-[#2c3e7a]">{skillsWithCourses.length}</p>
              </div>
              <div className="bg-[#e8f0fe] p-2 pixel-border-light text-center">
                <p className="text-[7px] text-[#6b8dd6]">总花费</p>
                <p className="text-[12px] text-[#e74c3c]">{totalCourseCost > 0 ? `¥${totalCourseCost.toFixed(0)}` : '-'}</p>
              </div>
            </div>

            {/* 按技能分项 */}
            <div className="space-y-1">
              {skillsWithCourses.map(sId => {
                const skill = skillMap.get(sId);
                const sCourses = coursesBySkill[sId] || [];
                const sCost = sCourses.reduce((sum, c) => sum + extractPrice(c.price), 0);
                return (
                  <div key={sId} className="flex items-center justify-between px-2 py-1 bg-[#f0f4ff] rounded">
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[7px] text-[#4169e1] cursor-pointer hover:underline"
                        onClick={() => onSkillClick(sId)}
                      >
                        {skill ? `${skill.icon} ${skill.name}` : '未知技能'}
                      </span>
                      <span className="text-[6px] text-[#6b8dd6]">({sCourses.length}节)</span>
                    </div>
                    {sCost > 0 && <span className="text-[7px] text-[#e74c3c]">¥{sCost.toFixed(0)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 技能复利汇总 */}
      {skillReturns.length > 0 && (() => {
        const totalMoneyReturns = skillReturns.reduce((sum, r) => {
          if (r.moneyAmount) {
            return sum + extractPrice(r.moneyAmount);
          }
          return sum;
        }, 0);
        const skillsWithReturns = [...new Set(skillReturns.map(r => r.skillId))];

        // 按类别统计
        const catLabels: Record<string, { icon: string; label: string; color: string }> = {
          money: { icon: '💰', label: '金钱收入', color: '#daa520' },
          emotion: { icon: '😊', label: '好心情', color: '#ff69b4' },
          social: { icon: '🤝', label: '人际关系', color: '#4169e1' },
          health: { icon: '💪', label: '健康提升', color: '#32cd32' },
          growth: { icon: '🌱', label: '个人成长', color: '#9370db' },
          other: { icon: '✨', label: '其他收获', color: '#ff8c00' },
        };

        const catCounts: Record<string, number> = {};
        for (const r of skillReturns) {
          catCounts[r.category] = (catCounts[r.category] || 0) + 1;
        }

        // 按技能分组
        const returnsBySkill: Record<string, SkillReturn[]> = {};
        for (const r of skillReturns) {
          if (!returnsBySkill[r.skillId]) returnsBySkill[r.skillId] = [];
          returnsBySkill[r.skillId].push(r);
        }

        return (
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
                <p className="text-[12px] text-[#27ae60]">{totalMoneyReturns > 0 ? `+¥${totalMoneyReturns.toLocaleString()}` : '-'}</p>
              </div>
            </div>

            {/* 类别分布 */}
            <div className="mb-3">
              <p className="text-[7px] text-[#b7950b] mb-1.5">收获类别分布</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(catCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    const info = catLabels[cat] || catLabels.other;
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
              {skillsWithReturns.map(sId => {
                const skill = skillMap.get(sId);
                const sReturns = returnsBySkill[sId] || [];
                const sMoney = sReturns.reduce((sum, r) => sum + (r.moneyAmount ? extractPrice(r.moneyAmount) : 0), 0);
                return (
                  <div key={sId} className="flex items-center justify-between px-2 py-1 bg-[#fffde7] rounded">
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[7px] text-[#f39c12] cursor-pointer hover:underline"
                        onClick={() => onSkillClick(sId)}
                      >
                        {skill ? `${skill.icon} ${skill.name}` : '未知技能'}
                      </span>
                      <span className="text-[6px] text-[#b7950b]">({sReturns.length}项)</span>
                    </div>
                    {sMoney > 0 && <span className="text-[7px] text-[#27ae60]">+¥{sMoney.toLocaleString()}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 装备为空 */}
      {equipments.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <div className="text-4xl mb-3">🎒</div>
          <p className="text-[10px] text-[#3d2010] mb-2">背包空空如也！</p>
          <p className="text-[8px] text-[#8b4513]">在各个技能详情页中添加装备吧</p>
        </div>
      ) : (
        <>
          {/* 当前/历史 Tab */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setViewTab('current'); setActiveSkillFilter('all'); setSelectedEquip(null); }}
              className={`pixel-btn px-3 py-1.5 text-[8px] ${
                viewTab === 'current'
                  ? 'bg-[#daa520] text-[#3d2010]'
                  : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
              }`}
            >
              ⚔️ 当前装备 ({currentEquipments.length})
            </button>
            <button
              onClick={() => { setViewTab('history'); setActiveSkillFilter('all'); setSelectedEquip(null); }}
              className={`pixel-btn px-3 py-1.5 text-[8px] ${
                viewTab === 'history'
                  ? 'bg-[#808080] text-white'
                  : 'bg-[#e0e0e0] text-[#666] hover:bg-[#d0d0d0]'
              }`}
            >
              📦 历史装备 ({historyEquipments.length})
            </button>
          </div>

          {/* 当前 tab 为空 */}
          {sourceEquipments.length === 0 ? (
            <div className="pixel-card p-6 text-center">
              {viewTab === 'current' ? (
                <>
                  <div className="text-3xl mb-2">🎒</div>
                  <p className="text-[9px] text-[#3d2010] mb-1">当前没有在用的装备</p>
                  <p className="text-[7px] text-[#8b4513]">在技能详情页添加装备，或从历史装备中恢复</p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-[9px] text-[#3d2010] mb-1">暂无历史装备</p>
                  <p className="text-[7px] text-[#8b4513]">在当前装备中点击"不再使用"可将装备封存到此处</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* 筛选 & 排序 */}
              <div className="mb-4 space-y-2">
                {/* 技能筛选标签（含各技能总价） */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setActiveSkillFilter('all')}
                    className={`pixel-btn px-2.5 py-1 text-[7px] ${
                      activeSkillFilter === 'all'
                        ? 'bg-[#daa520] text-[#3d2010]'
                        : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
                    }`}
                  >
                    全部 ({sourceEquipments.length})
                  </button>
                  {skillsWithEquipment.map(s => {
                    const stp = skillTotalPrices[s.id] || 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSkillFilter(s.id === activeSkillFilter ? 'all' : s.id)}
                        className={`pixel-btn px-2.5 py-1 text-[7px] ${
                          activeSkillFilter === s.id
                            ? 'bg-[#daa520] text-[#3d2010]'
                            : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
                        }`}
                      >
                        {s.icon} {s.name} ({equipBySkill[s.id]?.length || 0})
                        {stp > 0 && <span className="ml-1 text-[#daa520]">¥{stp.toFixed(0)}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* 排序 */}
                <div className="flex items-center gap-2">
                  <span className="text-[7px] text-[#8b4513]">排序:</span>
                  {[
                    { key: 'date' as const, label: '📅 日期' },
                    { key: 'name' as const, label: '🔤 名称' },
                    { key: 'skill' as const, label: '⭐ 技能' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className={`text-[7px] px-2 py-0.5 rounded ${
                        sortBy === opt.key
                          ? 'bg-[#8b4513] text-[#faf0e6]'
                          : 'text-[#8b4513] hover:bg-[#deb887]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 装备网格 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredEquipments.map(equip => {
                  const skill = skillMap.get(equip.skillId);
                  const daysHeld = getDaysHeld(equip.acquiredDate);
                  const isSelected = selectedEquip?.id === equip.id;
                  const dailyCost = calcDailyCost(equip.price, daysHeld);
                  const isRetired = !!equip.retired;

                  return (
                    <div
                      key={equip.id}
                      onClick={() => setSelectedEquip(isSelected ? null : equip)}
                      className={`pixel-card p-3 cursor-pointer transition-transform duration-200 ${
                        isSelected ? 'ring-2 ring-[#daa520] translate-y-[-2px]' : 'hover:translate-y-[-2px]'
                      } ${isRetired ? 'opacity-70' : ''}`}
                    >
                      {/* 装备图标 + 名称 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xl ${isRetired ? 'opacity-60' : ''}`}>{equip.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-[8px] truncate ${isRetired ? 'text-[#8b8b8b] line-through' : 'text-[#3d2010]'}`}>
                            {equip.name}
                          </h4>
                          {skill && (
                            <p
                              className="text-[6px] text-[#8b4513] cursor-pointer hover:text-[#c0392b]"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSkillClick(skill.id);
                              }}
                            >
                              {skill.icon} {skill.name}
                            </p>
                          )}
                        </div>
                        {isRetired && (
                          <span className="text-[6px] bg-[#808080]/20 text-[#808080] px-1 py-0.5 rounded shrink-0">封存</span>
                        )}
                      </div>

                      {/* 基本信息 */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[6px]">
                          <span className="text-[#8b4513]/60">持有</span>
                          <span className="text-[#3d2010]">{formatDaysHeld(daysHeld)}</span>
                        </div>
                        <div className="flex justify-between text-[6px]">
                          <span className="text-[#8b4513]/60">价格</span>
                          <span className={isRetired ? 'text-[#a0a0a0]' : 'text-[#daa520]'}>{equip.price}</span>
                        </div>
                        <div className="flex justify-between text-[6px]">
                          <span className="text-[#8b4513]/60">每日成本</span>
                          <span className="text-[#32cd32]">{dailyCost}</span>
                        </div>
                      </div>

                      {/* 展开详情 */}
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-[#8b4513]/20 space-y-1">
                          <div className="text-[6px]">
                            <span className="text-[#8b4513]/60">📅 获得日期: </span>
                            <span className="text-[#3d2010]">{equip.acquiredDate}</span>
                          </div>
                          <div className="text-[6px]">
                            <span className="text-[#8b4513]/60">⏱️ 持有时间: </span>
                            <span className="text-[#3d2010]">{formatDaysHeld(daysHeld)}</span>
                          </div>
                          <div className="text-[6px]">
                            <span className="text-[#8b4513]/60">🛒 获得方式: </span>
                            <span className="text-[#3d2010]">{equip.acquiredMethod}</span>
                          </div>
                          <div className="text-[6px]">
                            <span className="text-[#8b4513]/60">📊 每日成本: </span>
                            <span className="text-[#32cd32]">{dailyCost}</span>
                          </div>
                          {equip.note && (
                            <div className="text-[6px]">
                              <span className="text-[#8b4513]/60">📝 备注: </span>
                              <span className="text-[#3d2010]">{equip.note}</span>
                            </div>
                          )}
                          {isRetired && equip.retiredAt && (
                            <div className="text-[6px]">
                              <span className="text-[#8b4513]/60">📦 封存时间: </span>
                              <span className="text-[#8b8b8b]">{new Date(equip.retiredAt).toLocaleDateString('zh-CN')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
