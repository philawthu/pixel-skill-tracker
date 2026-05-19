import { useState, useMemo } from 'react';
import type { Skill, CheckinRecord } from '../types';
import { getExpInCurrentLevel, getExpToNextLevel, getStarTier } from '../utils';
import { CheckinCalendar } from './CheckinCalendar';

interface SkillCardProps {
  skill: Skill;
  records: CheckinRecord[];
  onCheckin: (skillId: string, note: string, timeSlot: string) => void;
  onMakeupCheckin: (skillId: string, date: string, note: string, timeSlot: string) => void;
  onDelete: (skillId: string) => void;
}

export function SkillCard({ skill, records, onCheckin, onMakeupCheckin, onDelete }: SkillCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [note, setNote] = useState('');
  const [showRecords, setShowRecords] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [showMakeup, setShowMakeup] = useState(false);
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupNote, setMakeupNote] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [makeupTimeStart, setMakeupTimeStart] = useState('');
  const [makeupTimeEnd, setMakeupTimeEnd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  const currentExp = getExpInCurrentLevel(skill);
  const nextLevelExp = getExpToNextLevel(skill);
  const progress = nextLevelExp > 0 ? (currentExp / nextLevelExp) * 100 : 0;
  const starTier = getStarTier(skill.level);

  // 今日打卡记录
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);

  // 按日期分组的所有历史记录（从新到旧）
  const groupedRecords = useMemo(() => {
    const groups: Record<string, CheckinRecord[]> = {};
    const sorted = [...records].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
    sorted.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return groups;
  }, [records]);

  // 日历筛选后的分组记录
  const filteredGroupedRecords = useMemo(() => {
    if (!calendarDate) return groupedRecords;
    const filtered: Record<string, CheckinRecord[]> = {};
    if (groupedRecords[calendarDate]) {
      filtered[calendarDate] = groupedRecords[calendarDate];
    }
    return filtered;
  }, [groupedRecords, calendarDate]);

  const handleCheckin = () => {
    const timeSlot = (timeStart && timeEnd) ? `${timeStart}-${timeEnd}` : (timeStart || '');
    setIsAnimating(true);
    setShowExp(true);
    onCheckin(skill.id, note.trim(), timeSlot);
    setNote('');
    setTimeStart('');
    setTimeEnd('');
    setTimeout(() => setIsAnimating(false), 400);
    setTimeout(() => setShowExp(false), 1200);
  };

  const handleMakeupCheckin = () => {
    if (!makeupDate) return;
    const today = new Date().toISOString().split('T')[0];
    if (makeupDate >= today) return; // 不能补今天或未来的卡
    const timeSlot = (makeupTimeStart && makeupTimeEnd) ? `${makeupTimeStart}-${makeupTimeEnd}` : (makeupTimeStart || '');
    setIsAnimating(true);
    setShowExp(true);
    onMakeupCheckin(skill.id, makeupDate, makeupNote.trim(), timeSlot);
    setMakeupDate('');
    setMakeupNote('');
    setMakeupTimeStart('');
    setMakeupTimeEnd('');
    setShowMakeup(false);
    setTimeout(() => setIsAnimating(false), 400);
    setTimeout(() => setShowExp(false), 1200);
  };

  // 计算星星显示：每5级为一行，颜色随段位变化
  const renderStars = () => {
    const totalStars = skill.level;
    const fullRows = Math.floor(totalStars / 5);
    const remainder = totalStars % 5;
    const rows: React.ReactElement[] = [];

    // 渲染已满的行（每行5颗，颜色根据段位变化）
    for (let row = 0; row < fullRows; row++) {
      const rowLevel = (row + 1) * 5;
      const tier = getStarTier(rowLevel);
      rows.push(
        <div key={`row-${row}`} className="flex gap-0.5 items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="pixel-star"
              style={{ width: '10px', height: '10px', backgroundColor: tier.color }}
            />
          ))}
          <span className="text-[6px] ml-1 opacity-60" style={{ color: tier.color }}>
            {tier.label}
          </span>
        </div>
      );
    }

    // 渲染当前进行中的行
    if (remainder > 0 || fullRows === 0) {
      const currentTier = getStarTier(skill.level);
      rows.push(
        <div key="current-row" className="flex gap-0.5 items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`pixel-star ${i >= remainder ? 'pixel-star-empty' : ''}`}
              style={{
                width: '10px',
                height: '10px',
                backgroundColor: i < remainder ? currentTier.color : undefined,
              }}
            />
          ))}
          <span className="text-[6px] ml-1 opacity-60" style={{ color: currentTier.color }}>
            {currentTier.label}
          </span>
        </div>
      );
    }

    return rows;
  };

  return (
    <div className={`pixel-card p-4 relative ${isAnimating ? 'animate-level-up' : ''}`}>
      {/* Float up exp indicator */}
      {showExp && (
        <div className="absolute top-0 right-4 animate-float-up text-[10px] text-[#32cd32] font-pixel z-10">
          +10 EXP
        </div>
      )}

      {/* Header: Icon + Name + Level */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{skill.icon}</span>
          <div>
            <h3 className="text-[10px] text-[#3d2010] leading-relaxed">{skill.name}</h3>
            <p className="text-[8px]" style={{ color: starTier.color }}>
              Lv.{skill.level} · {starTier.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {skill.todayCheckins > 0 && (
            <span className="text-[7px] bg-[#32cd32]/20 text-[#228b22] px-1.5 py-0.5 rounded">
              今日×{skill.todayCheckins}
            </span>
          )}
          <button
            onClick={() => onDelete(skill.id)}
            className="text-[8px] text-[#cd5c5c] hover:text-[#8b0000] transition-colors px-1"
            title="删除技能"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stars - multi-row */}
      <div className="flex flex-col gap-0.5 mb-2">
        {renderStars()}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="pixel-progress">
          <div
            className="pixel-progress-fill"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: starTier.color,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px] text-[#5c3a21]">
            {currentExp}/{nextLevelExp}
          </span>
          <span className="text-[7px] text-[#5c3a21]">
            连续{skill.streak}天
          </span>
        </div>
      </div>

      {/* Title Badges */}
      {skill.level >= 5 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="pixel-badge pixel-badge-silver">
            🏅 {skill.title5}
          </span>
          {skill.level >= 10 && (
            <span className="pixel-badge pixel-badge-gold">
              👑 {skill.title10}
            </span>
          )}
          {skill.level >= 15 && (
            <span className="pixel-badge" style={{ backgroundColor: '#00bfff22', borderColor: '#00bfff', color: '#006080' }}>
              💎 {skill.title15}
            </span>
          )}
          {skill.level >= 20 && (
            <span className="pixel-badge" style={{ backgroundColor: '#ff69b422', borderColor: '#ff69b4', color: '#8b0060' }}>
              🔮 {skill.title20}
            </span>
          )}
          {skill.level >= 30 && (
            <span className="pixel-badge" style={{ backgroundColor: '#ff450022', borderColor: '#ff4500', color: '#8b2500' }}>
              🌟 {skill.title30}
            </span>
          )}
        </div>
      )}

      {/* Time Slot Input */}
      <div className="mb-2">
        <div className="text-[7px] text-[#8b4513]/70 mb-1 font-pixel">🕐 打卡时间段</div>
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={timeStart}
            onChange={e => setTimeStart(e.target.value)}
            className="flex-1 px-2 py-1.5 text-[8px] bg-[#faebd7]/50 border-2 border-[#8b4513]/30 rounded
                       text-[#3d2010] focus:outline-none focus:border-[#daa520] font-pixel"
          />
          <span className="text-[8px] text-[#8b4513]/60">→</span>
          <input
            type="time"
            value={timeEnd}
            onChange={e => setTimeEnd(e.target.value)}
            className="flex-1 px-2 py-1.5 text-[8px] bg-[#faebd7]/50 border-2 border-[#8b4513]/30 rounded
                       text-[#3d2010] focus:outline-none focus:border-[#daa520] font-pixel"
          />
        </div>
      </div>

      {/* Note Input */}
      <div className="mb-2">
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="打卡备注（可选）"
          className="w-full px-2 py-1.5 text-[8px] bg-[#faebd7]/50 border-2 border-[#8b4513]/30 rounded
                     text-[#3d2010] placeholder-[#8b4513]/40 focus:outline-none focus:border-[#daa520]
                     font-pixel"
          onKeyDown={e => {
            if (e.key === 'Enter') handleCheckin();
          }}
        />
      </div>

      {/* Checkin Button */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={handleCheckin}
          className="pixel-btn flex-1 py-2 px-3 text-[9px] bg-[#32cd32] text-white hover:bg-[#228b22]"
        >
          ⚡ 打卡 +10EXP
        </button>
        <button
          onClick={() => setShowMakeup(!showMakeup)}
          className={`pixel-btn py-2 px-3 text-[9px] ${showMakeup ? 'bg-[#cd853f] text-white' : 'bg-[#deb887] text-[#3d2010]'} hover:bg-[#cd853f] hover:text-white`}
        >
          📅 补卡
        </button>
      </div>

      {/* Makeup Checkin Form */}
      {showMakeup && (
        <div className="mt-2 p-2 bg-[#faebd7]/60 border-2 border-[#daa520]/50 rounded space-y-2">
          <div className="text-[7px] text-[#8b4513] font-pixel">📅 补打历史卡</div>
          <input
            type="date"
            value={makeupDate}
            onChange={e => setMakeupDate(e.target.value)}
            max={(() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              return d.toISOString().split('T')[0];
            })()}
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded
                       text-[#3d2010] focus:outline-none focus:border-[#daa520] font-pixel"
          />
          <div className="text-[7px] text-[#8b4513]/70 font-pixel">🕐 时间段</div>
          <div className="flex items-center gap-1">
            <input
              type="time"
              value={makeupTimeStart}
              onChange={e => setMakeupTimeStart(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded
                         text-[#3d2010] focus:outline-none focus:border-[#daa520] font-pixel"
            />
            <span className="text-[8px] text-[#8b4513]/60">→</span>
            <input
              type="time"
              value={makeupTimeEnd}
              onChange={e => setMakeupTimeEnd(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded
                         text-[#3d2010] focus:outline-none focus:border-[#daa520] font-pixel"
            />
          </div>
          <input
            type="text"
            value={makeupNote}
            onChange={e => setMakeupNote(e.target.value)}
            placeholder="补卡备注（可选）"
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded
                       text-[#3d2010] placeholder-[#8b4513]/40 focus:outline-none focus:border-[#daa520]
                       font-pixel"
            onKeyDown={e => {
              if (e.key === 'Enter') handleMakeupCheckin();
            }}
          />
          <button
            onClick={handleMakeupCheckin}
            disabled={!makeupDate}
            className={`pixel-btn w-full py-1.5 px-3 text-[8px] ${
              makeupDate
                ? 'bg-[#daa520] text-white hover:bg-[#b8860b]'
                : 'bg-[#d2b48c]/50 text-[#8b4513]/40 cursor-not-allowed'
            }`}
          >
            ✅ 确认补卡 +10EXP
          </button>
        </div>
      )}

      {/* Today's Records Toggle */}
      {todayRecords.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowRecords(!showRecords)}
            className="text-[7px] text-[#8b4513] hover:text-[#3d2010] underline w-full text-left"
          >
            {showRecords ? '▼' : '▶'} 今日打卡记录 ({todayRecords.length})
          </button>
          {showRecords && (
            <div className="mt-1 space-y-1 max-h-[120px] overflow-y-auto">
              {todayRecords.map(record => (
                <div
                  key={record.id}
                  className="flex items-start gap-1 text-[7px] text-[#5c3a21] bg-[#faebd7]/40 px-2 py-1 rounded flex-wrap"
                >
                  <span className="text-[#8b4513]/60 shrink-0">{record.time}</span>
                  {record.timeSlot && (
                    <span className="text-[#4a90d9] shrink-0">🕐{record.timeSlot}</span>
                  )}
                  <span className="text-[#32cd32] shrink-0">+{record.expGained}</span>
                  {record.note && (
                    <span className="text-[#3d2010]">
                      「{record.note}」
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All History Records Toggle */}
      {records.length > 0 && (
        <div className="mt-2 border-t border-[#8b4513]/20 pt-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAllRecords(!showAllRecords)}
              className="text-[7px] text-[#8b4513] hover:text-[#3d2010] underline text-left"
            >
              {showAllRecords ? '▼' : '▶'} 全部打卡记录 ({records.length})
            </button>
            {showAllRecords && (
              <button
                onClick={() => {
                  setShowCalendar(!showCalendar);
                  if (showCalendar) setCalendarDate(null); // 关闭日历时重置筛选
                }}
                className={`text-[7px] px-1.5 py-0.5 rounded transition-colors ${
                  showCalendar
                    ? 'bg-[#4169e1]/20 text-[#4169e1]'
                    : 'text-[#8b4513] hover:text-[#3d2010] hover:bg-[#faebd7]/60'
                }`}
              >
                📅 {showCalendar ? '关闭日历' : '日历筛选'}
              </button>
            )}
          </div>
          {showAllRecords && (
            <div className="mt-1">
              {/* 日历筛选区 */}
              {showCalendar && (
                <div className="mb-2 p-2 bg-[#fff8dc]/60 border-2 border-[#daa520]/30 rounded">
                  <CheckinCalendar
                    records={records}
                    onDateClick={(date) => {
                      setCalendarDate(prev => prev === date ? null : date);
                    }}
                    selectedDate={calendarDate}
                  />
                  {calendarDate && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[7px] text-[#4169e1] font-pixel">
                        🔍 筛选：{calendarDate}
                      </span>
                      <button
                        onClick={() => setCalendarDate(null)}
                        className="text-[6px] text-[#cd5c5c] hover:text-[#8b0000] underline"
                      >
                        ✕ 清除筛选
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 记录列表 */}
              {Object.keys(filteredGroupedRecords).length === 0 ? (
                <div className="text-center text-[7px] text-[#8b4513]/50 py-3">
                  {calendarDate ? `${calendarDate} 无打卡记录` : '暂无打卡记录'}
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {Object.entries(filteredGroupedRecords).map(([date, dayRecords]) => (
                    <div key={date}>
                      <div className="text-[7px] text-[#daa520] font-pixel mb-0.5 sticky top-0 bg-[#faebd7]/90 px-1">
                        📅 {date} ({dayRecords.length}次)
                      </div>
                      <div className="space-y-0.5 pl-2">
                        {dayRecords.map(record => (
                          <div
                            key={record.id}
                            className="flex items-start gap-1 text-[7px] text-[#5c3a21] bg-[#faebd7]/30 px-2 py-1 rounded flex-wrap"
                          >
                            <span className="text-[#8b4513]/60 shrink-0">{record.time}</span>
                            {record.timeSlot && (
                              <span className="text-[#4a90d9] shrink-0">🕐{record.timeSlot}</span>
                            )}
                            <span className="text-[#32cd32] shrink-0">+{record.expGained}</span>
                            {record.note && (
                              <span className="text-[#3d2010]">
                                「{record.note}」
                              </span>
                            )}
                            {!record.note && (
                              <span className="text-[#8b4513]/30 italic">无备注</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
