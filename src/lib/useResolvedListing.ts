import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { allListings } from '../data';
import { searchListings } from './search';
import { useWishlist } from './wishlist';
import type { Listing } from '../types';

export type ResolveStatus = 'ok' | 'loading' | 'notfound';

export interface ResolvedListing {
  item: Listing | null;
  status: ResolveStatus;
  /** 상세 URL 의 ?q= (검색 매물이면 채워짐). '목록으로' 폴백 등에 쓴다. */
  query?: string;
}

/**
 * /product/:id 의 매물을 해석한다. 우선순위:
 *  1) navigate state 로 전달된 item — 인앱 클릭 (즉시, 네트워크 없음)
 *  2) 데모 매물(allListings) — id 일치
 *  3) 내 찜목록(Supabase) — id 일치 → 찜 매물 새로고침 복원
 *  4) ?q= 가 있으면 /api/search 재조회 후 id 일치 → 검색 매물 새로고침·공유 복원
 * 어디에도 없으면 notfound. 마켓별 by-id 상세 API가 없어 재검색으로 복원하는 방식이라,
 * 매물이 이미 팔려 검색에서 사라졌으면 복원되지 않는다(graceful notfound).
 */
export function useResolvedListing(): ResolvedListing {
  const { id } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const { items: wishItems, loading: wishLoading } = useWishlist();

  // react-router 가 path param 을 이미 1회 디코딩하므로 추가 디코딩하지 않는다(이중 디코딩 방지).
  const key = id ?? '';
  const query = params.get('q')?.trim() || undefined;
  const stateItem = (location.state as { item?: Listing } | null)?.item;

  // 상세 URL 키는 검색 매물이면 id('bunjang-123'), 찜 매물이면 listingUrl(URL) 형태일 수 있어
  // 두 표현을 모두 비교한다(검색/찜 식별자 네임스페이스 불일치 흡수).
  const syncItem = useMemo(() => {
    const match = (l: Listing) => l.id === key || l.listingUrl === key;
    return stateItem ?? allListings.find(match) ?? wishItems.find(match) ?? null;
  }, [stateItem, key, wishItems]);

  // 동기 소스에 없고 ?q 가 있으면 재검색으로 복원.
  const [remote, setRemote] = useState<{ status: 'idle' | 'loading' | 'done'; item: Listing | null }>({
    status: 'idle',
    item: null,
  });

  useEffect(() => {
    let active = true;
    async function resolve() {
      if (syncItem || !query) {
        if (active) setRemote({ status: 'idle', item: null });
        return;
      }
      if (active) setRemote({ status: 'loading', item: null });
      try {
        const { results } = await searchListings(query);
        if (!active) return;
        const found = results.find((l) => l.id === key || l.listingUrl === key) ?? null;
        setRemote({ status: 'done', item: found });
      } catch {
        if (active) setRemote({ status: 'done', item: null });
      }
    }
    resolve();
    return () => {
      active = false;
    };
  }, [syncItem, query, key]);

  if (syncItem) return { item: syncItem, status: 'ok', query };
  if (query) {
    if (remote.status === 'done') {
      return remote.item ? { item: remote.item, status: 'ok', query } : { item: null, status: 'notfound', query };
    }
    return { item: null, status: 'loading', query }; // idle/loading — effect 가 해결할 때까지 대기
  }
  // ?q 없음: 찜목록 로딩이 끝날 때까지 기다렸다가 판단.
  if (wishLoading) return { item: null, status: 'loading', query };
  return { item: null, status: 'notfound', query };
}
