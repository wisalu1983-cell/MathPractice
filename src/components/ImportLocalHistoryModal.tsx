import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';

interface ImportLocalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  localUsers: User[];
  getLocalRecordCount: (userId: string) => number;
  onImportSelected: (selectedUserIds: string[]) => Promise<void>;
}

export const ImportLocalHistoryModal: React.FC<ImportLocalHistoryModalProps> = ({
  isOpen,
  onClose,
  localUsers,
  getLocalRecordCount,
  onImportSelected,
}) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelected({});
      setBusy(false);
      setMessage(null);
    }
  }, [isOpen]);

  const allSelected = useMemo(() => {
    const ids = localUsers.map(u => u.id);
    return ids.length > 0 && ids.every(id => selected[id]);
  }, [selected, localUsers]);

  const toggle = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      for (const u of localUsers) next[u.id] = true;
      setSelected(next);
    }
  };

  const handleImport = async () => {
    const ids = Object.keys(selected).filter(id => selected[id]);
    if (ids.length === 0) {
      setMessage('请先选择要导入的本地用户');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await onImportSelected(ids);
      setMessage('导入任务已提交，将自动开始同步');
    } catch (e: any) {
      setMessage(e?.message || '导入失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">导入本地历史到当前在线账号</h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
        </div>

        {localUsers.length === 0 ? (
          <div className="text-sm text-gray-600">未找到本地用户历史。</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">请选择要导入的本地用户，其历史记录将上传到当前在线账号。</div>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  全选
                </label>
              </div>
              {localUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input type="checkbox" checked={!!selected[u.id]} onChange={() => toggle(u.id)} />
                    <span>{u.name}</span>
                  </label>
                  <span className="text-xs text-gray-500">{getLocalRecordCount(u.id)} 条</span>
                </div>
              ))}
            </div>
            {message && (
              <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{message}</div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border text-gray-700">取消</button>
              <button onClick={handleImport} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-blue-300">
                {busy ? '导入中…' : '开始导入并同步'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


