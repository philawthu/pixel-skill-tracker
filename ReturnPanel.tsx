import { useState, useMemo } from 'react';
import type { SkillReturn, ReturnCategory } from '../types';
import { generateId, getTodayString } from '../utils';

interface ReturnPanelProps {
  skillId: string;
  skillName: string;
  skillIcon: string;
  returns: SkillReturn[];
  onAdd: (ret: SkillReturn) => void;
  onDelete: (returnId: string) => void;
  onEdit: (ret: SkillReturn) => void;
}

const RETURN_CATEGORIES: { key: ReturnCategory; label: string; icon: string; color: string }[] = [
  { key: 'money', label: '金钱收入', icon: '💰', color: '#daa520' },
  { key: 'emotion', label: '好心情', icon: '😊', color: '#ff69b4' },
  { key: 'social', label: '人际关系', icon: '🤝', color: '#4169e1' },
  { key: 'health', label: '健康提升', icon: '💪', color: '#32cd32' },
  { key: 'growth', label: '个人成长', icon: '🌱', color: '#9370db' },
  { key: 'other', label: '其他收获', icon: '✨', color: '#ff8c00' },
];

const CATEGORY_MAP = new Map(RETURN_CATEGORIES.map(c => [c.key, c]));

function extractMoney(str: string): number {
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function ReturnPanel({ skillId, skillName, skillIcon, returns, onAdd, onDelete, onEdit }: ReturnPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<SkillReturn | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingReturn, setEditingReturn] = useState<SkillReturn | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReturnCategory>('money');
  const [date, setDate] = useState(getTodayString());
  const [moneyAmount, setMoneyAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  const skillReturns = useMemo(() =>
    returns.filter(r => r.skillId === skillId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [returns, skillId]
  );

  // 统计
  const totalMoneyReturns = useMemo(() => {
    let sum = 0;
    for (const r of skillReturns) {
      if (r.moneyAmount) sum += extractMoney(r.moneyAmount);
    }
    return sum;
  }, [skillReturns]);

  const categoryStats = useMemo(() => {
    const map: Record<ReturnCategory, number> = {
      money: 0, emotion: 0, social: 0, health: 0, growth: 0, other: 0,
    };
    for (const r of skillReturns) {
      map[r.category]++;
    }
    return map;
  }, [skillReturns]);

  const resetForm = () => {
    setTitle('');
    setCategory('money');
    setDate(getTodayString());
    setMoneyAmount('');
    setDescription('');
    setNote('');
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    const ret: SkillReturn = {
      id: generateId(),
      skillId,
      title: title.trim(),
      category,
      date,
      moneyAmount: category === 'money' && moneyAmount.trim() ? moneyAmount.trim() : undefined,
      description: description.trim() || '',
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onAdd(ret);
    resetForm();
    setShowAdd(false);
  };

  const handleStartEdit = (ret: SkillReturn) => {
    setEditingReturn(ret);
    setTitle(ret.title);
    setCategory(ret.category);
    setDate(ret.date);
    setMoneyAmount(ret.moneyAmount || '');
    setDescription(ret.description);
    setNote(ret.note || '');
    setShowAdd(false);
    setSelectedReturn(null);
  };

  const handleSaveEdit = () => {
    if (!editingReturn || !title.trim()) return;
    const updated: SkillReturn = {
      ...editingReturn,
      title: title.trim(),
      category,
      date,
      moneyAmount: category === 'money' && moneyAmount.trim() ? moneyAmount.trim() : undefined,
      description: description.trim() || '',
      note: note.trim() || undefined,
    };
    onEdit(updated);
    setEditingReturn(null);
    resetForm();
  };

  const handleCancelEdit = () => {
    setEditingReturn(null);
    resetForm();
  };

  const handleDelete = (returnId: string) => {
    if (deleteConfirm === returnId) {
      onDelete(returnId);
      setDeleteConfirm(null);
      if (selectedReturn?.id === returnId) setSelectedReturn(null);
      if (editingReturn?.id === returnId) { setEditingReturn(null); resetForm(); }
    } else {
      setDeleteConfirm(returnId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // 按月份分组
  const returnsByMonth = useMemo(() => {
    const map: Record<string, SkillReturn[]> = {};
    for (const r of skillReturns) {
      const month = r.date.substring(0, 7);
      if (!map[month]) map[month] = [];
      map[month].push(r);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [skillReturns]);

  // 表单
  const renderForm = (isEdit: boolean) => (
    <div className="p-3 bg-[#fef9e7]/60 border-2 border-[#f39c12]/50 rounded mb-3 space-y-2">
      <div className="text-[8px] text-[#7d6608] font-pixel mb-1">
        {isEdit ? '✏️ 编辑收获' : '🌟 记录新收获'}
      </div>

      {/* 收获标题 */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="收获标题 *（如 接到了商业演出）"
        className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#f39c12]/30 rounded text-[#7d6608] placeholder-[#f39c12]/40 focus:outline-none focus:border-[#f39c12] font-pixel"
        onKeyDown={e => { if (e.key === 'Enter') { isEdit ? handleSaveEdit() : handleAdd(); } }}
      />

      {/* 收获类别 */}
      <div>
        <label className="text-[6px] text-[#7d6608] block mb-1">收获类别</label>
        <div className="flex flex-wrap gap-1.5">
          {RETURN_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={`px-2 py-1 text-[7px] rounded border-2 transition-colors ${
                category === cat.key
                  ? 'text-white border-transparent'
                  : 'bg-white/50 border-[#f39c12]/20 text-[#7d6608] hover:bg-[#fef9e7]'
              }`}
              style={category === cat.key ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 日期 + 金额（金钱类型时显示） */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[6px] text-[#7d6608] block mb-0.5">收获日期</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#f39c12]/30 rounded text-[#7d6608] focus:outline-none focus:border-[#f39c12] font-pixel"
          />
        </div>
        {category === 'money' && (
          <div className="flex-1">
            <label className="text-[6px] text-[#7d6608] block mb-0.5">金额</label>
            <input
              type="text"
              value={moneyAmount}
              onChange={e => setMoneyAmount(e.target.value)}
              placeholder="¥5000"
              className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#f39c12]/30 rounded text-[#7d6608] placeholder-[#f39c12]/40 focus:outline-none focus:border-[#f39c12] font-pixel"
            />
          </div>
        )}
      </div>

      {/* 详细描述 */}
      <div>
        <label className="text-[6px] text-[#7d6608] block mb-0.5">详细描述</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="描述一下这个收获..."
          rows={2}
          className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#f39c12]/30 rounded text-[#7d6608] placeholder-[#f39c12]/40 focus:outline-none focus:border-[#f39c12] font-pixel resize-none"
        />
      </div>

      {/* 备注 */}
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="备注（可选）"
        className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#f39c12]/30 rounded text-[#7d6608] placeholder-[#f39c12]/40 focus:outline-none focus:border-[#f39c12] font-pixel"
      />

      {/* 操作按钮 */}
      {isEdit ? (
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={!title.trim()}
            className={`pixel-btn flex-1 py-1.5 text-[8px] ${
              title.trim()
                ? 'bg-[#f39c12] text-white hover:bg-[#e67e22]'
                : 'bg-[#f5deb3]/50 text-[#f39c12]/40 cursor-not-allowed'
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
          disabled={!title.trim()}
          className={`pixel-btn w-full py-1.5 text-[8px] ${
            title.trim()
              ? 'bg-[#f39c12] text-white hover:bg-[#e67e22]'
              : 'bg-[#f5deb3]/50 text-[#f39c12]/40 cursor-not-allowed'
          }`}
        >
          ✅ 确认添加
        </button>
      )}
    </div>
  );

  /** 渲染收获条目 */
  const renderReturnItem = (ret: SkillReturn) => {
    const isSelected = selectedReturn?.id === ret.id;
    const catInfo = CATEGORY_MAP.get(ret.category);
    const moneyVal = ret.moneyAmount ? extractMoney(ret.moneyAmount) : 0;

    return (
      <div key={ret.id}>
        {/* 收获行 */}
        <div
          onClick={() => setSelectedReturn(isSelected ? null : ret)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[#f39c12]/15 border-2 border-[#f39c12]/40'
              : 'bg-[#fef9e7]/40 hover:bg-[#fef9e7]/70 border-2 border-transparent'
          }`}
        >
          <span className="text-base">{catInfo?.icon || '✨'}</span>
          <div className="flex-1 min-w-0">
            <span className="text-[8px] text-[#7d6608] truncate block">
              {ret.title}
            </span>
            <span className="text-[6px] text-[#b7950b]">
              {ret.date} · {catInfo?.label || '其他'}
            </span>
          </div>
          {moneyVal > 0 && (
            <span className="text-[7px] text-[#27ae60] shrink-0">+¥{moneyVal.toLocaleString()}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit(ret);
            }}
            className="text-[7px] px-1 shrink-0 text-[#f39c12] hover:text-[#e67e22]"
            title="编辑"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(ret.id);
            }}
            className={`text-[7px] px-1 shrink-0 ${
              deleteConfirm === ret.id ? 'text-[#ff0000]' : 'text-[#cd5c5c] hover:text-[#8b0000]'
            }`}
            title={deleteConfirm === ret.id ? '再次点击确认删除' : '删除'}
          >
            {deleteConfirm === ret.id ? '确认?' : '✕'}
          </button>
        </div>

        {/* 展开详情 */}
        {isSelected && (
          <div className="ml-2 mt-1 p-2.5 bg-[#fffde7] border-2 border-[#f39c12]/20 rounded space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{catInfo?.icon || '✨'}</span>
              <div>
                <h4 className="text-[10px] text-[#7d6608]">{ret.title}</h4>
                <p className="text-[7px] text-[#b7950b]">
                  {skillIcon} {skillName} 的{catInfo?.label || '收获'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#fef9e7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#b7950b]">📅 收获日期</p>
                <p className="text-[8px] text-[#7d6608]">{ret.date}</p>
              </div>
              <div className="bg-[#fef9e7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#b7950b]">🏷️ 类别</p>
                <p className="text-[8px] text-[#7d6608]">{catInfo?.icon} {catInfo?.label}</p>
              </div>
              {moneyVal > 0 && (
                <div className="bg-[#fef9e7]/60 p-1.5 rounded col-span-2">
                  <p className="text-[6px] text-[#b7950b]">💰 金额</p>
                  <p className="text-[8px] text-[#27ae60] font-pixel">+¥{moneyVal.toLocaleString()}</p>
                </div>
              )}
            </div>

            {ret.description && (
              <div className="bg-[#fef9e7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#b7950b]">📝 详细描述</p>
                <p className="text-[8px] text-[#7d6608]">{ret.description}</p>
              </div>
            )}

            {ret.note && (
              <div className="bg-[#fef9e7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#b7950b]">💬 备注</p>
                <p className="text-[8px] text-[#7d6608]">{ret.note}</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleStartEdit(ret)}
                className="pixel-btn flex-1 py-1 text-[7px] bg-[#f39c12] text-white hover:bg-[#e67e22]"
              >
                ✏️ 编辑此收获
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-3 border-t-2 border-[#f39c12]/20 pt-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowList(!showList)}
          className="text-[9px] text-[#7d6608] flex items-center gap-1"
        >
          <span>{showList ? '▼' : '▶'}</span>
          <span>🌟 技能复利</span>
          <span className="text-[7px] text-[#b7950b]">({skillReturns.length}项收获)</span>
          {totalMoneyReturns > 0 && (
            <span className="text-[7px] text-[#27ae60] ml-1">💰 +¥{totalMoneyReturns.toLocaleString()}</span>
          )}
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setEditingReturn(null); resetForm(); }}
          className={`pixel-btn px-2 py-1 text-[7px] ${showAdd ? 'bg-[#808080] text-white' : 'bg-[#f5deb3] text-[#7d6608]'}`}
        >
          {showAdd ? '✕ 取消' : '➕ 记录收获'}
        </button>
      </div>

      {/* 统计条 */}
      {showList && skillReturns.length > 0 && (
        <div className="mb-2 px-2 py-1.5 bg-[#fffde7] border-2 border-[#f39c12]/20 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] text-[#b7950b]">🌟 复利统计</span>
            <span className="text-[8px] text-[#f39c12] font-pixel">{skillReturns.length} 项收获</span>
          </div>
          {totalMoneyReturns > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[6px] text-[#b7950b]/70">💰 金钱收获总计</span>
              <span className="text-[7px] text-[#27ae60] font-pixel">+¥{totalMoneyReturns.toLocaleString()}</span>
            </div>
          )}
          {/* 类别分布 */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {RETURN_CATEGORIES.map(cat => {
              const count = categoryStats[cat.key];
              if (count === 0) return null;
              return (
                <span
                  key={cat.key}
                  className="text-[6px] px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon} {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 添加收获表单 */}
      {showAdd && !editingReturn && renderForm(false)}

      {/* 编辑收获表单 */}
      {editingReturn && renderForm(true)}

      {/* 收获列表（按月分组） */}
      {showList && returnsByMonth.length > 0 && (
        <div className="space-y-2">
          {returnsByMonth.map(([month, monthReturns]) => {
            const monthMoney = monthReturns.reduce((sum, r) => sum + (r.moneyAmount ? extractMoney(r.moneyAmount) : 0), 0);
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[7px] text-[#b7950b] font-pixel">📅 {month}</span>
                  <span className="text-[6px] text-[#b7950b]">
                    {monthReturns.length}项
                    {monthMoney > 0 && <span className="ml-1 text-[#27ae60]">+¥{monthMoney.toLocaleString()}</span>}
                  </span>
                </div>
                <div className="space-y-1">
                  {monthReturns.map(ret => renderReturnItem(ret))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 空状态 */}
      {showList && skillReturns.length === 0 && !showAdd && !editingReturn && (
        <div className="text-center py-3">
          <p className="text-[8px] text-[#b7950b]/50">🌟 暂无收获记录...</p>
          <p className="text-[6px] text-[#b7950b]/40 mt-1">记录这个技能带来的金钱、心情、人际关系等收获</p>
        </div>
      )}
    </div>
  );
}
