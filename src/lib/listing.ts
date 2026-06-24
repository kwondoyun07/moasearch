/** 상품 상세(설명·이미지·판매자) — /api/listing 으로 원문에서 실시간 조회. */
export interface ListingDetail {
  description: string;
  images: string[];
  seller: { name: string; sub: string } | null;
}

export async function getListingDetail(url: string): Promise<ListingDetail> {
  const res = await fetch(`/api/listing?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`detail failed: ${res.status}`);
  return (await res.json()) as ListingDetail;
}
