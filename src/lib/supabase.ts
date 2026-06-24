import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // ⚠️ 빌드 시 env가 비면 createClient가 throw → 앱 전체가 하얀 화면이 된다.
  // 그래서 플레이스홀더로 대체해 앱은 정상 렌더되게 하고(검색은 동작, 로그인·찜만 비활성),
  // 콘솔로 강하게 경고한다. 배포 시 빌드 환경변수(VITE_SUPABASE_*)를 반드시 설정할 것.
  console.error(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 비어 있어요. ' +
      '배포 빌드 환경변수를 확인하세요 — 로그인·찜이 비활성화됩니다.',
  );
}

/** 앱 전역에서 쓰는 Supabase 클라이언트. anon 키는 공개돼도 RLS가 보호합니다. */
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key');
