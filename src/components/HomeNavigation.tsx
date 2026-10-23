import React from 'react';
import { Tv, Smartphone, ShieldCheck, Sparkles, ArrowRight, Leaf, HelpCircle, Layers } from 'lucide-react';

interface HomeNavigationProps {
  onNavigate: (route: 'display' | 'wish' | 'admin') => void;
}

export const HomeNavigation: React.FC<HomeNavigationProps> = ({ onNavigate }) => {
  // Compute safe URLs for opening views in separate tabs (safe across GitHub Pages and custom subpaths)
  const displayTabUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '/display';
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    return `${window.location.origin}${cleanPath}/?view=display`;
  }, []);

  const wishTabUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '/wish';
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    return `${window.location.origin}${cleanPath}/?view=wish`;
  }, []);

  const adminTabUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '/admin';
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    return `${window.location.origin}${cleanPath}/?view=admin`;
  }, []);

  return (
    <div className="min-h-screen bg-[#092015] text-[#F7F5EB] flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gradient-to-b from-[#22C55E]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-gradient-to-t from-[#34D399]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#16A34A] to-[#22C55E] border border-[#86EFAC]/50 flex items-center justify-center text-white shadow-lg">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold font-display tracking-tight text-[#F7F5EB]">
              CÂY TRÀ NGUYỆN ƯỚC
            </div>
            <div className="text-[11px] text-[#34D399] tracking-widest uppercase font-mono font-medium">
              WISHING TREE EVENT SYSTEM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] animate-pulse" />
          <span className="text-[#A7F3D0]">Sẵn sàng vận hành sự kiện</span>
        </div>
      </header>

      {/* Main Hero & Navigation Hub */}
      <main className="max-w-6xl w-full mx-auto my-auto py-12 z-10 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A34A]/25 border border-[#34D399]/40 text-xs text-[#34D399] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trải nghiệm tương tác đa màn hình thời gian thực</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-[#F7F5EB] leading-tight">
            CÂY TRÀ NGUYỆN ƯỚC
          </h1>

          <p className="text-base text-white/80 leading-relaxed font-light">
            "Mỗi điều ước trở thành một chiếc lá. Cùng nhau, hàng ngàn điều ước kết thành cây cổ thụ gắn kết ý nghĩa."
          </p>
        </div>

        {/* 3 Main Target Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tile 1: Stage Display */}
          <div
            onClick={() => onNavigate('display')}
            className="group relative bg-[#0D3020]/90 hover:bg-[#13422C] border border-[#22C55E]/40 hover:border-[#34D399] rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#16A34A] text-white flex items-center justify-center border border-[#86EFAC]/50 shadow-inner group-hover:scale-110 transition-transform">
                <Tv className="w-6 h-6" />
              </div>

              <div>
                <div className="text-xs text-[#D7AE48] font-semibold tracking-wider uppercase">
                  MÀN HÌNH CHÍNH
                </div>
                <h2 className="text-xl font-bold font-display text-[#F7F5EB] mt-0.5">
                  Sân Khấu LED (2340 × 900)
                </h2>
              </div>

              <p className="text-xs text-white/70 leading-relaxed font-light">
                Giao diện ultra-wide cho màn hình LED sân khấu: Cây trà cổ thụ tương tác, mã QR quét gửi điều ước và luồng thông điệp trực tiếp.
              </p>
            </div>

            <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
              <a
                href={displayTabUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#4ADE80] border border-[#22C55E]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Mở màn hình sân khấu trong cửa sổ/tab riêng biệt để kết nối với màn hình LED ngoài sân khấu"
              >
                <span>Mở Tab Riêng Cho LED</span>
              </a>

              <div className="flex items-center gap-1 text-xs text-[#D7AE48] font-medium group-hover:text-white">
                <span>Vào màn hình</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Tile 2: Mobile Wish Submission */}
          <div
            onClick={() => onNavigate('wish')}
            className="group relative bg-[#122A1D]/90 hover:bg-[#183928] border border-[#F5A623]/40 hover:border-[#F5A623] rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(245,166,35,0.25)] cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFC72C] to-[#E69500] text-white flex items-center justify-center border border-[#FEF08A]/60 shadow-lg group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>

              <div>
                <div className="text-xs text-[#F5A623] font-bold tracking-wider uppercase">
                  DÀNH CHO NGƯỜI THAM DỰ (NAM A BANK GOLD)
                </div>
                <h2 className="text-xl font-bold font-display text-[#F7F5EB] mt-0.5">
                  Gửi Điều Ước Di Động
                </h2>
              </div>

              <p className="text-xs text-white/70 leading-relaxed font-light">
                Giao diện màu vàng sáng sang trọng Nam A Bank: Quét mã QR, chọn gợi ý hoặc viết điều ước gửi lên cây trà cổ thụ.
              </p>
            </div>

            <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
              <a
                href={wishTabUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg bg-[#F5A623]/20 hover:bg-[#F5A623]/30 text-[#F5A623] border border-[#F5A623]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Mở giao diện gửi điều ước trong tab mới"
              >
                <span>Mở Tab Riêng</span>
              </a>

              <div className="flex items-center gap-1 text-xs text-[#F5A623] font-bold group-hover:text-white">
                <span>Vào trang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Tile 3: Admin Dashboard */}
          <div
            onClick={() => onNavigate('admin')}
            className="group relative bg-[#0E281C]/90 hover:bg-[#143B29] border border-[#D7AE48]/30 hover:border-[#D7AE48] rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(215,174,72,0.25)] cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#174B35] text-[#D7AE48] flex items-center justify-center border border-[#D7AE48]/40 shadow-inner group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <div className="text-xs text-[#D7AE48] font-semibold tracking-wider uppercase">
                  BAN TỔ CHỨC
                </div>
                <h2 className="text-xl font-bold font-display text-[#F7F5EB] mt-0.5">
                  Bảng Điều Khiển Quản Trị
                </h2>
              </div>

              <p className="text-xs text-white/70 leading-relaxed font-light">
                Kiểm duyệt điều ước, bật/tắt duyệt tự động, xuất file CSV tiếng Việt cho Excel, cài đặt tiêu đề sự kiện và mô phỏng thử nghiệm.
              </p>
            </div>

            <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
              <a
                href={adminTabUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg bg-[#D7AE48]/20 hover:bg-[#D7AE48]/30 text-[#D7AE48] border border-[#D7AE48]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Mở giao diện quản trị trong tab mới"
              >
                <span>Mở Tab Riêng</span>
              </a>

              <div className="flex items-center gap-1 text-xs text-[#D7AE48] font-medium group-hover:text-white">
                <span>Vào trang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Event Operator Quick Specs */}
        <div className="bg-[#0B1E15]/60 border border-white/10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D7AE48]" />
            <span>Độ phân giải chuẩn sân khấu LED: <strong className="text-white font-mono">2340 × 900 px (2.6:1)</strong></span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Đồng bộ: WebSockets</span>
            <span>·</span>
            <span>Mã hóa: UTF-8 Tiếng Việt</span>
            <span>·</span>
            <span>Sức chứa: 1,000+ lá</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-white/40 z-10 pt-6 border-t border-white/5">
        Wishing Tree – Cây Trà Nguyện Ước © 2026. Giải pháp công nghệ sự kiện doanh nghiệp.
      </footer>
    </div>
  );
};
