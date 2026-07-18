"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { searchVenueGuests, type GuestSearchResult } from "@/lib/guest-search";
import type { Venue } from "@/lib/types";

type GuestSearchProps = {
  venue: Venue;
  onSelect: (result: GuestSearchResult) => void;
};

export function GuestSearch({ venue, onSelect }: GuestSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchVenueGuests(venue, query), [query, venue]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleSelect(result: GuestSearchResult) {
    onSelect(result);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (event.key === "ArrowDown" && results.length > 0) {
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) handleSelect(result);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Найти гостя…"
        className="h-9 border-b border-[var(--line-strong)] bg-transparent pr-9 text-sm"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--foreground-subtle)]">
        ⌕
      </span>

      {open && query.trim() ? (
        <div className="search-dropdown absolute top-[calc(100%+0.35rem)] right-0 left-0 z-30 overflow-hidden rounded-[0.55rem] border border-[var(--line)] shadow-[var(--surface-shadow)] backdrop-blur-md">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--foreground-muted)]">Никого не нашли</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((result, index) => (
                <li key={result.guestId}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                      index === activeIndex
                        ? "bg-[var(--accent-soft)]"
                        : "hover:bg-white/45"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(result)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {result.guestName}
                      </p>
                      {result.guestEmail ? (
                        <p className="truncate text-xs text-[var(--foreground-muted)]">
                          {result.guestEmail}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        Стол {result.tableLabel}
                      </p>
                      <p
                        className={`text-[0.68rem] ${
                          result.seated && result.seatNumber
                            ? "text-[var(--foreground-muted)]"
                            : "text-[var(--highlight)]"
                        }`}
                      >
                        {result.seated && result.seatNumber
                          ? `Стул ${result.seatNumber}`
                          : "Без места"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
