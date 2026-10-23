import React, { useEffect, useState, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize2, Minimize2, ExternalLink, Leaf } from 'lucide-react';
import { Wish, EventSettings } from '../types';
import { AncientTeaTree } from './AncientTeaTree';
import { api } from '../services/api';
import { useRealtimeEvent } from '../services/websocket';

interface StageDisplayProps {
  onNavigateToWish?: () => void;
  onNavigateToAdmin?: () => void;
}

export const StageDisplay: React.FC<StageDisplayProps> = ({
  onNavigateToWish,
  onNavigateToAdmin,
}) => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [latestWishId, setLatestWishId] = useState<string | null>(null);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  // Compute live submission URL (safe for GitHub Pages, custom subpaths, and root domains)
  const wishUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const cleanPath = window.location.pathname.replace(/\/+$/, '');
      const isGitHub = window.location.hostname.includes('github.io');
      if (isGitHub || cleanPath.split('/').length > 1) {
        return `${window.location.origin}${cleanPath}/?view=wish`;
      }
      return `${window.location.origin}/?view=wish`;
    }
    return 'https://wishingtree.event/wish';
  }, []);

  const displayUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const cleanPath = window.location.pathname.replace(/\/+$/, '');
      return `${window.location.host}${cleanPath}/?view=wish`;
    }
    return 'wishingtree.event/wish';
  }, []);

  // Fetch initial data
  useEffect(() => {
    const load = async () => {
      try {
        const [wishesRes, settingsRes] = await Promise.all([
          api.getApprovedWishes(),
          api.getSettings(),
        ]);
        setWishes(wishesRes.wishes);
        setSettings(settingsRes.settings);
      } catch (err) {
        console.error('Failed to load initial stage data:', err);
      }
    };
    load();
  }, []);

  // Real-time WebSocket Listeners
  useRealtimeEvent('wish:new_approved', (data: { wish: Wish; totalApproved: number }) => {
    if (!data?.wish) return;
    setWishes((prev) => {
      // Idempotent check
      if (prev.some((w) => w.id === data.wish.id)) return prev;
      return [data.wish, ...prev];
    });

    setLatestWishId(data.wish.id);

    // Scroll feed to top
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  useRealtimeEvent('wish:status_changed', (data: { wish: Wish; totalApproved: number }) => {
    if (!data?.wish) return;
    setWishes((prev) => {
      if (data.wish.status === 'approved') {
        const exists = prev.some((w) => w.id === data.wish.id);
        if (exists) {
          return prev.map((w) => (w.id === data.wish.id ? data.wish : w));
        } else {
          return [data.wish, ...prev];
        }
      } else {
        // If rejected, hidden, or pending, remove from stage display
        return prev.filter((w) => w.id !== data.wish.id);
      }
    });

    if (data.wish.status === 'approved') {
      setLatestWishId(data.wish.id);
    }
  });

  useRealtimeEvent('wish:deleted', (data: { id: string }) => {
    if (!data?.id) return;
    setWishes((prev) => prev.filter((w) => w.id !== data.id));
  });

  useRealtimeEvent('settings:updated', (newSettings: EventSettings) => {
    if (newSettings) setSettings(newSettings);
  });

  useRealtimeEvent('database:reset', (data: { settings: EventSettings; wishes: Wish[] }) => {
    if (data.settings) setSettings(data.settings);
    if (data.wishes) setWishes(data.wishes);
  });

  // Toggle Fullscreen for stage
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    window.addEventListener('fullscreenchange', handleFsChange);
    return () => window.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Smoothly scroll the selected wish into view in the right feed when selected on the tree
  useEffect(() => {
    if (selectedWishId && feedScrollRef.current) {
      const cardEl = document.getElementById(`wish-feed-card-${selectedWishId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedWishId]);

  // Format relative/absolute timestamp in Vietnamese
  const formatWishTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);

      if (diffSec < 45) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      ref={stageRef}
      className="relative w-screen h-screen bg-[#07150E] text-[#F7F5EB] overflow-hidden select-none flex flex-col justify-center items-center"
      onMouseMove={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {/* 
        Container locked to exact aspect ratio 2.6:1 (2340 x 900)
        On huge LED stages (2340x900 native), this fits 100% borderless!
      */}
      <div
        className="w-full h-full max-w-[2340px] max-h-[900px] flex flex-row overflow-hidden relative shadow-2xl"
        style={{
          aspectRatio: '2340 / 900',
        }}
      >
        {/* Full-width Panoramic Background Image of the Ancient Tea Tree and Landscape */}
        <img
          src="/assets/aistudio/C_y_Tr__C____i_Gi_a_V_ng_S_ng_C_ng_Ngh__427dcde2.png"
          alt="Cây Trà Nguyện Ước Cổ Thụ"
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none z-0"
        />

        {/* ========================================================
            LEFT PANEL: 15% (Approx 351px) — QR CODE & PARTICIPATION
            ======================================================== */}
        <section
          className="w-[15%] min-w-[280px] max-w-[380px] h-full flex flex-col p-6 z-10 border-r border-[#22C55E]/15 bg-gradient-to-b from-[#051D12]/35 via-[#03150D]/22 to-[#020E09]/35 backdrop-blur-sm shadow-2xl"
        >
          {/* Top: Header */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-2 text-[#34D399] text-xs font-semibold tracking-widest uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              <Leaf className="w-4 h-4 text-[#4ADE80]" />
              <span>CÂY TRÀ NGUYỆN ƯỚC</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#F7F5EB] font-display leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              GỬI ĐIỀU ƯỚC CỦA BẠN
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-[#22C55E] to-transparent mt-2" />
          </div>

          {/* QR Code & Instruction moved up close to the Header */}
          <div className="flex flex-col items-center">
            <div className="relative p-3.5 bg-[#FAF8F2] rounded-2xl border border-[#22C55E]/70 shadow-[0_0_35px_rgba(34,197,94,0.35)] transition-transform duration-300 hover:scale-[1.02]">
              <QRCodeSVG
                value={wishUrl}
                size={165}
                level="H"
                bgColor="#FAF8F2"
                fgColor="#0E2F20"
                className="w-full h-auto max-w-[170px] max-h-[170px]"
              />
            </div>

            {/* Instruction text */}
            <p className="mt-4 text-center text-sm font-semibold text-[#F7F5EB] leading-snug tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] px-1">
              Quét mã QR để gửi điều ước cho sự phát triển năng lực của người Nam A Bank hoặc bản thân và Đơn vị của mình
            </p>
          </div>
        </section>

        {/* ========================================================
            CENTER PANEL: 60% (Approx 1404px) — THE ANCIENT TEA TREE
            ======================================================== */}
        <main className="w-[60%] flex-1 h-full relative overflow-hidden z-10">
          {/* The Living Ancient Tea Tree Component (Center title block removed as requested) */}
          <AncientTeaTree
            wishes={wishes}
            latestWishId={latestWishId}
            selectedWishId={selectedWishId}
            onSelectWish={(w) => setSelectedWishId(w?.id || null)}
          />
        </main>

        {/* ========================================================
            RIGHT PANEL: 25% (Approx 585px) — LIVE WISH FEED
            ======================================================== */}
        <aside className="w-[25%] min-w-[360px] max-w-[580px] h-full flex flex-col p-6 z-10 border-l border-[#22C55E]/15 bg-gradient-to-b from-[#051D12]/35 via-[#03150D]/22 to-[#020E09]/35 backdrop-blur-sm shadow-2xl">
          {/* Feed Header (Wish count removed as requested) */}
          <div className="pb-3 border-b border-white/15 mb-4">
            <h2 className="text-lg font-bold text-[#F7F5EB] font-display tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              NHỮNG ĐIỀU ƯỚC ĐƯỢC GỬI ĐẾN
            </h2>
          </div>

          {/* Feed Message Cards Container */}
          <div
            ref={feedScrollRef}
            className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 stage-scrollbar"
          >
            {wishes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                <Leaf className="w-10 h-10 mb-2 opacity-40 text-[#4ADE80]" />
                <p className="text-sm font-medium">Chưa có điều ước nào.</p>
                <p className="text-xs mt-1">Hãy quét mã QR để gieo chiếc lá đầu tiên!</p>
              </div>
            ) : (
              wishes.map((wish) => {
                const isNew = wish.id === latestWishId;
                const isSelected = wish.id === selectedWishId;

                return (
                  <div
                    key={wish.id}
                    id={`wish-feed-card-${wish.id}`}
                    onClick={() => setSelectedWishId(isSelected ? null : wish.id)}
                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                      isSelected
                        ? 'bg-[#145637]/90 border-[#34D399] shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.01] backdrop-blur-sm'
                        : isNew
                        ? 'bg-[#165A39]/90 border-[#4ADE80] shadow-[0_0_25px_rgba(74,222,128,0.35)] animate-pulse backdrop-blur-sm'
                        : 'bg-[#062416]/55 hover:bg-[#0E3D27]/80 backdrop-blur-sm border-[#22C55E]/25 hover:border-[#34D399]/60 shadow-md'
                    }`}
                  >
                    {/* Top line: leaf icon & time (NO sender name as required) */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1.5 text-[#34D399] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
                        </svg>
                        <span className="text-[11px] font-semibold tracking-wide">
                          {isNew ? 'ĐIỀU ƯỚC MỚI VỪA TỚI' : 'LỜI NGUYỆN ƯỚC'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A7F3D0]/80 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {formatWishTime(wish.created_at)}
                      </span>
                    </div>

                    {/* Wish Content with balanced Vietnamese prose */}
                    <p className="text-sm text-[#F7F5EB] leading-relaxed break-words font-light drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      "{wish.message_content}"
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Floating Presentation Mode Toolbar (Fades in on mouse move, placed at bottom-left) */}
      <div
        className={`absolute bottom-4 left-6 z-50 flex items-center gap-2 p-1.5 rounded-full bg-[#0B1E15]/90 border border-[#D7AE48]/30 shadow-2xl backdrop-blur-md transition-opacity duration-300 ${
          showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình sân khấu (2340x900)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Quick link to Mobile Wish */}
        {onNavigateToWish && (
          <button
            onClick={onNavigateToWish}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Mở giao diện gửi điều ước di động"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}

        {/* Quick link to Admin */}
        {onNavigateToAdmin && (
          <button
            onClick={onNavigateToAdmin}
            className="text-[11px] px-2.5 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            Admin
          </button>
        )}
      </div>
    </div>
  );
};
