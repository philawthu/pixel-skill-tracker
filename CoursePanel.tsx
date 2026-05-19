import { useState, useMemo } from 'react';
import type { Course } from '../types';
import { generateId, getTodayString } from '../utils';

interface CoursePanelProps {
  skillId: string;
  skillName: string;
  skillIcon: string;
  courses: Course[];
  onAdd: (course: Course) => void;
  onDelete: (courseId: string) => void;
  onEdit: (course: Course) => void;
}

/** 从价格字符串中提取数值 */
function extractPrice(priceStr: string): number {
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function CoursePanel({ skillId, skillName, skillIcon, courses, onAdd, onDelete, onEdit }: CoursePanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // 表单 state
  const [name, setName] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');

  const skillCourses = useMemo(() =>
    courses.filter(c => c.skillId === skillId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [courses, skillId]
  );

  // 总花费
  const totalCost = useMemo(() => {
    let sum = 0;
    for (const c of skillCourses) sum += extractPrice(c.price);
    return sum;
  }, [skillCourses]);

  // 总课时数（尝试提取数字）
  const totalDurationMinutes = useMemo(() => {
    let total = 0;
    for (const c of skillCourses) {
      const d = c.duration;
      // 尝试解析各种格式: "1小时" "90分钟" "1.5小时" "2h" "60min"
      const hourMatch = d.match(/([\d.]+)\s*(?:小时|h|hr|hour)/i);
      const minMatch = d.match(/([\d.]+)\s*(?:分钟|分|min|m)/i);
      if (hourMatch) total += parseFloat(hourMatch[1]) * 60;
      else if (minMatch) total += parseFloat(minMatch[1]);
      else {
        // 尝试纯数字，默认为分钟
        const num = parseFloat(d);
        if (!isNaN(num)) total += num;
      }
    }
    return total;
  }, [skillCourses]);

  function formatTotalDuration(minutes: number): string {
    if (minutes === 0) return '-';
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}小时`;
    return `${hours}小时${mins}分钟`;
  }

  const resetForm = () => {
    setName('');
    setDate(getTodayString());
    setDuration('');
    setPrice('');
    setNote('');
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const course: Course = {
      id: generateId(),
      skillId,
      name: name.trim(),
      date,
      duration: duration.trim() || '未填写',
      price: price.trim() || '未填写',
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onAdd(course);
    resetForm();
    setShowAdd(false);
  };

  const handleStartEdit = (course: Course) => {
    setEditingCourse(course);
    setName(course.name);
    setDate(course.date);
    setDuration(course.duration === '未填写' ? '' : course.duration);
    setPrice(course.price === '未填写' ? '' : course.price);
    setNote(course.note || '');
    setShowAdd(false);
    setSelectedCourse(null);
  };

  const handleSaveEdit = () => {
    if (!editingCourse || !name.trim()) return;
    const updated: Course = {
      ...editingCourse,
      name: name.trim(),
      date,
      duration: duration.trim() || '未填写',
      price: price.trim() || '未填写',
      note: note.trim() || undefined,
    };
    onEdit(updated);
    setEditingCourse(null);
    resetForm();
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    resetForm();
  };

  const handleDelete = (courseId: string) => {
    if (deleteConfirm === courseId) {
      onDelete(courseId);
      setDeleteConfirm(null);
      if (selectedCourse?.id === courseId) setSelectedCourse(null);
      if (editingCourse?.id === courseId) { setEditingCourse(null); resetForm(); }
    } else {
      setDeleteConfirm(courseId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // 按月份分组
  const coursesByMonth = useMemo(() => {
    const map: Record<string, Course[]> = {};
    for (const c of skillCourses) {
      const month = c.date.substring(0, 7); // YYYY-MM
      if (!map[month]) map[month] = [];
      map[month].push(c);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [skillCourses]);

  // 表单渲染
  const renderForm = (isEdit: boolean) => (
    <div className="p-3 bg-[#e8f0fe]/60 border-2 border-[#6b8dd6]/50 rounded mb-3 space-y-2">
      <div className="text-[8px] text-[#2c3e7a] font-pixel mb-1">
        {isEdit ? '✏️ 编辑课程' : '📖 添加新课程'}
      </div>

      {/* 课程名称 */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="课程名称 *（如 瑜伽基础课）"
        className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#6b8dd6]/30 rounded text-[#2c3e7a] placeholder-[#6b8dd6]/40 focus:outline-none focus:border-[#4169e1] font-pixel"
        onKeyDown={e => { if (e.key === 'Enter') { isEdit ? handleSaveEdit() : handleAdd(); } }}
      />

      {/* 上课日期 + 时长 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[6px] text-[#2c3e7a] block mb-0.5">上课日期</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#6b8dd6]/30 rounded text-[#2c3e7a] focus:outline-none focus:border-[#4169e1] font-pixel"
          />
        </div>
        <div className="flex-1">
          <label className="text-[6px] text-[#2c3e7a] block mb-0.5">课程时长</label>
          <input
            type="text"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="1小时 / 90分钟"
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#6b8dd6]/30 rounded text-[#2c3e7a] placeholder-[#6b8dd6]/40 focus:outline-none focus:border-[#4169e1] font-pixel"
          />
        </div>
      </div>

      {/* 价格 */}
      <div>
        <label className="text-[6px] text-[#2c3e7a] block mb-0.5">课程价格</label>
        <input
          type="text"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="¥200 / 免费 / 包含在年卡中"
          className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#6b8dd6]/30 rounded text-[#2c3e7a] placeholder-[#6b8dd6]/40 focus:outline-none focus:border-[#4169e1] font-pixel"
        />
      </div>

      {/* 备注 */}
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="备注（可选，如老师名字、课程内容等）"
        className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#6b8dd6]/30 rounded text-[#2c3e7a] placeholder-[#6b8dd6]/40 focus:outline-none focus:border-[#4169e1] font-pixel"
      />

      {/* 操作按钮 */}
      {isEdit ? (
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={!name.trim()}
            className={`pixel-btn flex-1 py-1.5 text-[8px] ${
              name.trim()
                ? 'bg-[#4169e1] text-white hover:bg-[#3158c0]'
                : 'bg-[#b0c4de]/50 text-[#6b8dd6]/40 cursor-not-allowed'
            }`}
          >
            💾 保存修改
          </button>
          <button
            onClick={handleCancelEdit}
            className="pixel-btn flex-1 py-1.5 text-[8px] bg-[#808080] text-white hover:bg-[#666]"
          >
            ✕ 取消
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className={`pixel-btn w-full py-1.5 text-[8px] ${
            name.trim()
              ? 'bg-[#4169e1] text-white hover:bg-[#3158c0]'
              : 'bg-[#b0c4de]/50 text-[#6b8dd6]/40 cursor-not-allowed'
          }`}
        >
          ✅ 确认添加
        </button>
      )}
    </div>
  );

  /** 渲染课程行 */
  const renderCourseItem = (course: Course) => {
    const isSelected = selectedCourse?.id === course.id;
    const coursePrice = extractPrice(course.price);

    return (
      <div key={course.id}>
        {/* 课程行 */}
        <div
          onClick={() => setSelectedCourse(isSelected ? null : course)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[#4169e1]/15 border-2 border-[#4169e1]/40'
              : 'bg-[#e8f0fe]/40 hover:bg-[#e8f0fe]/70 border-2 border-transparent'
          }`}
        >
          <span className="text-base">📖</span>
          <div className="flex-1 min-w-0">
            <span className="text-[8px] text-[#2c3e7a] truncate block">
              {course.name}
            </span>
            <span className="text-[6px] text-[#6b8dd6]">
              {course.date} · {course.duration}
            </span>
          </div>
          <span className="text-[7px] text-[#4169e1] shrink-0">{course.price}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit(course);
            }}
            className="text-[7px] px-1 shrink-0 text-[#4169e1] hover:text-[#2c4fb8]"
            title="编辑课程"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(course.id);
            }}
            className={`text-[7px] px-1 shrink-0 ${
              deleteConfirm === course.id ? 'text-[#ff0000]' : 'text-[#cd5c5c] hover:text-[#8b0000]'
            }`}
            title={deleteConfirm === course.id ? '再次点击确认删除' : '删除课程'}
          >
            {deleteConfirm === course.id ? '确认?' : '✕'}
          </button>
        </div>

        {/* 课程详情（展开） */}
        {isSelected && (
          <div className="ml-2 mt-1 p-2.5 bg-[#f0f4ff] border-2 border-[#4169e1]/20 rounded space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📖</span>
              <div>
                <h4 className="text-[10px] text-[#2c3e7a]">{course.name}</h4>
                <p className="text-[7px] text-[#6b8dd6]">
                  {skillIcon} {skillName} 的课程
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#e8f0fe]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#6b8dd6]">📅 上课日期</p>
                <p className="text-[8px] text-[#2c3e7a]">{course.date}</p>
              </div>
              <div className="bg-[#e8f0fe]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#6b8dd6]">⏱️ 课程时长</p>
                <p className="text-[8px] text-[#2c3e7a]">{course.duration}</p>
              </div>
              <div className="bg-[#e8f0fe]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#6b8dd6]">💰 课程价格</p>
                <p className="text-[8px] text-[#2c3e7a]">{course.price}</p>
              </div>
              <div className="bg-[#e8f0fe]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#6b8dd6]">💵 单价</p>
                <p className="text-[8px] text-[#2c3e7a]">{coursePrice > 0 ? `¥${coursePrice.toFixed(2)}` : '-'}</p>
              </div>
            </div>

            {course.note && (
              <div className="bg-[#e8f0fe]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#6b8dd6]">📝 备注</p>
                <p className="text-[8px] text-[#2c3e7a]">{course.note}</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleStartEdit(course)}
                className="pixel-btn flex-1 py-1 text-[7px] bg-[#4169e1] text-white hover:bg-[#3158c0]"
              >
                ✏️ 编辑此课程
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-3 border-t-2 border-[#6b8dd6]/20 pt-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowList(!showList)}
          className="text-[9px] text-[#2c3e7a] flex items-center gap-1"
        >
          <span>{showList ? '▼' : '▶'}</span>
          <span>📖 已上课程</span>
          <span className="text-[7px] text-[#6b8dd6]">({skillCourses.length}节课)</span>
          {totalCost > 0 && (
            <span className="text-[7px] text-[#4169e1] ml-1">💰 总计 ¥{totalCost.toFixed(0)}</span>
          )}
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setEditingCourse(null); resetForm(); }}
          className={`pixel-btn px-2 py-1 text-[7px] ${showAdd ? 'bg-[#808080] text-white' : 'bg-[#b0c4de] text-[#2c3e7a]'}`}
        >
          {showAdd ? '✕ 取消' : '➕ 添加课程'}
        </button>
      </div>

      {/* 总计统计条 */}
      {showList && skillCourses.length > 0 && (
        <div className="mb-2 px-2 py-1.5 bg-[#f0f4ff] border-2 border-[#4169e1]/20 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] text-[#6b8dd6]">📖 课程统计</span>
            <span className="text-[8px] text-[#4169e1] font-pixel">{skillCourses.length} 节课</span>
          </div>
          {totalCost > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[6px] text-[#6b8dd6]/70">💰 总花费</span>
              <span className="text-[7px] text-[#e74c3c]">¥{totalCost.toFixed(2)}</span>
            </div>
          )}
          {totalDurationMinutes > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[6px] text-[#6b8dd6]/70">⏱️ 总时长</span>
              <span className="text-[7px] text-[#2c3e7a]">{formatTotalDuration(totalDurationMinutes)}</span>
            </div>
          )}
          {totalCost > 0 && skillCourses.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[6px] text-[#6b8dd6]/70">📊 平均每节</span>
              <span className="text-[7px] text-[#daa520]">¥{(totalCost / skillCourses.length).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* 添加课程表单 */}
      {showAdd && !editingCourse && renderForm(false)}

      {/* 编辑课程表单 */}
      {editingCourse && renderForm(true)}

      {/* 课程列表（按月分组） */}
      {showList && coursesByMonth.length > 0 && (
        <div className="space-y-2">
          {coursesByMonth.map(([month, monthCourses]) => {
            const monthTotal = monthCourses.reduce((sum, c) => sum + extractPrice(c.price), 0);
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[7px] text-[#6b8dd6] font-pixel">📅 {month}</span>
                  <span className="text-[6px] text-[#6b8dd6]">
                    {monthCourses.length}节
                    {monthTotal > 0 && <span className="ml-1 text-[#e74c3c]">¥{monthTotal.toFixed(0)}</span>}
                  </span>
                </div>
                <div className="space-y-1">
                  {monthCourses.map(course => renderCourseItem(course))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 空状态 */}
      {showList && skillCourses.length === 0 && !showAdd && !editingCourse && (
        <div className="text-center py-3">
          <p className="text-[8px] text-[#6b8dd6]/50">📖 暂无课程记录...</p>
          <p className="text-[6px] text-[#6b8dd6]/40 mt-1">点击"添加课程"记录你上过的课程</p>
        </div>
      )}
    </div>
  );
}
