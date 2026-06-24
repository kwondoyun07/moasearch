import React from 'react';
import { colors, markets, radius } from '../tokens';
import type { SearchFilters } from '../types';
import { CheckIcon } from './icons';
import { RangeSlider } from './RangeSlider';

interface Props {
  filters: SearchFilters;
  onToggleMarket?: (key: keyof typeof markets) => void;
  onPriceChange?: (min: number, max: number) => void;
  onReset?: () => void;
  /** 실제 불러온 결과의 마켓별 개수. 있으면 mock 카운트 대신 표시. */
  counts?: Partial<Record<keyof typeof markets, number>>;
}

const eyebrow: React.CSSProperties = {
  fontWeight: 800, fontSize: 13, letterSpacing: '.04em', color: colors.gold,
};
const divider: React.CSSProperties = { height: 1, background: colors.line, margin: '30px 0' };

const priceBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, height: 46,
  border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '0 14px',
};
const priceInput: React.CSSProperties = {
  flex: 1, minWidth: 0, border: 0, outline: 'none', fontWeight: 700, fontSize: 15,
  color: colors.ink, fontFamily: 'inherit', background: 'transparent', textAlign: 'right',
};

/** Left filter rail on the search-results screen. */
export const FilterSidebar: React.FC<Props> = ({ filters, onToggleMarket, onPriceChange, onReset, counts }) => {
  const setMin = (v: number) => onPriceChange?.(Math.min(v, filters.priceMax), filters.priceMax);
  const setMax = (v: number) => onPriceChange?.(filters.priceMin, Math.min(Math.max(v, filters.priceMin), 3_000_000));

  return (
  <aside style={{ width: 296, flex: 'none', padding: '34px 32px', borderRight: `1px solid ${colors.line}` }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 30 }}>
      <h3 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: 0 }}>필터</h3>
      <span style={{ fontWeight: 600, fontSize: 13, color: colors.textGhost, cursor: 'pointer' }} onClick={onReset}>
        초기화
      </span>
    </div>

    {/* Price — number inputs (stacked) + dual-handle slider */}
    <div style={{ ...eyebrow, marginBottom: 14 }}>가격대</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={priceBox}>
        <span style={{ fontWeight: 600, fontSize: 13, color: colors.textFaint, flex: 'none' }}>최소</span>
        <input value={filters.priceMin.toLocaleString('ko-KR')} inputMode="numeric" onChange={(e) => setMin(+e.target.value.replace(/[^0-9]/g, '') || 0)} style={priceInput} />
        <span style={{ fontWeight: 600, fontSize: 13, color: colors.textFaint, flex: 'none' }}>원</span>
      </div>
      <div style={priceBox}>
        <span style={{ fontWeight: 600, fontSize: 13, color: colors.textFaint, flex: 'none' }}>최대</span>
        <input value={filters.priceMax.toLocaleString('ko-KR')} inputMode="numeric" onChange={(e) => setMax(+e.target.value.replace(/[^0-9]/g, '') || 0)} style={priceInput} />
        <span style={{ fontWeight: 600, fontSize: 13, color: colors.textFaint, flex: 'none' }}>원</span>
      </div>
    </div>
    <RangeSlider value={[filters.priceMin, filters.priceMax]} onChange={([lo, hi]) => onPriceChange?.(lo, hi)} />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontSize: 11, color: colors.textGhost, marginTop: 2 }}>
      <span>0원</span><span>3,000,000원+</span>
    </div>

    <div style={divider} />

    {/* Markets */}
    <div style={{ ...eyebrow, marginBottom: 16 }}>검색할 마켓</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {filters.markets.map((f) => {
        const m = markets[f.key];
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }} onClick={() => onToggleMarket?.(f.key)}>
            <div
              style={{
                width: 22, height: 22, borderRadius: 7,
                background: f.selected ? colors.ink : 'transparent',
                border: f.selected ? 'none' : '1.8px solid #D1D6DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {f.selected && <CheckIcon />}
            </div>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: f.selected ? colors.ink : colors.textMuted }}>
              {m.label === '당근' ? '당근마켓' : m.label}
            </span>
            <span style={{ fontWeight: 600, fontSize: 12, color: colors.textGhost }}>
              {counts ? (counts[f.key] ?? 0).toLocaleString('ko-KR') : f.count}
            </span>
          </div>
        );
      })}
    </div>

    <div style={divider} />

    {/* Region */}
    <div style={{ ...eyebrow, marginBottom: 14 }}>거래 지역</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ padding: '9px 13px', borderRadius: radius.md, fontWeight: 700, fontSize: 13, background: colors.yellow, color: colors.ink }}>
        {filters.region}
      </span>
      <span style={{ padding: '9px 13px', borderRadius: radius.md, fontWeight: 600, fontSize: 13, background: colors.field, color: colors.textMuted }}>
        ＋ 동네
      </span>
    </div>

    <div style={divider} />

    {/* Condition */}
    <div style={{ ...eyebrow, marginBottom: 14 }}>상품 상태</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {(['전체', '새상품급', '사용감 적음'] as const).map((c) => {
        const active = filters.condition === c;
        return (
          <span
            key={c}
            style={{
              padding: '9px 13px', borderRadius: radius.md, fontWeight: active ? 700 : 600, fontSize: 13,
              background: active ? colors.ink : colors.bg,
              color: active ? '#fff' : colors.textMuted,
              border: active ? 'none' : `1.5px solid ${colors.border}`,
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  </aside>
  );
};
