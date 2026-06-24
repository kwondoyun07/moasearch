import React, { useRef, useState } from 'react';
import { colors, font, markets, type MarketKey } from '../tokens';
import { supabase } from '../lib/supabase';

const MK_ORDER: MarketKey[] = ['danggn', 'bunjang', 'joonggo', 'hello', 'secondwear'];

interface Props {
  /** Brand logo / exit back to the app. */
  onHome?: () => void;
  /** Fired after a successful login or signup. */
  onAuth?: () => void;
}

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 50, background: colors.field, border: 0, borderRadius: 13,
  padding: '0 15px', fontSize: 14.5, fontFamily: 'inherit', outline: 'none', color: colors.ink,
};
const label: React.CSSProperties = { fontWeight: 600, fontSize: 12.5, color: colors.textMuted, marginBottom: 8 };
const socialBtn: React.CSSProperties = {
  flex: 1, height: 50, border: `1.5px solid ${colors.border}`, borderRadius: 13, background: '#fff',
  fontWeight: 700, fontSize: 14, color: colors.inkSoft, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
};

/**
 * 로그인 / 회원가입 — full-screen auth split: brand panel + floating card with
 * tabbed login/signup, social buttons, and a transient toast. Self-contained;
 * call onAuth() on success and onHome() to leave.
 */
