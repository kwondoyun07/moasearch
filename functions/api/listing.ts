/**
 * GET /api/listing?url=<매물 원문 URL>
 *
 * 상품 상세(설명·이미지·판매자)를 마켓 원문에서 실시간 조회한다.
 * 허용된 4개 마켓 호스트만 받는다(SSRF 방지). 결과 300초 캐시.
 * 번개·헬로마켓·당근은 실데이터, 중고나라는 안정적 추출이 어려워 기본 폴백.
 */

interface ListingDetail {
  description: string;
  images: string[];
  seller: { name: string; sub: string } | null;
}

const EMPTY: ListingDetail = { description: '', images: [], seller: null };
const HEADERS = { 'user-agent': 'Mozilla/5.0 (compatible; MoaSearch/0.1)' };
const ALLOW = /^https:\/\/(m\.bunjang\.co\.kr|www\.hellomarket\.com|web\.joongna\.com|www\.daangn\.com)\//;

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const target = url.searchParams.get('url') ?? '';
  if (!ALLOW.test(target)) {
    return Response.json({ ...EMPTY, error: 'url 이 올바르지 않아요' }, { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(`https://moa-listing.cache/?u=${encodeURIComponent(target)}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let detail: ListingDetail = EMPTY;
  try {
    if (target.includes('m.bunjang.co.kr/products/')) {
      detail = await detailBunjang(target.split('/products/')[1].split(/[?#]/)[0]);
    } else if (target.includes('hellomarket.com/item/')) {
      detail = await detailHello(target.split('/item/')[1].split(/[?#]/)[0]);
    } else if (target.includes('daangn.com/')) {
      detail = await detailDaangn(target);
    }
    // joongna → 안정 추출 어려워 EMPTY 폴백(프론트가 기본 매물 정보로 표시)
  } catch (e) {
    console.error('[listing] 실패:', e);
  }

  const res = Response.json(detail, { headers: { 'cache-control': 'public, max-age=300' } });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
};

function extractBalancedJson(src: string, marker: string): string | null {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const start = src.indexOf('{', at);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = start; k < src.length; k++) {
    const c = src[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, k + 1); }
  }
  return null;
}

async function detailBunjang(pid: string): Promise<ListingDetail> {
  const r = await fetch(`https://api.bunjang.co.kr/api/pms/v3/products-detail/${pid}?viewerUid=-1`, { headers: HEADERS });
  if (!r.ok) throw new Error(`bunjang detail ${r.status}`);
  const d = (await r.json()) as { data?: { product?: Record<string, unknown> } };
  const p = d.data?.product ?? {};
  const tmpl = typeof p.imageUrl === 'string' ? p.imageUrl : '';
  const cnt = Math.min(Number(p.imageCount) || 1, 8);
  const images = tmpl
    ? Array.from({ length: cnt }, (_, i) => tmpl.replace('{cnt}', String(i + 1)).replace('{res}', '425'))
    : [];
  return { description: String(p.description ?? ''), images, seller: null };
}

async function detailHello(idx: string): Promise<ListingDetail> {
  const r = await fetch(`https://www.hellomarket.com/api/item/${idx}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`hello detail ${r.status}`);
  const d = (await r.json()) as { data?: Record<string, unknown> };
  const it = d.data ?? {};
  const imgs = Array.isArray(it.images) ? (it.images as Array<{ imageUrl?: string }>) : [];
  const images = imgs.map((x) => x.imageUrl).filter((u): u is string => !!u);
  const member = (it.member ?? {}) as { nickname?: string; name?: string };
  const name = member.nickname ?? member.name;
  return { description: String(it.description ?? ''), images, seller: name ? { name, sub: '헬로마켓 판매자' } : null };
}

async function detailDaangn(target: string): Promise<ListingDetail> {
  const r = await fetch(target, { headers: HEADERS });
  if (!r.ok) throw new Error(`daangn detail ${r.status}`);
  const raw = extractBalancedJson(await r.text(), '__remixContext');
  if (!raw) return EMPTY;
  const ctx = JSON.parse(raw) as { state?: { loaderData?: unknown } };

  // content(설명) + title + images 를 가진 article 객체를 재귀로 찾는다.
  let art: Record<string, unknown> | null = null;
  const dig = (n: unknown, depth = 0): void => {
    if (!n || typeof n !== 'object' || depth > 8 || art) return;
    const rec = n as Record<string, unknown>;
    if (typeof rec.content === 'string' && typeof rec.title === 'string' && 'images' in rec) {
      art = rec;
      return;
    }
    for (const v of Object.values(rec)) dig(v, depth + 1);
  };
  dig(ctx.state?.loaderData);
  if (!art) return EMPTY;
  const a = art as Record<string, unknown>;

  const rawImgs = Array.isArray(a.images) ? a.images : [];
  const images = rawImgs
    .map((x) => (typeof x === 'string' ? x : (x as { url?: string })?.url))
    .filter((u): u is string => !!u);
  const user = (a.user ?? {}) as { nickname?: string; temperature?: number; mannerTemperature?: number };
  const temp = user.temperature ?? user.mannerTemperature;
  const seller = user.nickname
    ? { name: user.nickname, sub: typeof temp === 'number' ? `매너온도 ${temp}°C` : '당근 판매자' }
    : null;
  return { description: String(a.content ?? ''), images, seller };
}
