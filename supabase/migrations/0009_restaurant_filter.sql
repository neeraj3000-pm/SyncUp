-- PRD section 13's "Step 2 — narrow the pool" for the Eat flow, the
-- restaurant counterpart to migration 0008's movie_filter. One nullable
-- jsonb column, but a different shape: {cuisine, price, openNow, distanceKm}
-- rather than a single-kind tagged union, since these are independent axes
-- someone can combine freely (see RestaurantFilterPicker) rather than
-- mutually-exclusive query strategies like the movie filter's genre/
-- discover/language. EAT-only; WATCH sessions always leave it null.
alter table sessions add column if not exists restaurant_filter jsonb;