export const Login: React.FC<Props> = ({ onHome, onAuth }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const login = mode === 'login';

  const flash = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2200);
  };
  const flashSoon = () => flash('준비 중인 기능이에요');

  // Supabase 영문 에러를 사용자용 한국어로 변환.
  const friendly = (msg: string): string => {
    if (/invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않아요';
    if (/already registered|already exists/i.test(msg)) return '이미 가입된 이메일이에요';
    if (/at least 6/i.test(msg)) return '비밀번호는 6자 이상이어야 해요';
    if (/valid email|invalid email/i.test(msg)) return '이메일 형식이 올바르지 않아요';
    return msg;
  };

  const submit = async () => {
    if (busy) return;
    if (!login && !nickname.trim()) return flash('닉네임을 입력해 주세요');
    if (!email.trim()) return flash('이메일을 입력해 주세요');
    if (!password) return flash('비밀번호를 입력해 주세요');
    if (!login && !agree) return flash('약관에 동의해 주세요');

    setBusy(true);
    try {
      if (login) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return flash(friendly(error.message));
        flash('로그인되었어요');
        window.setTimeout(() => onAuth?.(), 600);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nickname: nickname.trim() } },
        });
        if (error) return flash(friendly(error.message));
        if (data.session) {
          // 이메일 인증 OFF → 즉시 로그인 상태
          flash('회원가입 완료! 환영해요');
          window.setTimeout(() => onAuth?.(), 600);
        } else {
          // 이메일 인증 ON → 메일 확인 필요
          flash('인증 메일을 보냈어요. 메일함을 확인해 주세요');
          setMode('login');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // 카카오 OAuth (Supabase 내장 제공). Supabase 대시보드에서 Kakao Provider 설정 필요.
  const kakaoLogin = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/main` },
    });
    if (error) {
      flash(friendly(error.message));
      setBusy(false);
    }
    // 성공 시 카카오로 리다이렉트되므로 setBusy 불필요.
  };

  const activeTab: React.CSSProperties = { color: colors.ink, borderBottom: `2.5px solid ${colors.ink}` };
  const idleTab: React.CSSProperties = { color: colors.textGhost, borderBottom: '2.5px solid transparent' };

  return (
    <div style={{ fontFamily: font.family, minHeight: '100vh', background: colors.ink, color: colors.ink, display: 'flex', alignItems: 'center', padding: '40px 8vw', position: 'relative', overflow: 'hidden' }}>
      {/* brand panel */}
      <div style={{ flex: 1, color: '#fff', position: 'relative', zIndex: 2 }}>
        <div onClick={onHome} style={{ display: 'inline-block', fontWeight: 800, fontSize: 24, letterSpacing: '-.03em', cursor: 'pointer' }}>
          모아<span style={{ color: colors.yellow }}>서치</span>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 52, lineHeight: 1.1, letterSpacing: '-.04em', margin: '24px 0 0' }}>
          중고 5곳을,<br />
          <span style={{ background: colors.yellow, color: colors.ink, padding: '0 11px', borderRadius: 8, WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>한 번에 모아서.</span>
        </h1>
        <p style={{ fontWeight: 500, fontSize: 17, color: '#A8A399', margin: '24px 0 0', lineHeight: 1.55 }}>
          당근 · 번개장터 · 중고나라 · 헬로마켓 · 세컨웨어<br />흩어진 매물을 한 화면에서 검색하세요.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 30 }}>
          {MK_ORDER.map((k) => <span key={k} style={{ width: 11, height: 11, borderRadius: '50%', background: markets[k].dot }} />)}
        </div>
      </div>

      {/* floating card */}
      <div style={{ flex: 'none', width: 420, background: '#fff', borderRadius: 24, boxShadow: '0 26px 60px rgba(0,0,0,.42)', padding: '42px 40px', position: 'relative', zIndex: 2 }}>
        <h2 style={{ fontWeight: 800, fontSize: 25, letterSpacing: '-.03em', margin: 0 }}>{login ? '다시 오신 걸 환영해요' : '모아서치 시작하기'}</h2>
        <p style={{ fontWeight: 500, fontSize: 14, color: colors.textFaint, margin: '8px 0 0' }}>{login ? '로그인하고 매물을 한 번에 검색하세요' : '몇 가지만 입력하면 바로 시작해요'}</p>

        <div style={{ display: 'flex', gap: 24, margin: '24px 0 0', borderBottom: `1px solid ${colors.line}` }}>
          <span onClick={() => setMode('login')} style={{ fontWeight: 800, fontSize: 15, paddingBottom: 12, cursor: 'pointer', ...(login ? activeTab : idleTab) }}>로그인</span>
          <span onClick={() => setMode('signup')} style={{ fontWeight: 800, fontSize: 15, paddingBottom: 12, cursor: 'pointer', ...(login ? idleTab : activeTab) }}>회원가입</span>
        </div>

        <div style={{ marginTop: 22 }}>
          {!login && (
            <div style={{ marginBottom: 15 }}>
              <div style={label}>닉네임</div>
              <input className="moa-input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="모아서치에서 쓸 이름" style={field} />
            </div>
          )}

          <div style={{ marginBottom: 15 }}>
            <div style={label}>이메일</div>
            <input className="moa-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={field} />
          </div>

          <div style={{ marginBottom: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 12.5, color: colors.textMuted }}>비밀번호</span>
              {login && <span onClick={flashSoon} style={{ fontWeight: 600, fontSize: 12.5, color: colors.gold, cursor: 'pointer' }}>비밀번호 찾기</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: 50, background: colors.field, borderRadius: 13, padding: '0 15px' }}>
              <input className="moa-input" value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} placeholder="••••••••" style={{ flex: 1, border: 0, outline: 'none', fontSize: 14.5, fontFamily: 'inherit', background: 'transparent', color: colors.ink }} />
              <span onClick={() => setShowPw((v) => !v)} style={{ fontWeight: 600, fontSize: 12.5, color: colors.textFaint, cursor: 'pointer', userSelect: 'none' }}>{showPw ? '숨기기' : '표시'}</span>
            </div>
          </div>

          {!login && (
            <div onClick={() => setAgree((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '4px 0', cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', ...(agree ? { background: colors.ink } : { background: '#fff', border: '1.8px solid #D1D6DB' }) }}>
                {agree && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 10 18 20 6" /></svg>
                )}
              </div>
              <span style={{ fontWeight: 500, fontSize: 13, color: colors.textMuted }}><b style={{ fontWeight: 700, color: colors.ink }}>[필수]</b> 이용약관 및 개인정보 처리방침 동의</span>
            </div>
          )}

          <button onClick={submit} disabled={busy} style={{ width: '100%', height: 54, border: 0, borderRadius: 14, background: colors.yellow, fontWeight: 800, fontSize: 16, color: colors.ink, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit', marginTop: 13 }}>
            {busy ? '처리 중…' : login ? '로그인' : '회원가입 완료'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: colors.line }} />
            <span style={{ fontWeight: 500, fontSize: 12, color: colors.textGhost }}>{login ? '간편 로그인' : '간편 회원가입'}</span>
            <div style={{ flex: 1, height: 1, background: colors.line }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={kakaoLogin} disabled={busy} style={socialBtn}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#FEE500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: colors.ink }}>K</span>카카오
            </button>
            <button onClick={() => flash('네이버 로그인은 준비 중이에요')} style={socialBtn}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: '#03C75A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff' }}>N</span>네이버
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 22, fontWeight: 500, fontSize: 13.5, color: colors.textFaint }}>
            {login ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
            <span onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))} style={{ fontWeight: 700, color: colors.ink, cursor: 'pointer' }}>{login ? '회원가입' : '로그인'}</span>
          </div>
        </div>
      </div>

      {/* ambient glow */}
      <div style={{ position: 'absolute', left: -140, top: -140, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,200,76,.15),transparent 70%)' }} />
      <div style={{ position: 'absolute', right: -120, bottom: -160, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,200,76,.10),transparent 70%)' }} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#fff', color: colors.ink, padding: '13px 22px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.35)', zIndex: 9 }}>
          {toast}
        </div>
      )}
    </div>
  );
};
