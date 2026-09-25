-- PRD section 11-12: the Watch flow's "Step 2 — choose movie pool" (genre/
-- collection filtering), which shipped after the rest of MVP without this
-- piece. Nullable jsonb, not separate genre/discover/language columns — a
-- session has at most one filter active at a time (see MovieFilterPicker's
-- single-select model), so one small shape like
-- {"kind":"genre","value":"action"} covers all three filter kinds without
-- three mostly-null columns. WATCH-only; EAT sessions always leave it null,
-- same convention as location_lat/lng being WATCH-null (migration 0006).
alter table sessions add column if not exists movie_filter jsonb;
