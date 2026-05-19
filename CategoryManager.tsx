import { useState } from 'react';
import type { SkillCategory } from '../types';
import { generateId } from '../utils';

interface CategoryManagerProps {
  isOpen: boolean;
  categories: SkillCategory[];
  onClose: () => void;
  onAddCategory: (category: SkillCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const ICON_OPTIONS = ['🎯', '🔥', '💎', '🌟', '🎮', '🏆', '⚡', '🌈', '🦄', '🎪', '🚀', '🎵', '🎨', '📖', '🧪', '🌍'];
const COLOR_OPTIONS = [
  '#32cd32', '#ff69b4', '#4169e1', '#daa520',
  '#ff6347', '#9370db', '#20b2aa', '#ff8c00',
  '#cd5c5c', '#6495ed', '#3cb371', '#ba55d3',
];

export function CategoryManager({ isOpen, categories, onClose, onAddCategory, onDeleteCategory }: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newColor, setNewColor] = useState('#32cd32');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim()) return;
    // 检查重名
    if (categories.some(c => c.name === newName.trim())) return;

    const newCat: SkillCategory = {
      id: `cat-${generateId()}`,
      name: newName.trim(),
      icon: newIcon,
      color: newColor,
      isPreset: false,
    };
    onAddCategory(newCat);
    setNewName('');
    setNewIcon('🎯');
    setNewColor('#32cd32');
  };

  const handleDelete = (catId: string) => {
    if (deleteConfirm === catId) {
      onDeleteCategory(catId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(catId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="pixel-card p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[11px] text-[#3d2010]">⚙️ 管理技能分类</h2>
          <button
            onClick={onClose}
            className="pixel-btn bg-[#cd5c5c] text-white px-2 py-1 text-[9px]"
          >
            ✕
          </button>
        </div>

        {/* 现有分类列表 */}
        <div className="mb-4">
          <h3 className="text-[9px] text-[#5c3a21] mb-2">现有分类：</h3>
          <div className="space-y-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between bg-[#fff8dc] p-2 pixel-border-light"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-[9px] text-[#3d2010]">{cat.name}</span>
                  <div
                    className="w-3 h-3 rounded-sm border border-[#5c3a21]"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.isPreset && (
                    <span className="text-[6px] text-[#8b4513] bg-[#deb887] px-1 rounded-sm">预设</span>
                  )}
                </div>
                {!cat.isPreset && (
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className={`pixel-btn px-2 py-1 text-[7px] ${
                      deleteConfirm === cat.id
                        ? 'bg-[#ff0000] text-white'
                        : 'bg-[#cd5c5c] text-white'
                    }`}
                  >
                    {deleteConfirm === cat.id ? '确认删除?' : '删除'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t-2 border-dashed border-[#8b6914] my-4" />

        {/* 添加新分类 */}
        <div>
          <h3 className="text-[9px] text-[#5c3a21] mb-2">添加新分类：</h3>

          {/* 图标选择 */}
          <div className="mb-3">
            <p className="text-[8px] text-[#8b4513] mb-1">选择图标：</p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`text-xl p-1 rounded ${
                    newIcon === icon
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
          <div className="mb-3">
            <p className="text-[8px] text-[#8b4513] mb-1">选择颜色：</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-sm border-2 ${
                    newColor === color ? 'border-[#3d2010] scale-110' : 'border-[#8b4513]/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* 名称输入 + 添加按钮 */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1 bg-[#fff8dc] border-3 border-[#5c3a21] px-2 py-2 flex-1">
              <span className="text-lg">{newIcon}</span>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="分类名称..."
                className="flex-1 bg-transparent text-[9px] text-[#3d2010] placeholder-[#8b4513]/50 outline-none"
                style={{ fontFamily: "'Press Start 2P', cursive" }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
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
