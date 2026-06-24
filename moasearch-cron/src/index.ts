/**
 * 가격 알림 발동 Cron 워커 (별도 배포).
 *
 * Pages Functions는 cron 트리거가 없어 이 워커를 따로 둔다. 주기적으로(기본 30분)
 * Supabase의 enabled 가격알림을 읽어 /api/search 로 검색하고, 조건(가격 범위·마켓)에
 * 맞는 새 매물을 notifications 테이블에 적재한다. → 프론트 알림 페이지에 표시됨.
 *
 * 배포(사용자 작업):
 *   cd moasearch-cron
 *   npx wrangler deploy
 *   npx wrangler secret put SUPABASE_URL
 *   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # ⚠️ service_role 키(서버 전용, 프론트 금지)
 *   npx wrangler secret put SEARCH_API_URL              # 예: https://<프로젝트>.pages.dev/api/search
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SEARCH_API_URL: string;
}

interface AlertRow {
  id: string;
  user_id: string;
  keyword: string;
  target_min: number | null;
  target_price: number;
  markets: string[];
}

interface SearchItem {
  title: string;
  price: number;
  market: string;
  listingUrl?: string;
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env));
  },
};

function sb(env: Env, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

async function run(env: Env): Promise<void> {
  const res = await sb(env, 'price_alerts?enabled=eq.true&select=id,user_id,keyword,target_min,target_price,markets');
  const alerts = (await res.json()) as AlertRow[];

  for (const a of alerts) {
    try {
      const sres = await fetch(`${env.SEARCH_API_URL}?q=${encodeURIComponent(a.keyword)}&sort=price_asc&page=1`);
      const sdata = (await sres.json()) as { results?: SearchItem[] };
      const min = a.target_min ?? 0;
      const matches = (sdata.results ?? []).filter(
        (it) => !!it.listingUrl && a.markets.includes(it.market) && it.price >= min && it.price <= a.target_price,
      );

      for (const it of matches.slice(0, 5)) {
        // 이미 알림 보낸 매물은 건너뜀(notifications에 user_id+listing_url unique index 권장).
        const exRes = await sb(
          env,
          `notifications?user_id=eq.${a.user_id}&listing_url=eq.${encodeURIComponent(it.listingUrl as string)}&select=id&limit=1`,
        );
        const ex = (await exRes.json()) as unknown[];
        if (ex.length > 0) continue;

        await sb(env, 'notifications', {
          method: 'POST',
          body: JSON.stringify({
            user_id: a.user_id,
            type: 'price_alert',
            title: `‘${a.keyword}’ 조건에 맞는 매물이 올라왔어요`,
            body: `${it.title} · ${it.price.toLocaleString('ko-KR')}원`,
            listing_url: it.listingUrl,
            dot: '#F5C84C',
          }),
        });
      }
    } catch (e) {
      console.error('[alerts] 처리 실패', a.id, e);
    }
  }
}
