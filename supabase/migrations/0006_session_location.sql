-- Sprint 5: restaurant candidates need a location to search around.
-- PRD section 13: this is asked for only in the create flow, after Eat is
-- chosen — never on the landing page.

-- All nullable: WATCH sessions never set these. For EAT sessions, exactly
-- one of the two location shapes is expected to be set, decided by which
-- option the creator picked:
--   - location_lat/location_lng: "Use my location" (browser geolocation) —
--     precise coordinates, lets the restaurant service compute real
--     distance-from-you for each candidate and use Google's Nearby Search.
--   - location_label: "Choose an area" (free text, e.g. "Indiranagar,
--     Bangalore") — no coordinates, so the restaurant service falls back to
--     Google's Text Search instead, and per-candidate distance is left out
--     since there's no fixed point to measure from.
alter table sessions add column if not exists location_lat double precision;
alter table sessions add column if not exists location_lng double precision;
alter table sessions add column if not exists location_label text;
