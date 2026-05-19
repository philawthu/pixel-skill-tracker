import { useState, useMemo } from 'react';
import type { Equipment } from '../types';
import { generateId, getTodayString } from '../utils';

interface EquipmentPanelProps {
  skillId: string;
  skillName: string;
  skillIcon: string;
  equipments: Equipment[];
  onAdd: (equipment: Equipment) => void;
  onDelete: (equipmentId: string) => void;
  onEdit: (equipment: Equipment) => void;
}

// 预设装备图标
const EQUIP_ICONS = ['🎒', '👟', '🎽', '🏸', '🎾', '⚽', '🏀', '🎿', '🛹', '🥊', '🎸', '🎹', '📚', '💻', '🖊️', '📷', '🎨', '🧘', '🩰', '🎯', '🏋️', '🚴', '⌨️', '📱', '🎧', '🕶️', '🧢', '👕', '🩳', '🧤'];

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

export function EquipmentPanel({ skillId, skillName, skillIcon, equipments, onAdd, onDelete, onEdit }: EquipmentPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(true);
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingEquip, setEditingEquip] = useState<Equipment | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // 添加/编辑表单 state
  const [name, setName] = useState('');
  const [acquiredDate, setAcquiredDate] = useState(getTodayString());
  const [acquiredMethod, setAcquiredMethod] = useState('');
  const [price, setPrice] = useState('');
  const [icon, setIcon] = useState('🎒');
  const [note, setNote] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const skillEquipments = useMemo(() =>
    equipments.filter(e => e.skillId === skillId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [equipments, skillId]
  );

  // 当前装备 & 历史装备
  const currentEquipments = useMemo(() => skillEquipments.filter(e => !e.retired), [skillEquipments]);
  const historyEquipments = useMemo(() => skillEquipments.filter(e => e.retired), [skillEquipments]);

  // 价格计算
  const currentTotalPrice = useMemo(() => {
    let sum = 0;
    for (const e of currentEquipments) sum += extractPrice(e.price);
    return sum;
  }, [currentEquipments]);

  const historyTotalPrice = useMemo(() => {
    let sum = 0;
    for (const e of historyEquipments) sum += extractPrice(e.price);
    return sum;
  }, [historyEquipments]);

  const allTotalPrice = currentTotalPrice + historyTotalPrice;

  const resetForm = () => {
    setName('');
    setAcquiredDate(getTodayString());
    setAcquiredMethod('');
    setPrice('');
    setIcon('🎒');
    setNote('');
    setShowIconPicker(false);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const equipment: Equipment = {
      id: generateId(),
      skillId,
      name: name.trim(),
      acquiredDate,
      acquiredMethod: acquiredMethod.trim() || '未说明',
      price: price.trim() || '未填写',
      icon,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onAdd(equipment);
    resetForm();
    setShowAdd(false);
  };

  const handleStartEdit = (equip: Equipment) => {
    setEditingEquip(equip);
    setName(equip.name);
    setAcquiredDate(equip.acquiredDate);
    setAcquiredMethod(equip.acquiredMethod === '未说明' ? '' : equip.acquiredMethod);
    setPrice(equip.price === '未填写' ? '' : equip.price);
    setIcon(equip.icon);
    setNote(equip.note || '');
    setShowAdd(false);
    setSelectedEquip(null);
  };

  const handleSaveEdit = () => {
    if (!editingEquip || !name.trim()) return;
    const updated: Equipment = {
      ...editingEquip,
      name: name.trim(),
      acquiredDate,
      acquiredMethod: acquiredMethod.trim() || '未说明',
      price: price.trim() || '未填写',
      icon,
      note: note.trim() || undefined,
    };
    onEdit(updated);
    setEditingEquip(null);
    resetForm();
  };

  const handleCancelEdit = () => {
    setEditingEquip(null);
    resetForm();
  };

  const handleDelete = (equipId: string) => {
    if (deleteConfirm === equipId) {
      onDelete(equipId);
      setDeleteConfirm(null);
      if (selectedEquip?.id === equipId) setSelectedEquip(null);
      if (editingEquip?.id === equipId) { setEditingEquip(null); resetForm(); }
    } else {
      setDeleteConfirm(equipId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  /** 标记为历史装备 */
  const handleRetire = (equip: Equipment) => {
    onEdit({ ...equip, retired: true, retiredAt: new Date().toISOString() });
    if (selectedEquip?.id === equip.id) setSelectedEquip(null);
  };

  /** 从历史恢复为当前装备 */
  const handleRestore = (equip: Equipment) => {
    onEdit({ ...equip, retired: false, retiredAt: undefined });
    if (selectedEquip?.id === equip.id) setSelectedEquip(null);
  };

  // 当前 tab 对应的列表
  const displayList = activeTab === 'current' ? currentEquipments : historyEquipments;

  // 编辑/添加表单（共用）
  const renderForm = (isEdit: boolean) => (
    <div className="p-3 bg-[#faebd7]/60 border-2 border-[#daa520]/50 rounded mb-3 space-y-2">
      <div className="text-[8px] text-[#8b4513] font-pixel mb-1">
        {isEdit ? '✏️ 编辑装备' : '🎒 添加新装备'}
      </div>

      {/* 图标 + 名称 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowIconPicker(!showIconPicker)}
          className="text-xl w-8 h-8 flex items-center justify-center bg-[#fff8dc] border-2 border-[#8b4513]/30 rounded hover:border-[#daa520] transition-colors"
          title="选择图标"
        >
          {icon}
        </button>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="装备名称 *"
          className="flex-1 px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded text-[#3d2010] placeholder-[#8b4513]/40 focus:outline-none focus:border-[#daa520] font-pixel"
          onKeyDown={e => { if (e.key === 'Enter') { isEdit ? handleSaveEdit() : handleAdd(); } }}
        />
      </div>

      {/* 图标选择器 */}
      {showIconPicker && (
        <div className="flex flex-wrap gap-1 p-2 bg-[#fff8dc] border-2 border-[#8b4513]/20 rounded max-h-[80px] overflow-y-auto">
          {EQUIP_ICONS.map(ic => (
            <button
              key={ic}
              onClick={() => { setIcon(ic); setShowIconPicker(false); }}
              className={`text-base w-7 h-7 flex items-center justify-center rounded hover:bg-[#daa520]/30 ${icon === ic ? 'bg-[#daa520]/40 border border-[#daa520]' : ''}`}
            >
              {ic}
            </button>
          ))}
        </div>
      )}

      {/* 获得日期 + 价格 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[6px] text-[#8b4513] block mb-0.5">获得日期</label>
          <input
            type="date"
            value={acquiredDate}
            onChange={e => setAcquiredDate(e.target.value)}
            max={getTodayString()}
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded text-[#3d2010] focus:outline-none focus:border-[#daa520] font-pixel"
          />
        </div>
        <div className="flex-1">
          <label className="text-[6px] text-[#8b4513] block mb-0.5">价格</label>
          <input
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="¥199 / 免费"
            className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded text-[#3d2010] placeholder-[#8b4513]/40 focus:outline-none focus:border-[#daa520] font-pixel"
          />
        </div>
      </div>

      {/* 获得方式 */}
      <div>
        <label className="text-[6px] text-[#8b4513] block mb-0.5">获得方式</label>
        <input
          type="text"
          value={acquiredMethod}
          onChange={e => setAcquiredMethod(e.target.value)}
          placeholder="购买 / 比赛奖品 / 朋友赠送..."
          className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded text-[#3d2010] placeholder-[#8b4513]/40 focus:outline-none focus:border-[#daa520] font-pixel"
        />
      </div>

      {/* 备注 */}
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="备注（可选）"
        className="w-full px-2 py-1.5 text-[8px] bg-white/70 border-2 border-[#8b4513]/30 rounded text-[#3d2010] placeholder-[#8b4513]/40 focus:outline-none focus:border-[#daa520] font-pixel"
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
                : 'bg-[#d2b48c]/50 text-[#8b4513]/40 cursor-not-allowed'
            }`}
          >
            💾 保存修改
          </button>
          <button
            onClick={handleCancelEdit}
            className="pixel-btn flex-1 py-1.5 text-[8px] bg-[#cd853f] text-white hover:bg-[#a0693a]"
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
              ? 'bg-[#daa520] text-white hover:bg-[#b8860b]'
              : 'bg-[#d2b48c]/50 text-[#8b4513]/40 cursor-not-allowed'
          }`}
        >
          ✅ 确认添加
        </button>
      )}
    </div>
  );

  /** 渲染装备行 */
  const renderEquipItem = (equip: Equipment) => {
    const daysHeld = getDaysHeld(equip.acquiredDate);
    const isSelected = selectedEquip?.id === equip.id;
    const dailyCost = calcDailyCost(equip.price, daysHeld);
    const isRetired = !!equip.retired;

    return (
      <div key={equip.id}>
        {/* 装备行 */}
        <div
          onClick={() => setSelectedEquip(isSelected ? null : equip)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[#daa520]/20 border-2 border-[#daa520]/50'
              : isRetired
                ? 'bg-[#d3d3d3]/30 hover:bg-[#d3d3d3]/50 border-2 border-transparent'
                : 'bg-[#faebd7]/40 hover:bg-[#faebd7]/70 border-2 border-transparent'
          }`}
        >
          <span className={`text-base ${isRetired ? 'opacity-50' : ''}`}>{equip.icon}</span>
          <div className="flex-1 min-w-0">
            <span className={`text-[8px] truncate block ${isRetired ? 'text-[#8b8b8b] line-through' : 'text-[#3d2010]'}`}>
              {equip.name}
            </span>
            <span className="text-[6px] text-[#8b4513]/60">
              持有 {formatDaysHeld(daysHeld)}
            </span>
          </div>
          <span className={`text-[7px] shrink-0 ${isRetired ? 'text-[#a0a0a0]' : 'text-[#daa520]'}`}>{equip.price}</span>
          {/* 编辑按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit(equip);
            }}
            className="text-[7px] px-1 shrink-0 text-[#4169e1] hover:text-[#2c4fb8]"
            title="编辑装备"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(equip.id);
            }}
            className={`text-[7px] px-1 shrink-0 ${
              deleteConfirm === equip.id ? 'text-[#ff0000]' : 'text-[#cd5c5c] hover:text-[#8b0000]'
            }`}
            title={deleteConfirm === equip.id ? '再次点击确认删除' : '删除装备'}
          >
            {deleteConfirm === equip.id ? '确认?' : '✕'}
          </button>
        </div>

        {/* 装备详情（展开） */}
        {isSelected && (
          <div className="ml-2 mt-1 p-2.5 bg-[#fff8dc] border-2 border-[#daa520]/30 rounded space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{equip.icon}</span>
              <div>
                <h4 className={`text-[10px] ${isRetired ? 'text-[#8b8b8b]' : 'text-[#3d2010]'}`}>
                  {equip.name}
                  {isRetired && <span className="ml-1 text-[7px] text-[#a0a0a0]">(已封存)</span>}
                </h4>
                <p className="text-[7px] text-[#8b4513]">
                  {skillIcon} {skillName} 的装备
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#faebd7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#8b4513]/70">📅 获得日期</p>
                <p className="text-[8px] text-[#3d2010]">{equip.acquiredDate}</p>
              </div>
              <div className="bg-[#faebd7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#8b4513]/70">⏱️ 持有时间</p>
                <p className="text-[8px] text-[#3d2010]">{formatDaysHeld(daysHeld)}</p>
              </div>
              <div className="bg-[#faebd7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#8b4513]/70">🛒 获得方式</p>
                <p className="text-[8px] text-[#3d2010]">{equip.acquiredMethod}</p>
              </div>
              <div className="bg-[#faebd7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#8b4513]/70">💰 价格</p>
                <p className="text-[8px] text-[#3d2010]">{equip.price}</p>
              </div>
              <div className="bg-[#faebd7]/60 p-1.5 rounded col-span-2">
                <p className="text-[6px] text-[#8b4513]/70">📊 每日成本</p>
                <p className="text-[8px] text-[#3d2010]">{dailyCost}</p>
              </div>
            </div>

            {equip.note && (
              <div className="bg-[#faebd7]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#8b4513]/70">📝 备注</p>
                <p className="text-[8px] text-[#3d2010]">{equip.note}</p>
              </div>
            )}

            {isRetired && equip.retiredAt && (
              <div className="bg-[#f0e0e0]/60 p-1.5 rounded">
                <p className="text-[6px] text-[#8b4513]/70">📦 封存时间</p>
                <p className="text-[8px] text-[#8b8b8b]">{new Date(equip.retiredAt).toLocaleDateString('zh-CN')}</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleStartEdit(equip)}
                className="pixel-btn flex-1 py-1 text-[7px] bg-[#4169e1] text-white hover:bg-[#3158c0]"
              >
                ✏️ 编辑此装备
              </button>
              {isRetired ? (
                <button
                  onClick={() => handleRestore(equip)}
                  className="pixel-btn flex-1 py-1 text-[7px] bg-[#32cd32] text-white hover:bg-[#28a428]"
                >
                  ♻️ 恢复使用
                </button>
              ) : (
                <button
                  onClick={() => handleRetire(equip)}
                  className="pixel-btn flex-1 py-1 text-[7px] bg-[#808080] text-white hover:bg-[#666666]"
                >
                  📦 不再使用
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-3 border-t-2 border-[#8b4513]/20 pt-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowList(!showList)}
          className="text-[9px] text-[#3d2010] flex items-center gap-1"
        >
          <span>{showList ? '▼' : '▶'}</span>
          <span>🎒 背包</span>
          <span className="text-[7px] text-[#8b4513]">({skillEquipments.length}件装备)</span>
          {allTotalPrice > 0 && (
            <span className="text-[7px] text-[#daa520] ml-1">💰 总计 ¥{allTotalPrice.toFixed(0)}</span>
          )}
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setShowIconPicker(false); setEditingEquip(null); resetForm(); }}
          className={`pixel-btn px-2 py-1 text-[7px] ${showAdd ? 'bg-[#cd853f] text-white' : 'bg-[#deb887] text-[#3d2010]'}`}
        >
          {showAdd ? '✕ 取消' : '➕ 添加装备'}
        </button>
      </div>

      {/* 总价统计条 */}
      {showList && skillEquipments.length > 0 && allTotalPrice > 0 && (
        <div className="mb-2 px-2 py-1.5 bg-[#fff8dc] border-2 border-[#daa520]/30 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] text-[#8b4513]">💰 装备总价值（全部）</span>
            <span className="text-[9px] text-[#daa520] font-pixel">¥{allTotalPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[6px] text-[#8b4513]/70">当前装备</span>
            <span className="text-[7px] text-[#32cd32]">¥{currentTotalPrice.toFixed(2)}</span>
          </div>
          {historyTotalPrice > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[6px] text-[#8b4513]/70">历史装备</span>
              <span className="text-[7px] text-[#a0a0a0]">¥{historyTotalPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* 添加装备表单 */}
      {showAdd && !editingEquip && renderForm(false)}

      {/* 编辑装备表单 */}
      {editingEquip && renderForm(true)}

      {/* Tab 切换：当前装备 / 历史装备 */}
      {showList && skillEquipments.length > 0 && (
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`pixel-btn px-2.5 py-1 text-[7px] ${
              activeTab === 'current'
                ? 'bg-[#daa520] text-[#3d2010]'
                : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
            }`}
          >
            ⚔️ 当前装备 ({currentEquipments.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pixel-btn px-2.5 py-1 text-[7px] ${
              activeTab === 'history'
                ? 'bg-[#808080] text-white'
                : 'bg-[#e0e0e0] text-[#666] hover:bg-[#d0d0d0]'
            }`}
          >
            📦 历史装备 ({historyEquipments.length})
          </button>
        </div>
      )}

      {/* 装备列表 */}
      {showList && displayList.length > 0 && (
        <div className="space-y-1.5">
          {displayList.map(equip => renderEquipItem(equip))}
        </div>
      )}

      {/* 空状态 */}
      {showList && displayList.length === 0 && !showAdd && !editingEquip && (
        <div className="text-center py-3">
          {activeTab === 'current' ? (
            <>
              <p className="text-[8px] text-[#8b4513]/50">🎒 当前背包空空如也...</p>
              <p className="text-[6px] text-[#8b4513]/40 mt-1">点击"添加装备"记录你的装备</p>
            </>
          ) : (
            <>
              <p className="text-[8px] text-[#8b4513]/50">📦 暂无历史装备</p>
              <p className="text-[6px] text-[#8b4513]/40 mt-1">在当前装备中点击"不再使用"可将装备封存到此处</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
