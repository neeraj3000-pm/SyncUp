"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface FilterChipOption {
  key: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export interface FilterTab {
  value: string;
  label: string;
  chips: FilterChipOption[];
}

const CHIP_BASE =
  "rounded-pill px-4 py-[9px] text-[13.5px] font-semibold shadow-chip transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97]";

export function FilterChip({
  selected,
  onClick,
  className = "",
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${CHIP_BASE} ${className} ${
        selected
          ? "border border-primary bg-surface-raised text-primary"
          : "border border-border bg-surface text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// The shared shell for the create page's optional pool filters: an "All"
// default that's already selected (zero extra taps), and everything else
// collapsed behind one clearly-optional toggle, so the full set of options
// never adds decision fatigue for someone who doesn't want it.
export function FilterPicker({
  allLabel,
  isAll,
  onSelectAll,
  tabs,
  extra,
}: {
  allLabel: string;
  isAll: boolean;
  onSelectAll: () => void;
  tabs: FilterTab[];
  // Controls that aren't one of the tabs' options (e.g. an on/off toggle).
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [requestedTab, setRequestedTab] = useState(tabs[0].value);
  // Which side new chips slide in from, so moving forward and backward
  // through the tabs animate in opposite directions.
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion();
  const pillLayoutId = useId();

  // A tab can disappear (e.g. Distance once there are no coordinates);
  // fall back to the first one rather than showing a tab that isn't there.
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === requestedTab),
  );
  const activeTab = tabs[activeIndex];

  function selectTab(value: string) {
    setDirection(tabs.findIndex((t) => t.value === value) - activeIndex);
    setRequestedTab(value);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onSelectAll}
        aria-pressed={isAll}
        className={`inline-flex w-fit items-center gap-2 rounded-pill px-[18px] py-[10px] text-sm font-bold shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
          isAll
            ? "border border-primary bg-primary text-white"
            : "border border-border bg-surface text-foreground"
        }`}
      >
        {isAll && (
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
        {allLabel}
      </button>

      {/* One pill with the chevron right against its text, so the whole
          thing reads (and taps) as a single control. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex w-fit items-center gap-2 rounded-pill border border-border bg-surface px-4 py-[10px] shadow-card transition-[background-color,transform,scale] duration-150 ease-out active:scale-[0.97]"
      >
        <span className={`text-sm font-semibold ${open ? "text-foreground" : "text-foreground-muted"}`}>
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
            transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">
              {extra}

              {/* The active tab's coral pill is one shared layoutId element,
                  so it slides between tabs instead of jumping. */}
              <div className="relative flex rounded-pill border border-border bg-surface p-1 shadow-card">
                {tabs.map((t) => {
                  const active = t.value === activeTab.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => selectTab(t.value)}
                      className={`relative z-10 flex-1 rounded-pill py-2 text-sm font-bold transition-colors duration-150 ${
                        active ? "text-white" : "text-foreground-muted"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={pillLayoutId}
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
                  );
                })}
              </div>

              {/* mode="wait" rather than overlapping outgoing and incoming
                  rows: tabs wrap to different heights, and overlapping them
                  would make the panel's height jump mid-transition. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab.value}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction >= 0 ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                  className="flex flex-wrap gap-2"
                >
                  {activeTab.chips.map((chip) => (
                    <FilterChip key={chip.key} selected={chip.selected} onClick={chip.onToggle}>
                      {chip.label}
                    </FilterChip>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
