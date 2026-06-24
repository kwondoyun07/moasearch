import React, { useEffect, useState } from 'react';
import { colors, font, markets } from '../tokens';
import { formatPrice, type Listing } from '../types';

interface Props {
  item: Listing;
  liked?: boolean;
  onBack?: () => void;
  onToggleLike?: (item: Listing) => void;
  onChat?: (item: Listing) => void;
}

const DESC =
  '한 달 정도 사용한 거의 새 제품입니다. 정품 박스·구성품 모두 있고 기스나 파손 없이 깨끗하게 관리했어요. ' +
  '직거래는 강남역 인근에서 가능하며, 택배 거래도 환영합니다. 단순 변심 환불은 어렵습니다.';

/** 상품 상세 — gallery + info + seller + actions. */
export const ProductDetail: React.FC<Props> = ({ item, liked: likedProp = false, onBack, onToggleLike, onChat }) => {
  const [liked, setLiked] = useState(likedProp);
  // 찜 상태는 비동기로 로드/변경되므로 prop 변화를 반영(마운트 시 1회 시드만으론 부족).
  useEffect(() => {
    const sync = () => setLiked(likedProp);
    sync();
  }, [likedProp]);
  const m = markets[item.market];
  const toggle = () => { setLiked((v) => !v); onToggleLike?.(item); };

  return (
    <div style={{ fontFamily: font.family, color: colors.ink, padding: '30px 56px 60px' }}>
      <div onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14, color: colors.textMuted, cursor: 'pointer' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 5 8 12 15 19" /></svg>
        목록으로
      </div>

      <div style={{ display: 'flex', gap: 48, marginTop: 22 }}>
        <div style={{ flex: 'none', width: 520 }}>
          <div style={{ height: 460, borderRadius: 20, background: item.thumb }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <div style={{ width: 84, height: 84, borderRadius: 12, background: item.thumb, boxShadow: `inset 0 0 0 2px ${colors.ink}` }} />
            <div style={{ width: 84, height: 84, borderRadius: 12, background: 'linear-gradient(135deg,#EDEDEA,#DADAD4)' }} />
            <div style={{ width: 84, height: 84, borderRadius: 12, background: 'linear-gradient(135deg,#E6E2D6,#D0C8B4)' }} />
            <div style={{ width: 84, height: 84, borderRadius: 12, background: 'linear-gradient(135deg,#DBE0EA,#C2CADB)' }} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '4px 10px', borderRadius: 7, fontWeight: 700, fontSize: 12, background: m.bg, color: m.fg }}>{m.label}</span>
            <span style={{ fontWeight: 500, fontSize: 13, color: colors.textFaint }}>{item.location} · {item.postedAt}</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-.03em', lineHeight: 1.3, margin: '16px 0 0' }}>{item.title}</h1>
          <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: '-.03em', margin: '14px 0 0' }}>{formatPrice(item.price)}</div>

          <div style={{ height: 1, background: colors.line, margin: '26px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#D9E3DC,#BFCDC4)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>믿음거래_역삼</div>
              <div style={{ fontWeight: 500, fontSize: 12.5, color: colors.textFaint }}>매너온도 42.3°C · 응답률 98%</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: colors.ink, cursor: 'pointer' }}>판매자 정보 ›</span>
          </div>

          <div style={{ height: 1, background: colors.line, margin: '26px 0' }} />
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.04em', color: colors.gold, marginBottom: 12 }}>상품 설명</div>
          <p style={{ fontWeight: 500, fontSize: 15, color: colors.inkSoft, lineHeight: 1.65, margin: 0 }}>{DESC}</p>

          <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
            <button onClick={toggle} style={{ flex: 'none', width: 120, height: 56, border: `1.5px solid ${colors.border}`, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: liked ? '#E8453C' : colors.inkSoft, cursor: 'pointer', fontFamily: 'inherit' }}>
              {liked ? '♥ 찜함' : '♡ 찜하기'}
            </button>
            <button onClick={() => onChat?.(item)} style={{ flex: 1, height: 56, border: 0, borderRadius: 14, background: colors.yellow, fontWeight: 800, fontSize: 16, color: colors.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
              채팅으로 거래하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
