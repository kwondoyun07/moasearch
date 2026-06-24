import type { Listing } from '../types';

/** 정렬 키 — /api/search 의 sort 파라미터. */
export type SortKey = 'latest' | 'price_asc' | 'popular';

export interface SearchResponse {
  query: string;
  page: number;
  sort: SortKey;
  count: number;
  results: Listing[];
  hasMore: boolean;
}

export interface SearchPage {
  results: Listing[];
  hasMore: boolean;
}

/**
 * 통합 검색 — 같은 도메인의 Pages Function(/api/search)을 호출한다.
 * 워커가 마켓들을 실시간으로 가져와 통합 결과를 돌려준다.
 * 무한 스크롤을 위해 page(1-based)를 받고, 다음 페이지 존재 여부(hasMore)도 함께 반환.
 * sort 는 서버에 전달되어(번개는 서버 정렬) 정렬된 항목이 앞 페이지에 오도록 한다.
 */
export async function searchListings(q: string, page = 1, sort: SortKey = 'latest'): Promise<SearchPage> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const data = (await res.json()) as SearchResponse;
  return { results: data.results ?? [], hasMore: !!data.hasMore };
}
