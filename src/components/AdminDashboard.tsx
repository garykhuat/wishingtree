import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  EyeOff,
  Trash2,
  Download,
  PlusCircle,
  RotateCcw,
  Settings2,
  Tv,
  Lock,
  LogOut,
  RefreshCw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Leaf
} from 'lucide-react';
import { Wish, EventSettings, WishStats } from '../types';
import { api } from '../services/api';
import { useRealtimeEvent } from '../services/websocket';

interface AdminDashboardProps {
  onNavigateToDisplay?: () => void;
  onNavigateToWish?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToDisplay,
  onNavigateToWish,
}) => {
  // Authentication state (Session stored in sessionStorage)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Data state
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [stats, setStats] = useState<WishStats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    hidden: 0,
  });

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Bulk / Batch Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Settings Modal & Reset Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');

  // Password submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default organizer pass: caytra2026 or admin123
    if (passwordInput === 'caytra2026' || passwordInput === 'admin123' || passwordInput === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setAuthError(null);
    } else {
      setAuthError('Mật khẩu không chính xác. (Mặc định: caytra2026 hoặc admin123)');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
  };

  // Load admin data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [wishesRes, settingsRes] = await Promise.all([
        api.getAllWishes(),
        api.getSettings(),
      ]);
      setWishes(wishesRes.wishes);
      setSettings(settingsRes.settings);
      setStats(settingsRes.stats);
      setEditTitle(settingsRes.settings.event_title);
      setEditSubtitle(settingsRes.settings.event_subtitle);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Real-time updates for Admin
  useRealtimeEvent('wish:new_approved', (data: { wish: Wish }) => {
    if (!data?.wish) return;
    setWishes((prev) => {
      const exists = prev.some((w) => w.id === data.wish.id);
      if (exists) return prev.map((w) => (w.id === data.wish.id ? data.wish : w));
      return [data.wish, ...prev];
    });
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      approved: prev.approved + 1,
    }));
  });

  useRealtimeEvent('wish:new_pending', (data: { wish: Wish }) => {
    if (!data?.wish) return;
    setWishes((prev) => [data.wish, ...prev]);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      pending: prev.pending + 1,
    }));
  });

  useRealtimeEvent('wish:status_changed', (data: { wish: Wish }) => {
    if (!data?.wish) return;
    setWishes((prev) =>
      prev.map((w) => (w.id === data.wish.id ? data.wish : w))
    );
  });

  useRealtimeEvent('wishes:batch_updated', (data: { updated: Wish[] }) => {
    if (!data?.updated) return;
    const map = new Map(data.updated.map(w => [w.id, w]));
    setWishes(prev => prev.map(w => map.get(w.id) || w));
  });

  useRealtimeEvent('wishes:batch_deleted', (data: { ids: string[] }) => {
    if (!data?.ids) return;
    const set = new Set(data.ids);
    setWishes(prev => prev.filter(w => !set.has(w.id)));
  });

  useRealtimeEvent('settings:updated', (newSettings: EventSettings) => {
    if (newSettings) setSettings(newSettings);
  });

  // Action Handlers
  const handleStatusChange = async (id: string, newStatus: Wish['status']) => {
    setActionLoadingId(id);
    try {
      const updated = await api.updateWishStatus(id, newStatus);
      setWishes((prev) => prev.map((w) => (w.id === id ? updated : w)));
      const settingsRes = await api.getSettings();
      setStats(settingsRes.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Safe delete without window.confirm (works in any iframe)
  const handleDelete = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.deleteWish(id);
      setWishes((prev) => prev.filter((w) => w.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      const settingsRes = await api.getSettings();
      setStats(settingsRes.stats);
      setStatusMessage('Đã xóa điều ước thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Lỗi khi xóa điều ước. Vui lòng thử lại.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setActionLoadingId(null);
      setDeleteConfirmId(null);
    }
  };

  // Batch actions
  const handleBatchStatus = async (newStatus: Wish['status']) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBatchLoading(true);
    try {
      const updated = await api.batchUpdateStatus(ids, newStatus);
      const updatedMap = new Map(updated.map((w) => [w.id, w]));
      setWishes((prev) => prev.map((w) => updatedMap.get(w.id) || w));
      setSelectedIds(new Set());
      const settingsRes = await api.getSettings();
      setStats(settingsRes.stats);
      const label = newStatus === 'approved' ? 'duyệt' : newStatus === 'rejected' ? 'từ chối' : 'ẩn';
      setStatusMessage(`Đã ${label} ${ids.length} điều ước thành công.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Lỗi khi thực hiện thao tác hàng loạt.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBatchLoading(true);
    try {
      await api.batchDeleteWishes(ids);
      setWishes((prev) => prev.filter((w) => !selectedIds.has(w.id)));
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
      const settingsRes = await api.getSettings();
      setStats(settingsRes.stats);
      setStatusMessage(`Đã xóa vĩnh viễn ${ids.length} điều ước.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Lỗi khi xóa hàng loạt.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleToggleModeration = async () => {
    if (!settings) return;
    try {
      const updated = await api.updateSettings({
        moderation_enabled: !settings.moderation_enabled,
      });
      setSettings(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubmissions = async () => {
    if (!settings) return;
    try {
      const updated = await api.updateSettings({
        submissions_enabled: !settings.submissions_enabled,
      });
      setSettings(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateSettings({
        event_title: editTitle,
        event_subtitle: editSubtitle,
      });
      setSettings(updated);
      setShowSettingsModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeed = async (count: number) => {
    try {
      await api.seedWishes(count);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetData = async () => {
    try {
      await api.resetData();
      setShowResetModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered wishes list
  const filteredWishes = useMemo(() => {
    return wishes.filter((w) => {
      const matchesSearch =
        searchTerm === '' ||
        w.message_content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [wishes, searchTerm, statusFilter]);

  // If not logged in, show secure login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#092015] text-[#F7F5EB] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0D3020] border border-[#22C55E]/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#16A34A] border border-[#86EFAC] text-white flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-display text-[#F7F5EB]">
              BAN TỔ CHỨC SỰ KIỆN
            </h1>
            <p className="text-xs text-[#A7F3D0]/80">
              Khu vực quản trị điều ước và vận hành sân khấu
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">
                Mật khẩu quản trị
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full bg-[#072015] border border-white/20 focus:border-[#4ADE80] rounded-xl px-4 py-3 text-sm text-[#F7F5EB] focus:outline-none focus:ring-1 focus:ring-[#22C55E]"
                autoFocus
              />
              <p className="mt-1.5 text-[11px] text-white/50">
                Gợi ý cho ban tổ chức: <code className="text-[#34D399]">caytra2026</code> hoặc <code className="text-[#34D399]">admin123</code>
              </p>
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-500/30">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#16A34A] hover:bg-[#22C55E] text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-[#86EFAC]/40 transition-colors shadow-md cursor-pointer"
            >
              Đăng nhập quản trị
            </button>
          </form>

          <div className="pt-2 text-center">
            {onNavigateToDisplay && (
              <button
                onClick={onNavigateToDisplay}
                className="text-xs text-white/60 hover:text-[#4ADE80] transition-colors"
              >
                ← Quay lại màn hình sân khấu
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#092015] text-[#F7F5EB] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#22C55E]/30 bg-[#0D3020]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#16A34A] border border-[#86EFAC]/50 flex items-center justify-center text-white">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-display text-[#F7F5EB]">
                  {settings?.event_title || 'CÂY TRÀ NGUYỆN ƯỚC'}
                </h1>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#16A34A]/30 text-[#4ADE80] font-semibold border border-[#22C55E]/40">
                  QUẢN TRỊ
                </span>
              </div>
              <p className="text-xs text-[#A7F3D0]/80 hidden sm:block">
                Hệ thống kiểm duyệt & điều phối màn hình LED trực tiếp
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Direct Open in New Tab for Stage LED */}
            <a
              href="/display"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] border border-[#86EFAC]/50 shadow-md transition-all cursor-pointer"
              title="Mở màn hình sân khấu trong Tab mới để chiếu ra màn hình LED ngoài sân khấu"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Mở Sân Khấu (Tab riêng cho LED)</span>
            </a>

            {onNavigateToWish && (
              <a
                href="/wish"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                title="Mở trang gửi điều ước trong tab mới"
              >
                <span>Trang Gửi Lời Ước</span>
              </a>
            )}

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cài đặt sự kiện"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Controls & Statistics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stat 1: Total */}
          <div className="bg-[#0E281C] border border-white/10 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-white/50 font-medium">Tổng điều ước đã nhận</div>
            <div className="text-2xl font-bold text-[#F7F5EB] font-display mt-1 tabular-nums">
              {stats.total.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Bao gồm tất cả trạng thái
            </div>
          </div>

          {/* Stat 2: Approved (On Tree) */}
          <div className="bg-[#0E281C] border border-[#22C55E]/30 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-[#4ADE80] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span>Đã duyệt (Trên cây trà)</span>
            </div>
            <div className="text-2xl font-bold text-[#4ADE80] font-display mt-1 tabular-nums">
              {stats.approved.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Hiển thị trực tiếp sân khấu
            </div>
          </div>

          {/* Stat 3: Pending */}
          <div className="bg-[#0E281C] border border-[#D7AE48]/30 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-[#D7AE48] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D7AE48]" />
              <span>Chờ kiểm duyệt</span>
            </div>
            <div className="text-2xl font-bold text-[#D7AE48] font-display mt-1 tabular-nums">
              {stats.pending.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              {settings?.moderation_enabled
                ? 'Đang chờ quản trị viên duyệt'
                : 'Chế độ tự động duyệt đang bật'}
            </div>
          </div>

          {/* Stat 4: Event Moderation Switch Card */}
          <div className="bg-[#0E281C] border border-[#D7AE48]/40 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F7F5EB]">
                Chế độ kiểm duyệt
              </span>
              <button
                onClick={handleToggleModeration}
                className="cursor-pointer text-[#D7AE48] hover:text-[#FDE047] transition-colors"
                title="Bật/Tắt kiểm duyệt"
              >
                {settings?.moderation_enabled ? (
                  <ToggleRight className="w-7 h-7 text-[#D7AE48]" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-white/40" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-white/60 mt-1">
              {settings?.moderation_enabled ? (
                <span className="text-[#D7AE48] font-semibold">
                  BẬT: Phải duyệt trước khi lên cây
                </span>
              ) : (
                <span className="text-[#4ADE80] font-semibold">
                  TẮT: Tự động bay lên cây tức thì
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-[#0B1E15] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nội dung lời ước..."
              className="w-full bg-[#081810] border border-white/15 focus:border-[#D7AE48] rounded-lg pl-9 pr-4 py-2 text-xs text-[#F7F5EB] placeholder-white/40 focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#081810] p-1 rounded-lg border border-white/10 overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pending', label: 'Chờ duyệt' },
              { id: 'approved', label: 'Đã duyệt' },
              { id: 'rejected', label: 'Từ chối' },
              { id: 'hidden', label: 'Đã ẩn' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[#174B35] text-[#D7AE48] border border-[#D7AE48]/30 shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Action Buttons: Export, Seed, Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleSeed(10)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              title="Tạo 10 điều ước mẫu thực tế để thử nghiệm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D7AE48]" />
              <span className="hidden sm:inline">+10 Mẫu</span>
            </button>

            <button
              onClick={() => handleSeed(30)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#4ADE80] bg-[#4ADE80]/10 hover:bg-[#4ADE80]/20 border border-[#4ADE80]/30 transition-colors cursor-pointer"
              title="Tạo thêm 30 điều ước mẫu để thử nghiệm tán cây đông người (~60 người)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span className="hidden sm:inline">+30 Mẫu (~60 người)</span>
            </button>

            {/* Excel / CSV Export with Vietnamese UTF-8 BOM */}
            <button
              onClick={() => api.downloadCsv(filteredWishes)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] border border-[#86EFAC]/40 shadow-sm transition-all cursor-pointer"
              title="Xuất file Excel / CSV đọc được tiếng Việt chuẩn Unicode UTF-8 BOM"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Xuất Excel / CSV (Tiếng Việt)</span>
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Đặt lại dữ liệu sự kiện"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Toast Notification */}
        {statusMessage && (
          <div className="bg-[#103E29] border border-[#4ADE80]/50 text-[#D1FAE5] text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-ping" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* BATCH ACTION TOOLBAR (Appears when items are selected) */}
        {selectedIds.size > 0 && (
          <div className="bg-[#0E3523] border border-[#34D399]/60 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-xs font-medium text-[#F7F5EB]">
                Đã chọn <strong className="text-sm font-bold text-[#34D399] tabular-nums">{selectedIds.size}</strong> điều ước:
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleBatchStatus('approved')}
                disabled={isBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Duyệt hàng loạt ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => handleBatchStatus('rejected')}
                disabled={isBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700/80 hover:bg-amber-600 text-amber-100 text-xs font-semibold border border-amber-500/40 shadow transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Từ chối hàng loạt ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => handleBatchStatus('hidden')}
                disabled={isBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ẩn khỏi sân khấu ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={isBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/90 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-500/50 shadow transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hàng loạt ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Wishes Table */}
        <div className="bg-[#0B1E15] border border-white/10 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#081810] text-white/70 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={filteredWishes.length > 0 && filteredWishes.every((w) => selectedIds.has(w.id))}
                      onChange={() => {
                        const allSelected = filteredWishes.length > 0 && filteredWishes.every((w) => selectedIds.has(w.id));
                        if (allSelected) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(filteredWishes.map((w) => w.id)));
                        }
                      }}
                      className="w-4 h-4 rounded accent-[#22C55E] cursor-pointer"
                      title="Chọn tất cả điều ước đang hiển thị"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold w-32">Thời gian</th>
                  <th className="py-3 px-4 font-semibold">Nội dung điều ước</th>
                  <th className="py-3 px-4 font-semibold w-28 text-center">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold w-48 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredWishes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/40">
                      Không tìm thấy điều ước nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredWishes.map((w) => {
                    const isSelected = selectedIds.has(w.id);
                    const timeStr = new Date(w.created_at).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    });

                    return (
                      <tr
                        key={w.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#144A32]/60'
                            : 'hover:bg-[#102B1E]/60'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(w.id)) next.delete(w.id);
                                else next.add(w.id);
                                return next;
                              });
                            }}
                            className="w-4 h-4 rounded accent-[#22C55E] cursor-pointer"
                          />
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-3 text-white/60 font-mono whitespace-nowrap">
                          {timeStr}
                        </td>

                        {/* Content */}
                        <td className="py-3.5 px-4 text-[#F7F5EB] font-light max-w-md break-words">
                          "{w.message_content}"
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                              w.status === 'approved'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                : w.status === 'pending'
                                ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                                : w.status === 'rejected'
                                ? 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                                : 'bg-slate-900/60 text-slate-400 border-slate-700'
                            }`}
                          >
                            {w.status === 'approved' && 'Đã duyệt'}
                            {w.status === 'pending' && 'Chờ duyệt'}
                            {w.status === 'rejected' && 'Từ chối'}
                            {w.status === 'hidden' && 'Đã ẩn'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {w.status !== 'approved' && (
                              <button
                                onClick={() => handleStatusChange(w.id, 'approved')}
                                disabled={actionLoadingId === w.id}
                                className="px-2 py-1 rounded bg-[#174B35] hover:bg-[#206346] text-[#4ADE80] font-medium transition-colors cursor-pointer border border-[#22C55E]/30"
                                title="Phê duyệt đưa lên cây trà"
                              >
                                <Check className="w-3.5 h-3.5 inline mr-1" />
                                Duyệt
                              </button>
                            )}

                            {w.status !== 'rejected' && (
                              <button
                                onClick={() => handleStatusChange(w.id, 'rejected')}
                                disabled={actionLoadingId === w.id}
                                className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors cursor-pointer border border-rose-500/30"
                                title="Từ chối điều ước này"
                              >
                                <X className="w-3.5 h-3.5 inline mr-0.5" />
                                Từ chối
                              </button>
                            )}

                            {w.status === 'approved' && (
                              <button
                                onClick={() => handleStatusChange(w.id, 'hidden')}
                                disabled={actionLoadingId === w.id}
                                className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Tạm ẩn khỏi sân khấu"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteConfirmId(w.id)}
                              disabled={actionLoadingId === w.id}
                              className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Xóa vĩnh viễn điều ước này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Single Wish Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E281C] border border-rose-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F7F5EB]">Xóa điều ước?</h3>
                <p className="text-xs text-white/60">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/10 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoadingId === deleteConfirmId}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow cursor-pointer"
              >
                {actionLoadingId === deleteConfirmId ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Delete */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E281C] border border-rose-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F7F5EB]">Xóa hàng loạt?</h3>
                <p className="text-xs text-white/60">
                  Xóa vĩnh viễn <strong className="text-rose-300 font-bold">{selectedIds.size}</strong> điều ước đã chọn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/10 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={isBatchLoading}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow cursor-pointer"
              >
                {isBatchLoading ? 'Đang xóa...' : `Xác nhận xóa (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E281C] border border-[#D7AE48]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-[#F7F5EB] font-display">
                Cài đặt sự kiện & Sân khấu
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Tiêu đề sự kiện
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#081810] border border-white/20 rounded-lg p-2.5 text-xs text-[#F7F5EB] focus:outline-none focus:border-[#D7AE48]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Thông điệp phụ sự kiện
                </label>
                <textarea
                  rows={2}
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full bg-[#081810] border border-white/20 rounded-lg p-2.5 text-xs text-[#F7F5EB] focus:outline-none focus:border-[#D7AE48]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-medium text-white/90">
                    Cổng nhận điều ước
                  </div>
                  <div className="text-[11px] text-white/50">
                    Bật để người tham dự gửi điều ước từ điện thoại
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSubmissions}
                  className="cursor-pointer text-[#D7AE48]"
                >
                  {settings?.submissions_enabled ? (
                    <ToggleRight className="w-8 h-8 text-[#4ADE80]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-white/40" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-xs rounded-lg text-white/70 hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#2F7047] hover:bg-[#378453] text-[#F7F5EB] rounded-lg border border-[#D7AE48]/40 transition-colors cursor-pointer"
                >
                  Lưu cài đặt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E281C] border border-red-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F7F5EB]">
                Xác nhận đặt lại dữ liệu?
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Hành động này sẽ xóa các điều ước đã gửi và khôi phục về danh sách điều ước mẫu ban đầu.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-white/80 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-red-700 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
