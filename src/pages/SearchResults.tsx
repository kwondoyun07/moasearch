import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { colors, font, radius, type MarketKey } from '../tokens';
import { defaultFilters } from '../data';
import type { Listing, SearchFilters } from '../types';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { BellIcon, CloseIcon, SearchIcon } from '../components/icons';
import { useWishlist } from '../lib/wishlist';
import { searchListings, type SortKey } from '../lib/search';

const SORTS: SearchFilters['sort'][] = ['최신순', '낮은 가격순', '인기순'];
const SORT_KEY: Record<SearchFilters['sort'], SortKey> = {
  최신순: 'latest',
  '낮은 가격순': 'price_asc',
  인기순: 'popular',
};
// RangeSlider 상한과 동일. priceMax 가 이 값 이상이면 '상한 없음'으로 보고 위쪽을 거르지 않는다
// (실매물은 3,000,000원을 넘을 수 있는데 슬라이더는 여기까지라, 최댓값을 무제한으로 해석).
const PRICE_CAP = 3_000_000;

interface Props {
  loggedIn?: boolean;
  initialQuery?: string;
  onHome?: () => void;
  onBell?: () => void;
  onLogin?: () => void;
  onOpenItem?: (item: Listing) => void;
  /** 검색 실행 시 호출 — 라우터가 URL(?q=) 을 갱신하도록. 없으면 내부 상태만 갱신. */
  onSearch?: (query: string) => void;
}

/**
 * Search results — top search bar, left filter rail, product grid.
 * 검색은 /api/search(Pages Function)를 호출하고, 무한 스크롤로 페이지를 이어 붙인다.
 * 정렬/필터는 현재까지 불러온 결과에 클라이언트 사이드로 적용된다.
 */
