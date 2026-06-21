import { useState } from 'react';
import {
  Home,
  SearchResults,
  Login,
  Notifications,
  Wishlist,
  PriceAlerts,
  ProductDetail,
} from './index';
import { AppHeader, type NavTarget } from './components/AppHeader';
import { allListings } from './data';
import type { Listing } from './types';
import { colors, font } from './tokens';

type Page = 'home' | 'search' | 'login' | 'wishlist' | 'alerts' | 'notifications' | 'detail';

/**
 * Application shell + router. The handoff bundle ships pages without a router,
 * so this wires them together with local state. Home is the entry point; its
 * header nav, search bar, and product cards drive navigation (no demo bar).
 */
export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [loggedIn, setLoggedIn] = useState(false);
  const [query, setQuery] = useState('아이폰 15 프로');
  const [detailItem, setDetailItem] = useState<Listing>(allListings[0]);
  const [backTo, setBackTo] = useState<Page>('search');
  const [returnTo, setReturnTo] = useState<Page>('home');

  const navTo = (target: NavTarget) => setPage(target);

  const goLogin = () => {
    setReturnTo(page);
    setPage('login');
  };

  const openDetail = (item: Listing) => {
    setDetailItem(item);
    setBackTo(page === 'detail' ? backTo : page);
    setPage('detail');
  };

  const doSearch = (q: string) => {
    if (q) setQuery(q);
    setPage('search');
  };

  const shellHeader = (active?: NavTarget) => ({
    active,
    loggedIn,
    onHome: () => setPage('home'),
    onNavigate: navTo,
    onBell: () => setPage('notifications'),
    onLogin: goLogin,
  });

  return (
    <div style={{ fontFamily: font.family, color: colors.ink, background: colors.bg, minHeight: '100vh' }}>
      {page === 'home' && (
        <Home
          loggedIn={loggedIn}
          onHome={() => setPage('home')}
          onNavigate={navTo}
          onSearch={doSearch}
          onBell={() => setPage('notifications')}
          onLogin={goLogin}
          onOpenItem={openDetail}
        />
      )}

      {page === 'search' && (
        <SearchResults
          loggedIn={loggedIn}
          initialQuery={query}
          onHome={() => setPage('home')}
          onBell={() => setPage('notifications')}
          onLogin={goLogin}
          onOpenItem={openDetail}
        />
      )}

      {page === 'login' && (
        <Login
          onHome={() => setPage('home')}
          onAuth={() => { setLoggedIn(true); setPage(returnTo); }}
        />
      )}

      {page === 'wishlist' && (
        <>
          <AppHeader {...shellHeader('wishlist')} />
          <Wishlist onOpen={openDetail} />
        </>
      )}

      {page === 'alerts' && (
        <>
          <AppHeader {...shellHeader('alerts')} />
          <PriceAlerts />
        </>
      )}

      {page === 'notifications' && (
        <>
          <AppHeader {...shellHeader()} />
          <Notifications />
        </>
      )}

      {page === 'detail' && (
        <>
          <AppHeader {...shellHeader()} />
          <ProductDetail
            item={detailItem}
            onBack={() => setPage(backTo)}
            onChat={(it) => window.alert(`${it.title} — 채팅 시작 (데모)`)}
          />
        </>
      )}
    </div>
  );
}
