import type { TitleUnlock } from '../types';

interface TitleUnlockModalProps {
  unlock: TitleUnlock | null;
  onClose: () => void;
}

export function TitleUnlockModal({ unlock, onClose }: TitleUnlockModalProps) {
  if (!unlock) return null;

  const isGold = unlock.level === 10;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="pixel-card p-6 text-center max-w-sm animate-level-up">
        {/* Sparkle Effect */}
        <div className="text-4xl mb-3 animate-pixel-sparkle">
          {isGold ? '👑' : '🏅'}
        </div>

        <h2 className="text-[12px] text-[#daa520] mb-2">
          {isGold ? '🎊 大师称号解锁！' : '🎉 称号解锁！'}
        </h2>

        <div className="mb-3">
          <span className={`pixel-badge ${isGold ? 'pixel-badge-gold' : 'pixel-badge-silver'} text-[10px]`}>
            {unlock.title}
          </span>
        </div>

        <p className="text-[8px] text-[#5c3a21] mb-1">
          技能「{unlock.skillName}」达到 Lv.{unlock.level}
        </p>
        <p className="text-[8px] text-[#8b4513] mb-4">
          {isGold
            ? '恭喜你成为大师！继续保持！'
            : '太棒了！继续努力冲向更高等级！'}
        </p>

        <button
          onClick={onClose}
          className="pixel-btn bg-[#daa520] text-[#3d2010] px-4 py-2 text-[9px]"
        >
          ⚔️ 继续冒险
        </button>
      </div>
    </div>
  );
}