export const SearchResults: React.FC<Props> = ({ loggedIn, initialQuery, onHome, onBell, onLogin, onOpenItem, onSearch }) => {
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...defaultFilters,
    query: initialQuery?.trim() ? initialQuery.trim() : defaultFilters.query,
  }));
  const [draft, setDraft] = useState(filters.query);
  const { isLiked, toggle } = useWishlist();

  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false); // 첫 페이지 로딩
  const [loadingMore, setLoadingMore] = useState(false); // 다음 페이지 로딩
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const q = filters.query.trim();
  const sortKey = SORT_KEY[filters.sort];

  // URL 검색어(initialQuery)가 바뀌면(홈 검색·뒤로/앞으로 가기·검색어 비움) 내부 상태를 동기화한다.
  useEffect(() => {
    const next = initialQuery?.trim() ?? '';
    const sync = () => {
      setDraft(next);
      setFilters((f) => (f.query === next ? f : { ...f, query: next }));
    };
    sync();
  }, [initialQuery]);

  // 검색어 또는 정렬이 바뀌면 1페이지부터 새로 불러온다(이전 결과 초기화).
  useEffect(() => {
    let active = true;
    async function loadFirst() {
      if (!q) {
        if (active) {
          setResults([]);
          setHasMore(false);
          setError(null);
        }
        return;
      }
      pageRef.current = 1;
      if (active) {
        setResults([]);
        setHasMore(false);
        setError(null);
        setLoading(true);
      }
      try {
        const { results: list, hasMore: more } = await searchListings(q, 1, sortKey);
        if (active) {
          setResults(list);
          setHasMore(more);
        }
      } catch (e) {
        console.error(e);
        if (active) setError('검색에 실패했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFirst();
    return () => {
      active = false;
    };
  }, [q, sortKey]);

  // 다음 페이지를 불러와 누적(중복 id 제거).
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !q) return;
    setLoadingMore(true);
    const next = pageRef.current + 1;
    try {
      const { results: list, hasMore: more } = await searchListings(q, next, sortKey);
      pageRef.current = next;
      setResults((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...list.filter((x) => !seen.has(x.id))];
      });
      setHasMore(more);
    } catch (e) {
      console.error(e);
      setHasMore(false); // 더 못 불러오면 멈춤
    } finally {
      setLoadingMore(false);
    }
  }, [q, sortKey, hasMore, loading, loadingMore]);

  // 바닥 센티넬이 보이면 다음 페이지 로드.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const toggleMarket = (key: MarketKey) =>
    setFilters((f) => ({ ...f, markets: f.markets.map((m) => (m.key === key ? { ...m, selected: !m.selected } : m)) }));

  const setSort = (sort: SearchFilters['sort']) => setFilters((f) => ({ ...f, sort }));
  const setPrice = (priceMin: number, priceMax: number) => setFilters((f) => ({ ...f, priceMin, priceMax }));
  const runSearch = () => {
    const next = draft.trim() || filters.query;
    if (onSearch) onSearch(next);
    else setFilters((f) => ({ ...f, query: next }));
  };

  // 가격·마켓 필터는 프론트에서 적용한다(/api/search 는 검색어만 받음).
  const sorted = useMemo(() => {
    const selected = new Set(filters.markets.filter((m) => m.selected).map((m) => m.key));
    const list = results.filter(
      (it) =>
        selected.has(it.market) &&
        it.price >= filters.priceMin &&
        (filters.priceMax >= PRICE_CAP || it.price <= filters.priceMax),
    );
    if (filters.sort === '낮은 가격순') list.sort((a, b) => a.price - b.price);
    if (filters.sort === '인기순') list.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    return list;
  }, [results, filters.markets, filters.priceMin, filters.priceMax, filters.sort]);

  // 사이드바에 보여줄 마켓별 실제 개수(현재까지 불러온 결과 기준).
  const marketCounts = useMemo(() => {
    const c: Partial<Record<MarketKey, number>> = {};
    for (const it of results) {
      const k = it.market as MarketKey;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [results]);

  return (
    <div style={{ fontFamily: font.family, color: colors.ink, background: colors.bg, maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      {/* nav with search */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '18px 56px', borderBottom: `1px solid ${colors.line}` }}>
        <div onClick={onHome} style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.03em', cursor: 'pointer' }}>
          모아<span style={{ color: colors.yellowDeep }}>서치</span>
        </div>
        <div style={{ flex: 1, maxWidth: 640, display: 'flex', alignItems: 'center', height: 50, background: colors.field, borderRadius: 13, padding: '0 18px', gap: 11 }}>
          <SearchIcon size={20} color={colors.textFaint} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            placeholder="찾는 물건을 검색해 보세요"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: 16, color: colors.ink }}
          />
          {draft && (
            <span onClick={() => setDraft('')} style={{ display: 'inline-flex', cursor: 'pointer' }} aria-label="지우기">
              <CloseIcon />
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginLeft: 'auto' }}>
          <span onClick={onBell} style={{ display: 'inline-flex', cursor: 'pointer' }} aria-label="알림">
            <BellIcon />
          </span>
          {loggedIn ? (
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#F5C84C,#E5A600)' }} />
          ) : (
            <button onClick={onLogin} style={{ height: 38, padding: '0 18px', border: 0, borderRadius: radius.md, background: colors.ink, color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
              로그인
            </button>
          )}
        </div>
      </header>

      {/* body */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <FilterSidebar filters={filters} onToggleMarket={toggleMarket} onPriceChange={setPrice} counts={results.length ? marketCounts : undefined} />

        <main style={{ flex: 1, minWidth: 0, padding: '34px 48px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 30, letterSpacing: '-.03em', margin: 0 }}>{filters.query || '통합검색'}</h2>
              {q && (
                <div style={{ fontWeight: 600, fontSize: 14, color: colors.textMuted, marginTop: 8 }}>
                  총 <b style={{ color: colors.ink, fontWeight: 800, fontSize: 16 }}>{sorted.length.toLocaleString('ko-KR')}{hasMore ? '+' : ''}</b>건 ·{' '}
                  <span style={{ color: colors.gold }}>{filters.region.replace('서울 ', '')}</span> · {filters.priceMin.toLocaleString('ko-KR')}–{filters.priceMax.toLocaleString('ko-KR')}원
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 22, fontWeight: 700, fontSize: 14 }}>
              {SORTS.map((s) => {
                const active = filters.sort === s;
                return (
                  <span
                    key={s}
                    onClick={() => setSort(s)}
                    style={{
                      color: active ? colors.ink : colors.textGhost,
                      borderBottom: active ? `2.5px solid ${colors.yellow}` : '2.5px solid transparent',
                      paddingBottom: 6, cursor: 'pointer',
                    }}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '90px 0', textAlign: 'center', fontWeight: 600, fontSize: 15, color: colors.textFaint }}>
              검색 중…
            </div>
          ) : error && sorted.length === 0 ? (
            <div style={{ padding: '90px 0', textAlign: 'center', fontWeight: 600, fontSize: 15, color: '#E8453C' }}>
              {error}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '90px 0', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: colors.inkSoft }}>
                {!q ? '무엇을 찾고 계신가요?' : results.length > 0 ? '조건에 맞는 매물이 없어요' : '검색 결과가 없어요'}
              </div>
              <div style={{ fontWeight: 500, fontSize: 14, color: colors.textFaint, marginTop: 8 }}>
                {!q ? '위 검색창에 찾는 물건을 입력해 보세요' : results.length > 0 ? '가격·마켓 필터를 조정해 보세요' : '다른 검색어로 다시 시도해 보세요'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '26px 24px', marginTop: 30 }}>
                {sorted.map((item) => (
                  // content-visibility: 화면 밖 카드는 렌더를 건너뛰어 수천 개도 가볍게(가상 스크롤 대체).
                  <div key={item.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' } as React.CSSProperties}>
                    <ProductCard
                      item={item}
                      showLike
                      liked={isLiked(item)}
                      onClick={onOpenItem}
                      onToggleLike={toggle}
                    />
                  </div>
                ))}
              </div>

              {/* 무한 스크롤 센티넬 + 상태 */}
              <div ref={sentinelRef} style={{ height: 1 }} />
              <div style={{ padding: '26px 0 0', textAlign: 'center', fontWeight: 600, fontSize: 14, color: colors.textFaint }}>
                {loadingMore ? '더 불러오는 중…' : !hasMore ? '모든 결과를 불러왔어요' : ''}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
