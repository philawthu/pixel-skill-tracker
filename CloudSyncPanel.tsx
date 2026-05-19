// src/components/CloudSyncPanel.tsx
// Cloud sync management panel — device code display, sync controls, restore from another device

import { useState, useEffect } from 'react';
import {
  getDeviceId,
  getDeviceName,
  setDeviceName,
  getLastSyncTime,
  getSyncVersion,
  uploadToCloud,
  downloadFromCloud,
  checkDeviceExists,
  type SyncData,
  type CloudData,
} from '../cloudSync';

interface CloudSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
  getCurrentData: () => SyncData;
  onRestoreData: (data: CloudData) => void;
}

export default function CloudSyncPanel({ isOpen, onClose, getCurrentData, onRestoreData }: CloudSyncPanelProps) {
  const [deviceId] = useState(getDeviceId);
  const [deviceName, setLocalDeviceName] = useState(getDeviceName);
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime());
  const [syncVersion, setSyncVersion] = useState(getSyncVersion());
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Restore from another device
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreChecking, setRestoreChecking] = useState(false);
  const [restorePreview, setRestorePreview] = useState<CloudData | null>(null);
  const [showRestore, setShowRestore] = useState(false);

  // Edit device name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(deviceName);

  // Copied state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLastSync(getLastSyncTime());
      setSyncVersion(getSyncVersion());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const data = getCurrentData();
      const result = await uploadToCloud(data);
      if (result.success) {
        setLastSync(result.lastSyncedAt || new Date().toISOString());
        setSyncVersion(result.dataVersion || syncVersion + 1);
        setSyncStatus({ type: 'success', message: '数据已同步到云端！' });
      } else {
        setSyncStatus({ type: 'error', message: result.error || '同步失败' });
      }
    } catch (e) {
      setSyncStatus({ type: 'error', message: e instanceof Error ? e.message : '未知错误' });
    }
    setSyncing(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(deviceId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setDeviceName(trimmed);
      setLocalDeviceName(trimmed);
    }
    setEditingName(false);
  };

  const handleCheckRestore = async () => {
    const code = restoreCode.toUpperCase().trim();
    if (code.length < 4) return;

    setRestoreChecking(true);
    setRestorePreview(null);

    const checkResult = await checkDeviceExists(code);
    if (!checkResult.exists) {
      setSyncStatus({ type: 'error', message: `设备码 "${code}" 未找到，请检查是否输入正确` });
      setRestoreChecking(false);
      return;
    }

    // Download full data for preview
    const downloadResult = await downloadFromCloud(code);
    if (downloadResult.success && downloadResult.data) {
      setRestorePreview(downloadResult.data);
      setSyncStatus(null);
    } else {
      setSyncStatus({ type: 'error', message: downloadResult.error || '获取数据失败' });
    }
    setRestoreChecking(false);
  };

  const handleConfirmRestore = () => {
    if (restorePreview) {
      onRestoreData(restorePreview);
      setRestorePreview(null);
      setShowRestore(false);
      setRestoreCode('');
      setSyncStatus({ type: 'success', message: '数据恢复成功！页面将使用云端数据。' });
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '从未同步';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="pixel-card p-4 w-full max-w-md max-h-[85vh] overflow-y-auto" style={{ backgroundColor: '#fef3c7' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-amber-900" style={{ fontFamily: '"Press Start 2P", cursive', fontSize: '10px' }}>
            ☁️ 云端同步
          </h2>
          <button onClick={onClose} className="text-amber-700 hover:text-red-600 text-lg font-bold">✕</button>
        </div>

        {/* Device ID Section */}
        <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#fde68a', border: '2px solid #d97706' }}>
          <div className="text-xs text-amber-800 mb-1 font-bold">📱 我的设备码</div>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-mono font-bold tracking-wider text-amber-900 select-all"
              style={{ fontFamily: '"Press Start 2P", cursive', fontSize: '14px', letterSpacing: '3px' }}
            >
              {deviceId}
            </span>
            <button
              onClick={handleCopyCode}
              className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <div className="text-xs text-amber-700 mt-1">
            换设备时输入此码即可恢复数据
          </div>

          {/* Device name */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-amber-700">设备名：</span>
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  className="px-1 py-0.5 text-xs border rounded w-24"
                  maxLength={20}
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-xs text-green-600">✓</button>
                <button onClick={() => setEditingName(false)} className="text-xs text-red-600">✕</button>
              </div>
            ) : (
              <span className="text-xs text-amber-900 cursor-pointer hover:underline" onClick={() => { setEditingName(true); setNameInput(deviceName); }}>
                {deviceName} ✏️
              </span>
            )}
          </div>
        </div>

        {/* Sync Status */}
        <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#d1fae5', border: '2px solid #059669' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-green-800">同步状态</span>
            <span className="text-xs text-green-600">v{syncVersion}</span>
          </div>
          <div className="text-xs text-green-700 mb-2">
            上次同步：{formatTime(lastSync)}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full py-2 px-3 rounded text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: syncing ? '#9ca3af' : '#059669' }}
          >
            {syncing ? '⏳ 同步中...' : '☁️ 立即同步到云端'}
          </button>
        </div>

        {/* Status message */}
        {syncStatus && (
          <div className={`mb-3 p-2 rounded text-xs ${syncStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {syncStatus.type === 'success' ? '✅' : '❌'} {syncStatus.message}
          </div>
        )}

        {/* Restore from another device */}
        <div className="mb-4">
          <button
            onClick={() => setShowRestore(!showRestore)}
            className="w-full py-2 px-3 rounded text-sm font-bold text-amber-800 border-2 border-amber-400 hover:bg-amber-100"
          >
            {showRestore ? '▼' : '▶'} 从其他设备恢复数据
          </button>

          {showRestore && (
            <div className="mt-2 p-3 rounded" style={{ backgroundColor: '#fff7ed', border: '2px solid #ea580c' }}>
              <div className="text-xs text-orange-800 mb-2">
                输入另一台设备的设备码，即可将其数据恢复到当前设备：
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={restoreCode}
                  onChange={e => setRestoreCode(e.target.value.toUpperCase())}
                  placeholder="输入设备码（如 ABC12345）"
                  className="flex-1 px-2 py-1 text-sm border rounded font-mono uppercase tracking-wider"
                  maxLength={8}
                  onKeyDown={e => e.key === 'Enter' && handleCheckRestore()}
                />
                <button
                  onClick={handleCheckRestore}
                  disabled={restoreChecking || restoreCode.length < 4}
                  className="px-3 py-1 text-xs rounded bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300"
                >
                  {restoreChecking ? '...' : '查询'}
                </button>
              </div>

              {/* Restore preview */}
              {restorePreview && (
                <div className="mt-2 p-2 rounded bg-white border">
                  <div className="text-xs font-bold text-green-700 mb-1">✅ 找到云端数据：</div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div>设备名：{restorePreview.deviceName}</div>
                    <div>技能数：{restorePreview.skills?.length || 0}</div>
                    <div>打卡记录：{restorePreview.checkinRecords?.length || 0} 条</div>
                    <div>装备：{restorePreview.equipments?.length || 0} 件</div>
                    <div>课程：{restorePreview.courses?.length || 0} 节</div>
                    <div>技能复利：{restorePreview.skillReturns?.length || 0} 条</div>
                    <div>同步时间：{new Date(restorePreview.lastSyncedAt).toLocaleString('zh-CN')}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleConfirmRestore}
                      className="flex-1 py-1.5 rounded text-xs font-bold bg-green-500 text-white hover:bg-green-600"
                    >
                      ✅ 确认恢复（覆盖当前数据）
                    </button>
                    <button
                      onClick={() => setRestorePreview(null)}
                      className="px-3 py-1.5 rounded text-xs bg-gray-200 hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-red-600">
                    ⚠️ 恢复将覆盖当前设备的所有数据！
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="p-2 rounded text-xs text-amber-700" style={{ backgroundColor: '#fef9c3' }}>
          <div className="font-bold mb-1">💡 使用说明</div>
          <ul className="space-y-0.5 list-disc pl-3">
            <li>每次打卡后建议点击「同步到云端」备份数据</li>
            <li>换设备/换浏览器时，用设备码恢复数据</li>
            <li>数据优先存在本地 localStorage，云端是备份</li>
            <li>设备码是你的唯一标识，请妥善保存</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
