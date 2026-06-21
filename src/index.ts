/**
 * Public entry points for the Moa Search desktop design.
 *
 *   import { Home, SearchResults, Notifications, Wishlist,
 *            PriceAlerts, ProductDetail } from './moa-search';
 *
 * All pages depend only on React. Load Pretendard globally before rendering
 * (see README › Assets). Home and SearchResults render their own top nav;
 * Notifications / Wishlist / PriceAlerts / ProductDetail are
 * content-only and expect the shared header/shell around them.
 */
export { Home } from './pages/Home';
export { SearchResults } from './pages/SearchResults';
export { Login } from './pages/Login';
export { Notifications } from './pages/Notifications';
export { Wishlist } from './pages/Wishlist';
export { PriceAlerts } from './pages/PriceAlerts';
export { ProductDetail } from './pages/ProductDetail';

export { ProductCard } from './components/ProductCard';
export { MarketBadge } from './components/MarketBadge';
export { FilterSidebar } from './components/FilterSidebar';
export { Toggle } from './components/Toggle';
export { RangeSlider } from './components/RangeSlider';

export * from './tokens';
export * from './types';
export * as mockData from './data';
