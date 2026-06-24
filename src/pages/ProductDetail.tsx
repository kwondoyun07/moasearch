import React, { useEffect, useState } from 'react';
import { colors, font, markets } from '../tokens';
import { formatPrice, type Listing } from '../types';
import { getListingDetail, type ListingDetail } from '../lib/listing';

interface Props {
  item: Listing;
  liked?: boolean;
  onBack?: () => void;
  onToggleLike?: (item: Listing) => void;
  onChat?: (item: Listing) => void;
}

/** 이미지 URL이면 background-image, 데모 그라데이션이면 background. */
const photoBg = (src: string): React.CSSProperties =>
  /^https?:\/\//.test(src)
    ? { backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#EEF0F2' }
    : { background: src };

/**
 * 상품 상세 — 갤러리 + 정보 + 판매자 + 액션.
 * 상세(설명·이미지·판매자)는 /api/listing 으로 마켓 원문에서 실시간 조회하고,
 * 없으면 검색에서 받은 기본 정보로 폴백한다. 외부 매물이라 거래 액션은 원문으로 연결.
 */
export const ProductDetail: React.FC<Props> = ({ item, liked: likedProp = false, onBack, onToggleLike, onChat }) => {
  const [liked, setLiked] = useState(likedProp);
  useEffect(() => {
    const sync = () => setLiked(likedProp);
    sync();
  }, [likedProp]);

  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [active, setActive] = useState(0);

  // 원문 상세를 비동기로 불러온다(설명·추가 이미지·판매자).
  useEffect(() => {
    let on = true;
    async function load() {
      if (!item.listingUrl) {
        if (on) setDetail(null);
        return;
      }
      if (on) {
        setDetail(null);
        setActive(0);
      }
      try {
        const d = await getListingDetail(item.listingUrl);
        if (on) setDetail(d);
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => {
      on = false;
    };
  }, [item.listingUrl]);

  const m = markets[item.market];
  const toggle = () => {
    setLiked((v) => !v);
    onToggleLike?.(item);
  };
  const openSource = () => {
    if (item.listingUrl) window.open(item.listingUrl, '_blank', 'noopener,noreferrer');
    else onChat?.(item);
  };

  const images = detail?.images?.length ? detail.images : item.thumb ? [item.thumb] : [];
  const mainImg = images[active] ?? item.thumb ?? '';
  const description =
    detail?.description?.trim() ||
    '판매자가 등록한 상세 설명이 없어요. 아래 “원문에서 거래하기”로 원본 매물을 확인해 주세요.';
  const seller = detail?.seller;

  return (
    <div style={{ fontFamily: font.family, color: colors.ink, padding: '30px 56px 60px' }}>
      <div onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14, color: colors.textMuted, cursor: 'pointer' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 5 8 12 15 19" /></svg>
        목록으로
      </div>

      <div style={{ display: 'flex', gap: 48, marginTop: 22 }}>
        <div style={{ flex: 'none', width: 520 }}>
          <div style={{ height: 460, borderRadius: 20, ...photoBg(mainImg) }} />
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              {images.slice(0, 5).map((src, i) => (
                <div
                  key={i}
                  onClick={() => setActive(i)}
                  style={{ width: 84, height: 84, borderRadius: 12, cursor: 'pointer', ...photoBg(src), boxShadow: i === active ? `inset 0 0 0 2px ${colors.ink}` : 'none' }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '4px 10px', borderRadius: 7, fontWeight: 700, fontSize: 12, background: m.bg, color: m.fg }}>{m.label}</span>
            <span style={{ fontWeight: 500, fontSize: 13, color: colors.textFaint }}>{[item.location, item.postedAt].filter(Boolean).join(' · ')}</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-.03em', lineHeight: 1.3, margin: '16px 0 0' }}>{item.title}</h1>
          <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: '-.03em', margin: '14px 0 0' }}>{formatPrice(item.price)}</div>

          <div style={{ height: 1, background: colors.line, margin: '26px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#D9E3DC,#BFCDC4)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller?.name ?? `${m.label} 판매자`}</div>
              <div style={{ fontWeight: 500, fontSize: 12.5, color: colors.textFaint }}>{seller?.sub ?? '원문에서 판매자 정보를 확인하세요'}</div>
            </div>
            <span onClick={openSource} style={{ fontWeight: 700, fontSize: 13, color: colors.ink, cursor: 'pointer', flex: 'none' }}>원문 보기 ›</span>
          </div>

          <div style={{ height: 1, background: colors.line, margin: '26px 0' }} />
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.04em', color: colors.gold, marginBottom: 12 }}>상품 설명</div>
          <p style={{ fontWeight: 500, fontSize: 15, color: colors.inkSoft, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{description}</p>

          <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
            <button onClick={toggle} style={{ flex: 'none', width: 120, height: 56, border: `1.5px solid ${colors.border}`, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: liked ? '#E8453C' : colors.inkSoft, cursor: 'pointer', fontFamily: 'inherit' }}>
              {liked ? '♥ 찜함' : '♡ 찜하기'}
            </button>
            <button onClick={openSource} style={{ flex: 1, height: 56, border: 0, borderRadius: 14, background: colors.yellow, fontWeight: 800, fontSize: 16, color: colors.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
              원문에서 거래하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
