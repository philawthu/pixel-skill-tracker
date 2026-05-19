import { useState } from 'react';
import type { SkillCategory } from '../types';
import { SKILL_ICONS, getDefaultCategoryId, generateId } from '../utils';

interface AddSkillModalProps {
  isOpen: boolean;
  categories: SkillCategory[];
  onClose: () => void;
  onAdd: (name: string, icon: string, categoryId: string) => void;
  onAddCategory: (category: SkillCategory) => void;
}

const PRESET_SKILLS = Object.keys(SKILL_ICONS);

const CAT_ICON_OPTIONS = ['🎯', '🔥', '💎', '🌟', '🎮', '🏆', '⚡', '🌈', '🦄', '🎪', '🚀', '🎵', '🎨', '📖', '🧪', '🌍'];
const CAT_COLOR_OPTIONS = [
  '#32cd32', '#ff69b4', '#4169e1', '#daa520',
  '#ff6347', '#9370db', '#20b2aa', '#ff8c00',
  '#cd5c5c', '#6495ed', '#3cb371', '#ba55d3',
];

export function AddSkillModal({ isOpen, categories, onClose, onAdd, onAddCategory }: AddSkillModalProps) {
  const [customName, setCustomName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎯');
  const [newCatColor, setNewCatColor] = useState('#32cd32');

  if (!isOpen) return null;

  const handleAddPreset = (name: string) => {
    const categoryId = getDefaultCategoryId(name);
    onAdd(name, SKILL_ICONS[name], categoryId);
    onClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    onAdd(customName.trim(), selectedIcon, selectedCategory || categories[0]?.id || 'cat-life');
    setCustomName('');
    setSelectedIcon('⭐');
    setSelectedCategory(categories[0]?.id || '');
    onClose();
  };

  const customIcons = ['⭐', '🎯', '🔥', '💎', '🌟', '🎮', '🏆', '⚡', '🌈', '🦄', '🎪', '🚀'];

  // 按分类分组预设技能
  const presetByCategory: Record<string, string[]> = {};
  for (const name of PRESET_SKILLS) {
    const catId = getDefaultCategoryId(name);
    if (!presetByCategory[catId]) presetByCategory[catId] = [];
    presetByCategory[catId].push(name);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="pixel-card p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[11px] text-[#3d2010]">✨ 添加新技能</h2>
          <button
            onClick={onClose}
            className="pixel-btn bg-[#cd5c5c] text-white px-2 py-1 text-[9px]"
          >
            ✕
          </button>
        </div>

        {/* Preset Skills - 按分类分组 */}
        <div className="mb-4">
          <h3 className="text-[9px] text-[#5c3a21] mb-2">预设技能：</h3>
          {categories.map(cat => {
            const catSkills = presetByCategory[cat.id];
            if (!catSkills || catSkills.length === 0) return null;
            return (
              <div key={cat.id} className="mb-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <span>{cat.icon}</span>
                  <span className="text-[8px] text-[#8b4513]">{cat.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {catSkills.map(name => (
                    <button
                      key={name}
                      onClick={() => handleAddPreset(name)}
                      className="pixel-btn bg-[#deb887] text-[#3d2010] px-2 py-2 text-[8px] flex flex-col items-center gap-1"
                    >
                      <span className="text-lg">{SKILL_ICONS[name]}</span>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-[#8b6914] my-4" />

        {/* Custom Skill */}
        <div>
          <h3 className="text-[9px] text-[#5c3a21] mb-2">自定义技能：</h3>

          {/* 分类选择 */}
          <div className="mb-3">
            <p className="text-[8px] text-[#8b4513] mb-1">选择分类：</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`pixel-btn px-2 py-1.5 text-[8px] flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'text-white'
                      : 'bg-[#f5deb3] text-[#5c3a21] hover:bg-[#deb887]'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: cat.color } : undefined}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
              {/* ＋ 新建分类按钮 */}
              <button
                onClick={() => setShowNewCategory(!showNewCategory)}
                className={`pixel-btn px-2 py-1.5 text-[8px] flex items-center gap-1 ${
                  showNewCategory
                    ? 'bg-[#daa520] text-white'
                    : 'bg-[#fff8dc] text-[#8b4513] hover:bg-[#f5deb3] border border-dashed border-[#8b4513]'
                }`}
              >
                <span>{showNewCategory ? '✕' : '＋'}</span>
                <span>{showNewCategory ? '收起' : '新建分类'}</span>
              </button>
            </div>

            {/* 内联新建分类表单 */}
            {showNewCategory && (
              <div className="mt-2 p-3 bg-[#fff8dc]/80 pixel-border-light">
                <p className="text-[8px] text-[#8b4513] mb-2 font-bold">✨ 新建分类</p>
                {/* 图标选择 */}
                <div className="mb-2">
                  <p className="text-[7px] text-[#8b4513] mb-1">图标：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAT_ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewCatIcon(icon)}
                        className={`text-base p-0.5 rounded ${
                          newCatIcon === icon
                            ? 'bg-[#daa520] shadow-inner'
                            : 'bg-[#f5deb3] hover:bg-[#deb887]'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 颜色选择 */}
                <div className="mb-2">
                  <p className="text-[7px] text-[#8b4513] mb-1">颜色：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAT_COLOR_OPTIONS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCatColor(color)}
                        className={`w-5 h-5 rounded-sm border-2 ${
                          newCatColor === color ? 'border-[#3d2010] scale-110' : 'border-[#8b4513]/30'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                {/* 名称输入 + 确认 */}
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 bg-[#fff8dc] border-2 border-[#5c3a21] px-2 py-1.5 flex-1">
                    <span className="text-base">{newCatIcon}</span>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="分类名称..."
                      className="flex-1 bg-transparent text-[8px] text-[#3d2010] placeholder-[#8b4513]/50 outline-none"
                      style={{ fontFamily: "'Press Start 2P', cursive" }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCatName.trim()) {
                          const newCat: SkillCategory = {
                            id: `cat-${generateId()}`,
                            name: newCatName.trim(),
                            icon: newCatIcon,
                            color: newCatColor,
                            isPreset: false,
                          };
                          onAddCategory(newCat);
                          setSelectedCategory(newCat.id);
                          setNewCatName('');
                          setNewCatIcon('🎯');
                          setNewCatColor('#32cd32');
                          setShowNewCategory(false);
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!newCatName.trim()) return;
                      if (categories.some(c => c.name === newCatName.trim())) return;
                      const newCat: SkillCategory = {
                        id: `cat-${generateId()}`,
                        name: newCatName.trim(),
                        icon: newCatIcon,
                        color: newCatColor,
                        isPreset: false,
                      };
                      onAddCategory(newCat);
                      setSelectedCategory(newCat.id);
                      setNewCatName('');
                      setNewCatIcon('🎯');
                      setNewCatColor('#32cd32');
                      setShowNewCategory(false);
                    }}
                    disabled={!newCatName.trim() || categories.some(c => c.name === newCatName.trim())}
                    className="pixel-btn bg-[#32cd32] text-white px-2 py-1.5 text-[8px] disabled:bg-[#808080] disabled:cursor-not-allowed"
                  >
                    ✓ 创建
                  </button>
                </div>
                {categories.some(c => c.name === newCatName.trim()) && newCatName.trim() && (
                  <p className="text-[7px] text-[#cd5c5c] mt-1">⚠️ 该分类名已存在</p>
                )}
              </div>
            )}
          </div>

          {/* Icon Selection */}
          <div className="mb-3">
            <p className="text-[8px] text-[#8b4513] mb-1">选择图标：</p>
            <div className="flex flex-wrap gap-2">
              {customIcons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`text-xl p-1 rounded ${
                    selectedIcon === icon
                      ? 'bg-[#daa520] shadow-inner'
                      : 'bg-[#f5deb3] hover:bg-[#deb887]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="技能名称..."
              className="flex-1 px-3 py-2 text-[9px] bg-[#fff8dc] border-3 border-[#5c3a21] text-[#3d2010] placeholder-[#8b4513]/50 outline-none"
              style={{ fontFamily: "'Press Start 2P', cursive" }}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
            />
            <button
              onClick={handleAddCustom}
              disabled={!customName.trim()}
              className="pixel-btn bg-[#32cd32] text-white px-3 py-2 text-[9px] disabled:bg-[#808080] disabled:cursor-not-allowed"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
