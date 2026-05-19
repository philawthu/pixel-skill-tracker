import { useState, useMemo } from 'react';
import type { Skill, Course } from '../types';

interface CoursesPageProps {
  skills: Skill[];
  courses: Course[];
  onBack: () => void;
  onSkillClick: (skillId: string) => void;
}

/** 从价格字符串中提取数值 */
function extractPrice(priceStr: string): number {
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function CoursesPage({ skills, courses, onBack, onSkillClick }: CoursesPageProps) {
  const [activeSkillFilter, setActiveSkillFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'skill' | 'price'>('date');

  const skillMap = useMemo(() => new Map(skills.map(s => [s.id, s])), [skills]);

  // 按技能分组
  const coursesBySkill = useMemo(() => {
    const map: Record<string, Course[]> = {};
    for (const c of courses) {
      if (!map[c.skillId]) map[c.skillId] = [];
      map[c.skillId].push(c);
    }
    return map;
  }, [courses]);

  // 有课程的技能
  const skillsWithCourses = useMemo(
    () => skills.filter(s => (coursesBySkill[s.id]?.length || 0) > 0),
    [skills, coursesBySkill]
  );

  // 过滤 & 排序
  const filteredCourses = useMemo(() => {
    let list = activeSkillFilter === 'all'
      ? [...courses]
      : courses.filter(c => c.skillId === activeSkillFilter);

    switch (sortBy) {
      case 'date':
        list.sort((a, b) => b.date.localeCompare(a.date));
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
      case 'price':
        list.sort((a, b) => extractPrice(b.price) - extractPrice(a.price));
        break;
    }
    return list;
  }, [courses, activeSkillFilter, sortBy, skillMap]);

  // 价值计算
  const totalCost = useMemo(
    () => courses.reduce((sum, c) => sum + extractPrice(c.price), 0),
    [courses]
  );

  // 按技能计算各自花费
  const skillTotalPrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of courses) {
      if (!map[c.skillId]) map[c.skillId] = 0;
      map[c.skillId] += extractPrice(c.price);
    }
    return map;
  }, [courses]);

  // 按月分组
  const coursesByMonth = useMemo(() => {
    const map: Record<string, Course[]> = {};
    for (const c of filteredCourses) {
      const month = c.date.substring(0, 7); // YYYY-MM
      if (!map[month]) map[month] = [];
      map[month].push(c);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredCourses]);

  // 总时长估算
  const totalDurationMinutes = useMemo(() => {
    let total = 0;
    for (const c of courses) {
      const hourMatch = c.duration.match(/([\d.]+)\s*(?:小时|h|hr|hour)/i);
      const minMatch = c.duration.match(/([\d.]+)\s*(?:分钟|分|min|m)/i);
      if (hourMatch) total += Math.round(parseFloat(hourMatch[1]) * 60);
      else if (minMatch) total += Math.round(parseFloat(minMatch[1]));
      else {
        const num = parseFloat(c.duration);
        if (!isNaN(num)) total += Math.round(num);
      }
    }
    return total;
  }, [courses]);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}分钟`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  };

  return (
    <div>
      {/* 返回按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="pixel-btn bg-[#2c3e7a] text-[#faf0e6] px-3 py-1.5 text-[8px]"
        >
          ← 返回首页
        </button>
        <span className="text-[8px] text-[#6b8dd6]">📖 全部课程</span>
      </div>

      {/* 汇总统计 */}
      <div className="pixel-card p-4 mb-4">
        <h2 className="text-[10px] text-[#2c3e7a] mb-3">📖 课程汇总</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
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
            <p className="text-[12px] text-[#e74c3c]">{totalCost > 0 ? `¥${totalCost.toFixed(0)}` : '-'}</p>
          </div>
          <div className="bg-[#e8f0fe] p-2 pixel-border-light text-center">
            <p className="text-[7px] text-[#6b8dd6]">总时长</p>
            <p className="text-[12px] text-[#32cd32]">{totalDurationMinutes > 0 ? formatDuration(totalDurationMinutes) : '-'}</p>
          </div>
        </div>

        {/* 平均每节价格 */}
        {totalCost > 0 && courses.length > 0 && (
          <div className="bg-[#e8f0fe] p-2 pixel-border-light">
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-[#6b8dd6]">💰 平均每节课价格</span>
              <span className="text-[8px] text-[#e74c3c]">¥{(totalCost / courses.length).toFixed(1)}</span>
            </div>
            {totalDurationMinutes > 0 && (
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[7px] text-[#6b8dd6]">⏱️ 平均每节时长</span>
                <span className="text-[8px] text-[#32cd32]">{formatDuration(Math.round(totalDurationMinutes / courses.length))}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-[10px] text-[#3d2010] mb-2">暂无课程记录！</p>
          <p className="text-[8px] text-[#8b4513]">在各个技能详情页中添加课程吧</p>
        </div>
      ) : (
        <>
          {/* 筛选 & 排序 */}
          <div className="mb-4 space-y-2">
            {/* 技能筛选标签 */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveSkillFilter('all')}
                className={`pixel-btn px-2.5 py-1 text-[7px] ${
                  activeSkillFilter === 'all'
                    ? 'bg-[#4169e1] text-white'
                    : 'bg-[#e8f0fe] text-[#2c3e7a] hover:bg-[#d0e0fc]'
                }`}
              >
                全部 ({courses.length})
              </button>
              {skillsWithCourses.map(s => {
                const sCourses = coursesBySkill[s.id] || [];
                const sPrice = skillTotalPrices[s.id] || 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSkillFilter(s.id === activeSkillFilter ? 'all' : s.id)}
                    className={`pixel-btn px-2.5 py-1 text-[7px] ${
                      activeSkillFilter === s.id
                        ? 'bg-[#4169e1] text-white'
                        : 'bg-[#e8f0fe] text-[#2c3e7a] hover:bg-[#d0e0fc]'
                    }`}
                  >
                    {s.icon} {s.name} ({sCourses.length})
                    {sPrice > 0 && <span className="ml-1 text-[#e74c3c]">¥{sPrice.toFixed(0)}</span>}
                  </button>
                );
              })}
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <span className="text-[7px] text-[#6b8dd6]">排序:</span>
              {[
                { key: 'date' as const, label: '📅 日期' },
                { key: 'name' as const, label: '🔤 名称' },
                { key: 'skill' as const, label: '⭐ 技能' },
                { key: 'price' as const, label: '💰 价格' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`text-[7px] px-2 py-0.5 rounded ${
                    sortBy === opt.key
                      ? 'bg-[#2c3e7a] text-[#faf0e6]'
                      : 'text-[#6b8dd6] hover:bg-[#e8f0fe]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 按月分组课程列表 */}
          <div className="space-y-4">
            {coursesByMonth.map(([month, monthCourses]) => {
              const monthCost = monthCourses.reduce((s, c) => s + extractPrice(c.price), 0);
              return (
                <div key={month}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[9px] text-[#2c3e7a]">📅 {month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] text-[#6b8dd6]">{monthCourses.length}节</span>
                      {monthCost > 0 && <span className="text-[7px] text-[#e74c3c]">¥{monthCost.toFixed(0)}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {monthCourses.map(course => {
                      const skill = skillMap.get(course.skillId);
                      const isSelected = selectedCourse?.id === course.id;
                      const price = extractPrice(course.price);

                      return (
                        <div
                          key={course.id}
                          onClick={() => setSelectedCourse(isSelected ? null : course)}
                          className={`pixel-card p-3 cursor-pointer transition-transform duration-200 ${
                            isSelected ? 'ring-2 ring-[#4169e1] translate-y-[-2px]' : 'hover:translate-y-[-1px]'
                          }`}
                        >
                          {/* 课程头部 */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-lg shrink-0">📖</span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[8px] text-[#2c3e7a] truncate">{course.name}</h4>
                                {skill && (
                                  <p
                                    className="text-[6px] text-[#6b8dd6] cursor-pointer hover:text-[#4169e1]"
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
                              <p className="text-[8px] text-[#e74c3c]">{price > 0 ? course.price : '免费'}</p>
                              <p className="text-[6px] text-[#6b8dd6]">{course.date}</p>
                            </div>
                          </div>

                          {/* 基本信息 */}
                          <div className="flex gap-3 text-[6px]">
                            <span className="text-[#6b8dd6]">⏱️ {course.duration}</span>
                          </div>

                          {/* 展开详情 */}
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t border-[#4169e1]/20 space-y-1">
                              <div className="text-[6px]">
                                <span className="text-[#6b8dd6]">📅 上课日期: </span>
                                <span className="text-[#2c3e7a]">{course.date}</span>
                              </div>
                              <div className="text-[6px]">
                                <span className="text-[#6b8dd6]">⏱️ 课程时长: </span>
                                <span className="text-[#2c3e7a]">{course.duration}</span>
                              </div>
                              <div className="text-[6px]">
                                <span className="text-[#6b8dd6]">💰 课程价格: </span>
                                <span className="text-[#e74c3c]">{course.price}</span>
                              </div>
                              {course.note && (
                                <div className="text-[6px]">
                                  <span className="text-[#6b8dd6]">📝 备注: </span>
                                  <span className="text-[#2c3e7a]">{course.note}</span>
                                </div>
                              )}
                              <div className="text-[6px]">
                                <span className="text-[#6b8dd6]">🕐 记录时间: </span>
                                <span className="text-[#2c3e7a]">{new Date(course.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                              {/* 跳转技能 */}
                              {skill && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSkillClick(skill.id);
                                  }}
                                  className="mt-1 text-[7px] text-[#4169e1] hover:underline"
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
