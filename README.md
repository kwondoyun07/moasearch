# Handoff: Moa Search — Desktop (Bold Editorial)

> ⚠️ **상태: 미완성 (Work in Progress)** — 이 프로젝트는 아직 완성되지 않았습니다. 일부 화면·기능이 구현 중이거나 미구현 상태이며, 디자인·데이터 연동이 진행 중입니다. 프로덕션 사용 전 추가 작업이 필요합니다.

## Overview
Moa Search (모아서치) is a **multi-marketplace used-goods aggregator**: one search runs across 5 Korean
secondhand marketplaces (당근마켓, 번개장터, 중고나라, 헬로마켓, 세컨웨어) and shows unified, filterable results.
This bundle covers the **desktop web** experience in the "Bold Editorial" visual direction — big typography,
near-black ink, and a single muted-yellow accent.

Two screens are included: **Home** (search landing) and **Search Results** (filter rail + product grid).

## About the Design Files
The files in `design-reference/` are a **design reference created in HTML** — a prototype showing the intended
look and behavior, **not production code to ship as-is**. The task is to **recreate this design in the target
codebase** using its existing environment and conventions (component library, routing, data layer, styling
approach). If no frontend exists yet, React + TypeScript is a good default — and this bundle already provides
a clean, dependency-free React/TS implementation in `src/` you can drop in or adapt.

`src/` is **ready-to-use React + TypeScript**. It depends only on `react` — styling is inline style objects keyed
off a tokens file, so it works in any React setup without a CSS framework. Swap inline styles for your own system
(CSS Modules / Tailwind / styled-components) if that's your house style; the tokens map directly.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and layout. Recreate pixel-accurately, then make it
responsive (the reference is fixed at 1440px — see Responsive Behavior).

## Tech Notes
- **Framework:** React 18 + TypeScript. No other runtime deps.
- **Styling:** inline `React.CSSProperties` + `src/tokens.ts`. The only global CSS is the font + body reset and `src/global.css` (range-slider thumb pseudo-elements — import once at app root).
- **Entry:** `import { Home, SearchResults } from './src'`.

## Screens / Views

### 1. Home (`src/pages/Home.tsx`)
- **Purpose:** Land, understand the value (5 markets, one search), and start a search.
- **Layout:** Fixed 1440px column. Sticky-style top nav (logo + 4 nav links + bell + 로그인). Hero is a 2-column
  flex row (`gap: 72px`): left = copy + search, right = a 440×400 yellow visual panel with two floating cards.
  Below: "지금 뜨는 매물" section, 4-column grid (`gap: 24px`).
- **Key components:**
  - **Wordmark** "모아서치" — 22px / 800, `서치` in `#E5A600`.
  - **Hero headline** — 62px / 800, `line-height 1.06`, `letter-spacing -.045em`. Second line wrapped in a
    yellow highlight (`background #F5C84C`, `padding 0 12px`, `border-radius 8`, `box-decoration-break: clone`).
  - **Search bar** — 70px tall, `background #14110A`, `border-radius 18`, with a 54px yellow square button
    (`#F5C84C`) holding a search glyph.
  - **Market chips** — 5 pills, each marketplace's bg/fg pair (see Design Tokens › markets).
  - **Yellow panel** — `#F5C84C`, `border-radius 30`; a white listing card (top-left) and a dark stat card
    (bottom-right, "1,284건 / 5개 마켓의 매물을 한 화면에" + 5 colored dots).
  - **ProductCard** ×4 — photo (188px, `border-radius 14`) + badge + meta + title + price.

### 2. Search Results (`src/pages/SearchResults.tsx`)
- **Purpose:** Refine and browse aggregated listings for a query.
- **Layout:** Top nav with an inline filled search field (max 640px). Body is a flex row: left
  **FilterSidebar** (296px, right border) + **main** (`flex: 1`, `padding 34px 48px`). Results header (title +
  count + sort tabs) above a **3-column grid** (`gap: 26px 24px`).
- **Key components:**
  - **FilterSidebar** (`src/components/FilterSidebar.tsx`): section eyebrows (13px / 800, `#A98A14`,
    `letter-spacing .04em`); **interactive price filter** — stacked 최소/최대 number inputs (만원) + a dual-handle `RangeSlider` (0–300만원, handles can't cross), wired via `onPriceChange`; market checklist (22px square checkbox, filled `#14110A` with yellow check when selected,
    per-market result count on the right); region chips; condition chips. Dividers are 1px `#F0F0EE`.
  - **Results header:** title 30px / 800; meta line "총 **1,284**건 · 강남구 · 10–150만원"; sort tabs
    (최신순 / 낮은 가격순 / 인기순) — active tab gets a 2.5px yellow bottom border.
  - **ProductCard** with `showLike` — adds a 34px circular ♡ button over the photo.

### 3. Notifications (`src/pages/Notifications.tsx`)
- **Purpose:** Full alert history. Grouped **오늘 / 이전 알림** in bordered cards; each row = accent dot + title + desc + time. "모두 읽음" clears unread. Content-only page (renders inside the shared header).

### 4. Wishlist / 관심목록 (`src/pages/Wishlist.tsx`)
- **Purpose:** Liked listings as a 4-col `ProductCard` grid (filled red heart). Count line "찜한 매물 N개"; empty state when none. Toggling a heart removes it from the list.

