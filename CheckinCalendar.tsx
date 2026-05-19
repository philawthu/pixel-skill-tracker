import { useState, useMemo } from 'react';
import type { CheckinRecord, Skill } from '../types';

interface CheckinCalendarProps {
  records: CheckinRecord[];
  skills?: Skill[];                    // 可选：用于全局模式显示技能名
  onDateClick?: (date: string) => void; // 可选：点击日期回调
  selectedDate?: string | null;         // 当前选中日期
}

/** 获取某月的天数 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 获取某月1日是星期几 (0=周日) */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** 格式化日期 YYYY-MM-DD */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function CheckinCalendar({ records, skills, onDateClick, selectedDate }: CheckinCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  // 按日期聚合打卡数据
  const dateMap = useMemo(() => {
    const map: Record<string, { count: number; skillIds: Set<string> }> = {};
    for (const r of records) {
      if (!map[r.date]) {
        map[r.date] = { count: 0, skillIds: new Set() };
      }
      map[r.date].count++;
      map[r.date].skillIds.add(r.skillId);
    }
    return map;
  }, [records]);

  // 本月日历数据
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days: Array<{ day: number; date: string; count: number; skillCount: number } | null> = [];

    // 填充月初空白
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // 填充天数
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(viewYear, viewMonth, d);
      const data = dateMap[dateStr];
      days.push({
        day: d,
        date: dateStr,
        count: data?.count || 0,
        skillCount: data?.skillIds.size || 0,
      });
    }

    return days;
  }, [viewYear, viewMonth, dateMap]);

  // 本月统计
  const monthStats = useMemo(() => {
    let totalCheckins = 0;
    let activeDays = 0;
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(viewYear, viewMonth, d);
      const data = dateMap[dateStr];
      if (data) {
        totalCheckins += data.count;
        activeDays++;
      }
    }
    return { totalCheckins, activeDays, daysInMonth };
  }, [viewYear, viewMonth, dateMap]);

  // 热力颜色
  const getHeatColor = (count: number): string => {
    if (count === 0) return 'bg-[#faebd7]/40';
    if (count === 1) return 'bg-[#90ee90]/60';
    if (count <= 3) return 'bg-[#32cd32]/70';
    if (count <= 5) return 'bg-[#228b22]/80';
    return 'bg-[#006400]/90';
  };

  const getHeatTextColor = (count: number): string => {
    if (count === 0) return 'text-[#8b4513]/40';
    if (count <= 2) return 'text-[#2e7d32]';
    return 'text-white';
  };

  // 月份切换
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    if (viewYear === todayYear && viewMonth === todayMonth) return; // 不允许超过当月
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const isToday = (dateStr: string) => {
    return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // 年份范围：从最早打卡记录年份 - 2 到当前年 + 1（确保至少覆盖 5 年）
  const currentYear = today.getFullYear();
  const yearRange = useMemo(() => {
    let minYear = currentYear;
    for (const r of records) {
      const y = parseInt(r.date.split('-')[0]);
      if (!isNaN(y) && y < minYear) minYear = y;
    }
    // 保证至少有前后几年可选
    const rangeStart = Math.min(minYear, currentYear - 2);
    const rangeEnd = currentYear;
    const years: number[] = [];
    for (let y = rangeStart; y <= rangeEnd; y++) {
      years.push(y);
    }
    return years;
  }, [records, currentYear]);

  // 打开年月选择器
  const openPicker = () => {
    setPickerYear(viewYear);
    setShowYearMonthPicker(true);
  };

  // 选择月份
  const selectMonth = (month: number) => {
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    // 不允许选未来月份
    if (pickerYear > todayYear || (pickerYear === todayYear && month > todayMonth)) return;
    setViewYear(pickerYear);
    setViewMonth(month);
    setShowYearMonthPicker(false);
  };

  // 判断某月是否有打卡数据
  const monthHasData = (year: number, month: number): boolean => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return records.some(r => r.date.startsWith(prefix));
  };

  // 悬浮提示的记录详情
  const hoveredInfo = useMemo(() => {
    if (!hoveredDate) return null;
    const data = dateMap[hoveredDate];
    if (!data) return null;

    const dayRecords = records.filter(r => r.date === hoveredDate);
    // 按技能分组
    const bySkill: Record<string, CheckinRecord[]> = {};
    for (const r of dayRecords) {
      if (!bySkill[r.skillId]) bySkill[r.skillId] = [];
      bySkill[r.skillId].push(r);
    }

    return {
      date: hoveredDate,
      count: data.count,
      skillCount: data.skillIds.size,
      bySkill,
    };
  }, [hoveredDate, dateMap, records]);

  return (
    <div className="relative">
      {/* 月份切换头部 */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="pixel-btn bg-[#deb887] text-[#3d2010] px-2 py-1 text-[7px] hover:bg-[#cd853f]"
        >
          ◀
        </button>
        <div className="text-center flex items-center gap-1">
          <button
            onClick={openPicker}
            className="text-[9px] text-[#3d2010] font-pixel hover:text-[#8b0000] hover:underline cursor-pointer transition-colors"
            title="点击快速选择年月"
          >
            {viewYear}年{viewMonth + 1}月 ▾
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="text-[6px] text-[#4169e1] underline hover:text-[#00008b]"
            >
              回到今天
            </button>
          )}
        </div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className={`pixel-btn px-2 py-1 text-[7px] ${
            isCurrentMonth
              ? 'bg-[#d2b48c]/40 text-[#8b4513]/30 cursor-not-allowed'
              : 'bg-[#deb887] text-[#3d2010] hover:bg-[#cd853f]'
          }`}
        >
          ▶
        </button>
      </div>

      {/* 年月快速选择面板 */}
      {showYearMonthPicker && (
        <div className="mb-3 p-2 bg-[#faf0e6] border-2 border-[#8b4513]/40 rounded-lg shadow-inner">
          {/* 年份选择 - 横向滚动 + ◀▶ 扩展范围 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setPickerYear(y => y - 1)}
              className="text-[8px] px-1.5 py-0.5 rounded text-[#3d2010] hover:bg-[#deb887] cursor-pointer flex-shrink-0"
            >
              ◀
            </button>
            <div className="flex-1 flex items-center justify-center overflow-x-auto gap-1 px-1 scrollbar-hide">
              {/* 动态显示年份：以 pickerYear 为中心，保证其始终可见 */}
              {(() => {
                const rangeStart = Math.min(yearRange[0], pickerYear);
                const rangeEnd = Math.max(yearRange[yearRange.length - 1], pickerYear);
                const years: number[] = [];
                for (let y = rangeStart; y <= rangeEnd; y++) {
                  years.push(y);
                }
                return years.map(y => {
                  const hasAnyData = records.some(r => r.date.startsWith(`${y}-`));
                  return (
                    <button
                      key={y}
                      onClick={() => setPickerYear(y)}
                      className={`text-[8px] px-2 py-0.5 rounded-sm whitespace-nowrap transition-all relative ${
                        y === pickerYear
                          ? 'bg-[#8b4513] text-[#faf0e6] font-bold'
                          : y > currentYear
                            ? 'text-[#8b4513]/30 cursor-not-allowed'
                            : 'text-[#3d2010] hover:bg-[#deb887]'
                      }`}
                      disabled={y > currentYear}
                    >
                      {y}
                      {hasAnyData && y !== pickerYear && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#228b22]" />
                      )}
                    </button>
                  );
                });
              })()}
            </div>
            <button
              onClick={() => setPickerYear(y => Math.min(y + 1, currentYear))}
              disabled={pickerYear >= currentYear}
              className={`text-[8px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                pickerYear >= currentYear
                  ? 'text-[#8b4513]/30 cursor-not-allowed'
                  : 'text-[#3d2010] hover:bg-[#deb887] cursor-pointer'
              }`}
            >
              ▶
            </button>
          </div>

          {/* 月份网格 */}
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, m) => {
              const isFuture = pickerYear > today.getFullYear() ||
                (pickerYear === today.getFullYear() && m > today.getMonth());
              const isCurrent = pickerYear === viewYear && m === viewMonth;
              const hasData = monthHasData(pickerYear, m);

              return (
                <button
                  key={m}
                  onClick={() => selectMonth(m)}
                  disabled={isFuture}
                  className={`text-[8px] py-1.5 rounded-sm transition-all relative ${
                    isFuture
                      ? 'text-[#8b4513]/20 cursor-not-allowed bg-[#d2b48c]/10'
                      : isCurrent
                        ? 'bg-[#228b22] text-white font-bold shadow'
                        : hasData
                          ? 'bg-[#90ee90]/40 text-[#2e7d32] hover:bg-[#90ee90]/70 cursor-pointer font-medium'
                          : 'text-[#8b4513]/60 hover:bg-[#deb887]/50 cursor-pointer'
                  }`}
                >
                  {m + 1}月
                  {hasData && !isCurrent && (
                    <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-[#228b22]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 关闭按钮 */}
          <div className="flex justify-center mt-2">
            <button
              onClick={() => setShowYearMonthPicker(false)}
              className="text-[7px] text-[#8b4513]/60 hover:text-[#8b4513] underline"
            >
              ✕ 收起
            </button>
          </div>
        </div>
      )}

      {/* 月度统计 */}
      <div className="flex items-center justify-center gap-3 mb-2 text-[7px]">
        <span className="text-[#228b22]">📊 打卡 {monthStats.totalCheckins} 次</span>
        <span className="text-[#4169e1]">📅 活跃 {monthStats.activeDays}/{monthStats.daysInMonth} 天</span>
      </div>

      {/* 星期头部 */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[6px] text-[#8b4513]/60 font-pixel py-0.5">
            {w}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const isTodayDate = isToday(day.date);
          const isSelected = selectedDate === day.date;
          const hasCheckins = day.count > 0;

          return (
            <div
              key={day.date}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-sm cursor-pointer
                transition-all duration-150 relative
                ${getHeatColor(day.count)}
                ${isTodayDate ? 'ring-1 ring-[#daa520]' : ''}
                ${isSelected ? 'ring-2 ring-[#4169e1] scale-110 z-10' : ''}
                ${hasCheckins ? 'hover:scale-110 hover:z-10' : 'hover:bg-[#faebd7]/60'}
              `}
              onClick={() => onDateClick?.(day.date)}
              onMouseEnter={() => setHoveredDate(day.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <span className={`text-[7px] leading-none ${getHeatTextColor(day.count)} ${isTodayDate ? 'font-bold' : ''}`}>
                {day.day}
              </span>
              {day.count > 0 && (
                <span className={`text-[5px] leading-none mt-0.5 ${day.count > 2 ? 'text-white/80' : 'text-[#228b22]'}`}>
                  ×{day.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 热力图图例 */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-[6px] text-[#8b4513]/60">少</span>
        <div className="w-2 h-2 rounded-sm bg-[#faebd7]/40 border border-[#8b4513]/10" />
        <div className="w-2 h-2 rounded-sm bg-[#90ee90]/60" />
        <div className="w-2 h-2 rounded-sm bg-[#32cd32]/70" />
        <div className="w-2 h-2 rounded-sm bg-[#228b22]/80" />
        <div className="w-2 h-2 rounded-sm bg-[#006400]/90" />
        <span className="text-[6px] text-[#8b4513]/60">多</span>
      </div>

      {/* 悬浮提示 */}
      {hoveredInfo && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#3d2010] text-[#faf0e6] px-3 py-2 rounded shadow-lg z-20 min-w-[120px] pointer-events-none">
          <div className="text-[7px] font-pixel mb-1">📅 {hoveredInfo.date}</div>
          <div className="text-[6px]">
            打卡 {hoveredInfo.count} 次 · {hoveredInfo.skillCount} 项技能
          </div>
          {skills && Object.entries(hoveredInfo.bySkill).slice(0, 5).map(([skillId, recs]) => {
            const skill = skills.find(s => s.id === skillId);
            return (
              <div key={skillId} className="text-[6px] mt-0.5 opacity-80">
                {skill ? `${skill.icon} ${skill.name}` : skillId}: {recs.length}次
              </div>
            );
          })}
          {Object.keys(hoveredInfo.bySkill).length > 5 && (
            <div className="text-[5px] opacity-60 mt-0.5">...还有更多</div>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#3d2010]" />
        </div>
      )}
    </div>
  );
}
