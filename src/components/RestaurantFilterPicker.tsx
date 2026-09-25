"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type {
  RestaurantCuisineSlug,
  RestaurantFilter,
  RestaurantPriceSlug,
} from "@/services/restaurants";

type Tab = "cuisine" | "price" | "distance";

const CUISINE_OPTIONS: { value: RestaurantCuisineSlug; label: string }[] = [
  { value: "indian", label: "Indian" },
  { value: "chinese", label: "Chinese" },
  { value: "italian", label: "Italian" },
  { value: "cafe", label: "Cafe" },
  { value: "fast_food", label: "Fast Food" },
  { value: "bakery", label: "Bakery & Desserts" },
];

const PRICE_OPTIONS: { value: RestaurantPriceSlug; label: string }[] = [
  { value: "budget", label: "₹ Budget" },
  { value: "mid_range", label: "₹₹ Mid-range" },
  { value: "fine_dining", label: "₹₹₹ Fine Dining" },
];

const DISTANCE_OPTIONS = [2, 5, 10, 20] as const;

const EMPTY_FILTER: RestaurantFilter = {
  cuisine: null,
  price: null,
  openNow: false,
  distanceKm: null,
};

function isEmpty(f: RestaurantFilter): boolean {
  return f.cuisine === null && f.price === null && !f.openNow && f.distanceKm === null;
}

// Unlike MovieFilterPicker's single-select-across-tabs model (one of three
// mutually-exclusive query strategies), these are independent axes someone
// can combine freely — Cuisine, Price, Distance and the standalone Open Now
// toggle can all be active at once, since "Italian, Budget, Open Now" is a
// perfectly normal thing to want together. Same collapsed-by-default,
// chip-style shell as the movie picker otherwise, for a consistent feel.
export function RestaurantFilterPicker({
  value,
  onChange,
  hasCoords,
}: {
  value: RestaurantFilter | null;
  onChange: (filter: RestaurantFilter | null) => void;
  // Distance only means anything relative to a coordinate center — a typed
  // free-text area has none, so that tab only shows up once "Use my
  // location" or a picked suggestion has actually set one.
  hasCoords: boolean;
}) {
  const tabs = useMemo(
    () =>
      hasCoords
        ? ([
            { value: "cuisine" as Tab, label: "Cuisine" },
            { value: "price" as Tab, label: "Price" },
            { value: "distance" as Tab, label: "Distance" },
          ] as const)
        : ([
            { value: "cuisine" as Tab, label: "Cuisine" },
            { value: "price" as Tab, label: "Price" },
          ] as const),
    [hasCoords],
  );
  const tabIndex = useMemo(
    () => Object.fromEntries(tabs.map((t, i) => [t.value, i])) as Record<Tab, number>,
    [tabs],
  );

  const [open, setOpen] = useState(false);
  const [rawActiveTab, setActiveTab] = useState<Tab>("cuisine");
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion();

  // Distance disappears from `tabs` the moment coordinates go away (typing
  // a free-text area after having used GPS) — computed at render instead of
  // synced back into activeTab via an effect, so a tab that no longer
  // exists in the row above never gets rendered as "selected" for even one
  // frame; tapping a different tab still goes through setActiveTab as usual.
  const activeTab = tabs.some((t) => t.value === rawActiveTab) ? rawActiveTab : "cuisine";

  const current = value ?? EMPTY_FILTER;

  function selectTab(tab: Tab) {
    setDirection(tabIndex[tab] - tabIndex[activeTab]);
    setActiveTab(tab);
  }

  function update(partial: Partial<RestaurantFilter>) {
    const next = { ...current, ...partial };
    onChange(isEmpty(next) ? null : next);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`inline-flex w-fit items-center gap-2 rounded-pill px-[18px] py-[10px] text-sm font-bold shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
          value === null
            ? "border border-primary bg-primary text-white"
            : "border border-border bg-surface text-foreground"
        }`}
      >
        {value === null && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        All Restaurants
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex w-fit items-center gap-2 rounded-pill border border-border bg-surface px-4 py-[10px] shadow-card transition-[background-color,transform,scale] duration-150 ease-out active:scale-[0.97]"
      >
        <span
          className={`text-sm font-semibold ${open ? "text-foreground" : "text-foreground-muted"}`}
        >
          Narrow it down <span className="font-medium text-foreground-muted">(optional)</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="flex-shrink-0 text-foreground-muted transition-transform duration-200 ease-out"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }
            }
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">
              {/* Standalone, not a tab — a boolean toggle doesn't fit an
                  enumerable chip row, and it's independent of whichever
                  tab happens to be open. */}
              <button
                type="button"
                onClick={() => update({ openNow: !current.openNow })}
                aria-pressed={current.openNow}
                className={`w-fit rounded-pill px-4 py-[9px] text-[13.5px] font-semibold shadow-chip transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                  current.openNow
                    ? "border border-primary bg-surface-raised text-primary"
                    : "border border-border bg-surface text-foreground"
                }`}
              >
                Open Now
              </button>

              <div className="relative flex rounded-pill border border-border bg-surface p-1 shadow-card">
                {tabs.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => selectTab(t.value)}
                    className={`relative z-10 flex-1 rounded-pill py-2 text-sm font-bold transition-colors duration-150 ${
                      activeTab === t.value ? "text-white" : "text-foreground-muted"
                    }`}
                  >
                    {activeTab === t.value && (
                      <motion.span
                        layoutId="restaurant-filter-tab-pill"
                        className="absolute inset-0 -z-10 rounded-pill bg-primary"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", bounce: 0.15, duration: 0.35 }
                        }
                      />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction >= 0 ? 20 : -20 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                  className="flex flex-wrap gap-2"
                >
                  {activeTab === "cuisine" &&
                    CUISINE_OPTIONS.map((opt) => {
                      const selected = current.cuisine === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update({ cuisine: selected ? null : opt.value })}
                          aria-pressed={selected}
                          className={`rounded-pill px-4 py-[9px] text-[13.5px] font-semibold shadow-chip transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                            selected
                              ? "border border-primary bg-surface-raised text-primary"
                              : "border border-border bg-surface text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  {activeTab === "price" &&
                    PRICE_OPTIONS.map((opt) => {
                      const selected = current.price === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update({ price: selected ? null : opt.value })}
                          aria-pressed={selected}
                          className={`rounded-pill px-4 py-[9px] text-[13.5px] font-semibold shadow-chip transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                            selected
                              ? "border border-primary bg-surface-raised text-primary"
                              : "border border-border bg-surface text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  {activeTab === "distance" &&
                    hasCoords &&
                    DISTANCE_OPTIONS.map((km) => {
                      const selected = current.distanceKm === km;
                      return (
                        <button
                          key={km}
                          type="button"
                          onClick={() => update({ distanceKm: selected ? null : km })}
                          aria-pressed={selected}
                          className={`rounded-pill px-4 py-[9px] text-[13.5px] font-semibold shadow-chip transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                            selected
                              ? "border border-primary bg-surface-raised text-primary"
                              : "border border-border bg-surface text-foreground"
                          }`}
                        >
                          Within {km} km
                        </button>
                      );
                    })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