### 5. Price Alerts / 가격 알림 (`src/pages/PriceAlerts.tsx`)
- **Purpose:** Price-range rules. Each card = keyword + "목표가 N원 ~ M원" (or "M원 이하") + on/off **Toggle** + trash button. **＋ 새 알림** opens a modal (키워드, 최소~목표 가격 통합 듀얼 슬라이더 via `RangeSlider`, 마켓 칩). Trash opens a **delete-confirm** dialog before removing. Prices stored in KRW; the form works in 만원 units (×10000).

### 6. Product Detail / 상품 상세 (`src/pages/ProductDetail.tsx`)
- **Purpose:** Single listing. Left = 520px gallery (460px main + 4 thumbnails, active outlined). Right = market badge + location/time, 28px title, 34px price, seller card (avatar + 매너온도 + 응답률), 상품 설명, and actions: outlined 찜 toggle + full-width yellow "채팅으로 거래하기". `onBack` returns to the list.

## Interactions & Behavior
- **Market filter:** click a row to toggle `selected`; refetch/re-filter results. (Demo: local state in
  `SearchResults`.)
- **Sort tabs:** switch `filters.sort`; the demo sorts client-side (`낮은 가격순` by price asc, `인기순` by
  likes desc). Replace with server-side ordering in production.
- **Like button:** `onToggleLike(item)` hook on `ProductCard` (wire to favorites).
- **Card / search:** `onClick(item)` → navigate to a detail route; submitting the search → results route.
- **Hover (recommended, not in static reference):** cards lift slightly (`translateY(-2px)` + soft shadow,
  ~150ms ease); nav links and chips darken on hover.

## State Management
- `SearchFilters` (see `src/types.ts`): `query`, `priceMin/Max` (in 만원 units, 10 = ₩100,000), `markets`
  (per-market `{count, selected}`), `region`, `condition`, `sort`.
- Results list derives from `filters` — fetch on change (debounce the query). Counts per market come from the
  search response facets.

## Responsive Behavior
The reference is fixed at **1440px**. For production:
- Outer container → `max-width` + fluid horizontal padding instead of `width: 1440`.
- Home hero → stack to a single column below ~960px; full-width search bar.
- Results grid → 3 cols ≥1200px, 2 cols ≥760px, 1 col below; FilterSidebar collapses into a top "필터" sheet/
  drawer on narrow widths.

## Design Tokens
All values live in `src/tokens.ts`.

**Colors**
| Token | Hex | Use |
|---|---|---|
| ink | `#14110A` | primary text, dark surfaces, search bar |
| inkSoft | `#333D4B` | secondary text |
| yellow | `#F5C84C` | primary accent (muted) |
| yellowDeep | `#E5A600` | "서치" wordmark accent |
| gold | `#A98A14` | section eyebrows |
| bg | `#FFFFFF` | page |
| line | `#F0F0EE` | dividers |
| field | `#F4F5F7` | input fill |
| border | `#E5E8EB` | chip outline |
| textMuted | `#6B7684` | nav, meta |
| textFaint | `#8B95A1` | timestamps |
| textGhost | `#B0B8C1` | counts, placeholders |

**Marketplace colors** (`bg` / `fg`): 당근 `#FFF0E6`/`#FF6600` · 번개장터 `#FFECEC`/`#D80C18` ·
중고나라 `#E9F8EE`/`#0CB650` · 헬로마켓 `#EAF2FF`/`#2F6FE0` · 세컨웨어 `#F1ECFF`/`#6D3FD4`.

**Radius:** sm 6 · md 11 · lg 14 · xl 18.
**Type scale (px / weight):** hero 62/800 · h2 30/800 · section 27/800 · price 22/800 · title 15/600 ·
nav 15/600 · eyebrow 13/800 · meta 12/500.
**Letter-spacing:** headlines `-.03em ~ -.045em`; eyebrows `.04em ~ .16em`.

## Assets
- **Font:** **Pretendard** (this is the deliberate "not-AI" choice — do not substitute Inter/Roboto/system).
  Reference loads it via CDN; in production self-host or `npm i pretendard` and set
  `font-family: 'Pretendard Variable', Pretendard, system-ui, sans-serif` globally.
- **Product photos:** the gray/colored tiles are **CSS-gradient placeholders** standing in for real listing
  thumbnails. Replace with `<img style="object-fit:cover">`. Swap `Listing.thumb` from a gradient string to a URL.
- **Icons:** inline SVG in `src/components/icons.tsx` (search, bell, check, close) — swap for your icon set.
- **Marketplace names/logos:** rendered as plain colored text badges only — no third-party logos are used or
  required.

## Files
- `src/index.ts` — public exports
- `src/tokens.ts` — colors, markets, radius, type, font
- `src/types.ts` — `Listing`, `SearchFilters`, price helpers
- `src/data.ts` — mock listings + default filters (replace with API)
- `src/components/` — `MarketBadge`, `ProductCard`, `FilterSidebar`, `Toggle`, `RangeSlider`, `icons`
- `src/global.css` — range-slider thumb styles (import once at app root)
- `src/pages/` — `Home`, `SearchResults`, `Notifications`, `Wishlist`, `PriceAlerts`, `ProductDetail`
- `design-reference/모아서치 PC.dc.html` — original static reference (home + results)
- `design-reference/모아서치 PC 인터랙티브.dc.html` — interactive reference: all screens + dropdowns, login/signup modal, filters, wishlist, alerts, sales, detail (visual + behavior source of truth)

## Navigation map (interactive reference)
- Logo → Home · nav 가격알림 → Price Alerts · nav 관심목록 → Wishlist
- Bell → notifications dropdown → "모든 알림 보기" → Notifications page
- Avatar (after login) → profile menu → 관심목록 / 가격알림 설정 / 로그아웃
- Any product card → Product Detail; detail "목록으로" → Results
