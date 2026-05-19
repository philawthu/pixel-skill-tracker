import { useMemo } from 'react';
import type { CheckinRecord, Equipment, Course } from '../types';

interface SkillSummaryPanelProps {
  skillId: string;
  records: CheckinRecord[];
  equipments: Equipment[];
  courses: Course[];
}

/** 从时间段字符串（如 "09:00-10:30"）中提取分钟数 */
function parseTimeSlotMinutes(timeSlot: string): number {
  if (!timeSlot) return 0;
  const parts = timeSlot.split('-');
  if (parts.length !== 2) return 0;
  const [startStr, endStr] = parts;
  const startParts = startStr.trim().split(':');
  const endParts = endStr.trim().split(':');
  if (startParts.length < 2 || endParts.length < 2) return 0;
  const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
  const endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
  if (isNaN(startMin) || isNaN(endMin)) return 0;
  // 处理跨午夜的情况
  const diff = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin + endMin);
  return diff > 0 ? diff : 0;
}

/** 从价格字符串中提取数值 */
function extractPrice(priceStr: string): number {
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/** 格式化分钟为可读时间 */
function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0分钟';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
}

export function SkillSummaryPanel({ skillId, records, equipments, courses }: SkillSummaryPanelProps) {
  // ========== 花费时间汇总 ==========
  const timeStats = useMemo(() => {
    const skillRecords = records.filter(r => r.skillId === skillId);
    let totalMinutes = 0;
    let recordsWithTime = 0;

    for (const r of skillRecords) {
      const minutes = parseTimeSlotMinutes(r.timeSlot);
      if (minutes > 0) {
        totalMinutes += minutes;
        recordsWithTime++;
      }
    }

    // 按月统计
    const monthlyMap: Record<string, number> = {};
    for (const r of skillRecords) {
      const minutes = parseTimeSlotMinutes(r.timeSlot);
      if (minutes > 0) {
        const month = r.date.substring(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + minutes;
      }
    }
    const monthlyData = Object.entries(monthlyMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6); // 最近 6 个月

    return {
      totalMinutes,
      recordsWithTime,
      totalRecords: skillRecords.length,
      avgMinutes: recordsWithTime > 0 ? totalMinutes / recordsWithTime : 0,
      monthlyData,
    };
  }, [records, skillId]);

  // ========== 花费金钱汇总 ==========
  const moneyStats = useMemo(() => {
    const skillEquipments = equipments.filter(e => e.skillId === skillId);
    const currentEquipments = skillEquipments.filter(e => !e.retired);
    const historyEquipments = skillEquipments.filter(e => e.retired);
    const skillCourses = courses.filter(c => c.skillId === skillId);

    const currentEquipCost = currentEquipments.reduce((sum, e) => sum + extractPrice(e.price), 0);
    const historyEquipCost = historyEquipments.reduce((sum, e) => sum + extractPrice(e.price), 0);
    const totalEquipCost = currentEquipCost + historyEquipCost;
    const courseCost = skillCourses.reduce((sum, c) => sum + extractPrice(c.price), 0);
    const totalCost = totalEquipCost + courseCost;

    return {
      currentEquipCost,
      historyEquipCost,
      totalEquipCost,
      courseCost,
      totalCost,
      equipCount: skillEquipments.length,
      currentEquipCount: currentEquipments.length,
      historyEquipCount: historyEquipments.length,
      courseCount: skillCourses.length,
    };
  }, [equipments, courses, skillId]);

  const hasData = timeStats.totalMinutes > 0 || moneyStats.totalCost > 0;

  if (!hasData && timeStats.totalRecords === 0 && moneyStats.equipCount === 0 && moneyStats.courseCount === 0) {
    return null; // 没有任何数据时不渲染
  }

  return (
    <div className="mt-3 border-t-2 border-[#2e7d32]/20 pt-3">
      <div className="text-[9px] text-[#2e7d32] mb-2 flex items-center gap-1">
        📊 <span>技能花费汇总</span>
      </div>

      <div className="space-y-3">
        {/* ======== 花费时间 ======== */}
        <div className="bg-[#e8f5e9]/60 border-2 border-[#4caf50]/30 rounded p-3">
          <div className="text-[8px] text-[#2e7d32] font-pixel mb-2 flex items-center gap-1">
            ⏱️ 花费时间
          </div>

          {/* 总时长 */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[7px] text-[#4caf50]">总投入时间</span>
            <span className="text-[10px] text-[#2e7d32] font-pixel">
              {timeStats.totalMinutes > 0 ? formatMinutes(timeStats.totalMinutes) : '暂无记录'}
            </span>
          </div>

          {timeStats.totalMinutes > 0 && (
            <>
              {/* 统计明细 */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <div className="bg-white/50 p-1.5 rounded text-center">
                  <p className="text-[6px] text-[#4caf50]">有时间段的打卡</p>
                  <p className="text-[8px] text-[#2e7d32] font-pixel">{timeStats.recordsWithTime}次 / {timeStats.totalRecords}次</p>
                </div>
                <div className="bg-white/50 p-1.5 rounded text-center">
                  <p className="text-[6px] text-[#4caf50]">平均每次时长</p>
                  <p className="text-[8px] text-[#2e7d32] font-pixel">{formatMinutes(Math.round(timeStats.avgMinutes))}</p>
                </div>
              </div>

              {/* 月度趋势 */}
              {timeStats.monthlyData.length > 0 && (
                <div>
                  <div className="text-[6px] text-[#4caf50] mb-1">📅 月度时间投入</div>
                  <div className="space-y-0.5">
                    {timeStats.monthlyData.map(([month, minutes]) => {
                      const barWidth = timeStats.totalMinutes > 0 ? (minutes / timeStats.totalMinutes) * 100 : 0;
                      return (
                        <div key={month} className="flex items-center gap-1">
                          <span className="text-[6px] text-[#4caf50] w-[50px] shrink-0">{month}</span>
                          <div className="flex-1 h-2 bg-white/50 rounded overflow-hidden">
                            <div
                              className="h-full bg-[#4caf50]/60 rounded"
                              style={{ width: `${Math.max(barWidth, 3)}%` }}
                            />
                          </div>
                          <span className="text-[6px] text-[#2e7d32] w-[50px] shrink-0 text-right">{formatMinutes(minutes)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {timeStats.totalMinutes === 0 && timeStats.totalRecords > 0 && (
            <p className="text-[6px] text-[#4caf50]/60 italic">
              提示：打卡时填写时间段即可自动统计时间投入
            </p>
          )}
        </div>

        {/* ======== 花费金钱 ======== */}
        <div className="bg-[#fff3e0]/60 border-2 border-[#ff9800]/30 rounded p-3">
          <div className="text-[8px] text-[#e65100] font-pixel mb-2 flex items-center gap-1">
            💰 花费金钱
          </div>

          {/* 总花费 */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[7px] text-[#ff9800]">总花费</span>
            <span className="text-[10px] text-[#e65100] font-pixel">
              {moneyStats.totalCost > 0 ? `¥${moneyStats.totalCost.toFixed(2)}` : '¥0'}
            </span>
          </div>

          {moneyStats.totalCost > 0 && (
            <div className="space-y-1.5">
              {/* 装备花费 */}
              <div className="bg-white/50 p-1.5 rounded">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[6px] text-[#ff9800]">🎒 装备花费（{moneyStats.equipCount}件）</span>
                  <span className="text-[7px] text-[#e65100]">¥{moneyStats.totalEquipCost.toFixed(2)}</span>
                </div>
                {moneyStats.currentEquipCount > 0 && (
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-[5px] text-[#ff9800]/70">⚔️ 当前装备（{moneyStats.currentEquipCount}件）</span>
                    <span className="text-[6px] text-[#4caf50]">¥{moneyStats.currentEquipCost.toFixed(2)}</span>
                  </div>
                )}
                {moneyStats.historyEquipCount > 0 && (
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-[5px] text-[#ff9800]/70">📦 历史装备（{moneyStats.historyEquipCount}件）</span>
                    <span className="text-[6px] text-[#a0a0a0]">¥{moneyStats.historyEquipCost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* 课程花费 */}
              <div className="bg-white/50 p-1.5 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-[6px] text-[#ff9800]">📖 课程花费（{moneyStats.courseCount}节）</span>
                  <span className="text-[7px] text-[#e65100]">¥{moneyStats.courseCost.toFixed(2)}</span>
                </div>
              </div>

              {/* 时间成本（花费金钱 ÷ 花费时间） */}
              {timeStats.totalMinutes > 0 && moneyStats.totalCost > 0 && (
                <div className="bg-white/50 p-1.5 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-[6px] text-[#ff9800]">📊 每小时花费</span>
                    <span className="text-[7px] text-[#e65100]">
                      ¥{(moneyStats.totalCost / (timeStats.totalMinutes / 60)).toFixed(2)}/小时
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {moneyStats.totalCost === 0 && (
            <p className="text-[6px] text-[#ff9800]/60 italic">
              暂无花费记录（添加装备或课程后自动统计）
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
