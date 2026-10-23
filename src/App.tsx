import { useState, useEffect } from 'react';
import { StageDisplay } from './components/StageDisplay';
import { MobileWishSubmission } from './components/MobileWishSubmission';
import { AdminDashboard } from './components/AdminDashboard';
import { HomeNavigation } from './components/HomeNavigation';
import { Tv, Smartphone, ShieldCheck, Home } from 'lucide-react';

type Route = 'home' | 'display' | 'wish' | 'admin';

function resolveRouteFromUrl(): Route {
  if (typeof window === 'undefined') return 'home';

  // 1. Check URL query parameters (?view=display or ?route=display)
  const searchParams = new URLSearchParams(window.location.search);
  const param = (searchParams.get('view') || searchParams.get('route') || searchParams.get('page') || '').toLowerCase();
  if (param === 'display') return 'display';
  if (param === 'wish') return 'wish';
  if (param === 'admin') return 'admin';

  // 2. Check URL hash (#/display, #display)
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
  if (hash === 'display') return 'display';
  if (hash === 'wish') return 'wish';
  if (hash === 'admin') return 'admin';

  // 3. Check pathname (extract last segment e.g. /display or /repo/display)
  const segments = window.location.pathname.toLowerCase().split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';
  if (lastSegment === 'display') return 'display';
  if (lastSegment === 'wish') return 'wish';
  if (lastSegment === 'admin') return 'admin';

  return 'home';
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => resolveRouteFromUrl());
  const [showNavSwitcher, setShowNavSwitcher] = useState(false);

  // Sync route with URL bar & browser history
  const navigateTo = (route: Route) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      const isGitHub = window.location.hostname.includes('github.io');
      const hasSearch = window.location.search.includes('view=') || window.location.search.includes('route=');
      const hasHash = !!window.location.hash;

      // On GitHub Pages or static host, use query param ?view= so refreshing or direct opening never triggers 404
      if (isGitHub || hasSearch || hasHash) {
        const url = new URL(window.location.href);
        if (route === 'home') {
          url.searchParams.delete('view');
          url.searchParams.delete('route');
          url.hash = '';
        } else {
          url.searchParams.set('view', route);
        }
        window.history.pushState({ route }, '', url.toString());
      } else {
        const newPath = route === 'home' ? '/' : `/${route}`;
        if (window.location.pathname !== newPath) {
          window.history.pushState({ route }, '', newPath);
        }
      }
    }
  };

  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentRoute(resolveRouteFromUrl());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#07150E] text-[#F7F5EB] font-sans relative">
      {/* Route Views */}
      {currentRoute === 'home' && (
        <HomeNavigation onNavigate={(r) => navigateTo(r)} />
      )}

      {currentRoute === 'display' && (
        <StageDisplay
          onNavigateToWish={() => navigateTo('wish')}
          onNavigateToAdmin={() => navigateTo('admin')}
        />
      )}

      {currentRoute === 'wish' && (
        <MobileWishSubmission
          onNavigateToDisplay={() => navigateTo('display')}
        />
      )}

      {currentRoute === 'admin' && (
        <AdminDashboard
          onNavigateToDisplay={() => navigateTo('display')}
          onNavigateToWish={() => navigateTo('wish')}
        />
      )}

      {/* Floating Quick Route Switcher (Hidden when on display/stage screen) */}
      {currentRoute !== 'display' && (
        <div
          className="fixed bottom-3 left-3 z-50 flex items-center"
          onMouseEnter={() => setShowNavSwitcher(true)}
          onMouseLeave={() => setShowNavSwitcher(false)}
        >
          <div
            className={`flex items-center gap-1.5 p-1 rounded-full bg-[#0B1E15]/95 border border-[#D7AE48]/30 shadow-2xl backdrop-blur-md transition-all duration-300 ${
              showNavSwitcher ? 'opacity-100 scale-100' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <button
              onClick={() => navigateTo('home')}
              className={`p-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                currentRoute === 'home'
                  ? 'bg-[#174B35] text-[#D7AE48] font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Trang chủ / Chọn giao diện"
            >
              <Home className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => navigateTo('display')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer text-white/60 hover:text-white hover:bg-white/10"
              title="Sân khấu LED (/display)"
            >
              <Tv className="w-3 h-3" />
              <span className="text-[11px]">Sân Khấu</span>
            </button>

            <button
              onClick={() => navigateTo('wish')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                currentRoute === 'wish'
                  ? 'bg-[#174B35] text-[#4ADE80] font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Gửi điều ước di động (/wish)"
            >
              <Smartphone className="w-3 h-3" />
              <span className="text-[11px]">Gửi Ước</span>
            </button>

            <button
              onClick={() => navigateTo('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                currentRoute === 'admin'
                  ? 'bg-[#174B35] text-[#D7AE48] font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Quản trị viên (/admin)"
            >
              <ShieldCheck className="w-3 h-3" />
              <span className="text-[11px]">Admin</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
