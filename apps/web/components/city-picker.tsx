"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPlaces } from "@/lib/api";
import type { Place } from "@/lib/types";

type Props = {
  value: string;
  /** True when the saved value is a known city with coordinates. */
  located: boolean;
  /** Free typing: the text changes and any previous coordinates no longer apply. */
  onType: (text: string) => void;
  onPick: (place: Place) => void;
  className: string;
};

/** Location field with US city suggestions (ARIA combobox: arrows, Enter, Escape). */
export default function CityPicker({ value, located, onType, onPick, className }: Props) {
  const [options, setOptions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [attribution, setAttribution] = useState("");
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!typed.current || value.trim().length < 2) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(value, controller.signal)
        .then((result) => {
          setOptions(result.items);
          setAttribution(result.attribution);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => { if (!controller.signal.aborted) setOptions([]); });
    }, 200);
    // Typing again cancels the pending request, so an old answer can never land after a newer one.
    return () => { controller.abort(); clearTimeout(timer); };
  }, [value]);

  function pick(place: Place) {
    typed.current = false;
    onPick(place);
    setOpen(false);
    setOptions([]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => (i + 1) % options.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => (i <= 0 ? options.length - 1 : i - 1)); }
    else if (event.key === "Enter" && active >= 0) { event.preventDefault(); pick(options[active]); }
    else if (event.key === "Escape") { setOpen(false); }
  }

  const showList = open && options.length > 0;
  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700">
        Location
        <input
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={200}
          value={value}
          placeholder="Start typing a city, e.g. Kent, OH"
          onChange={(event) => { typed.current = true; onType(event.target.value); }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className={className}
        />
      </label>
      {showList && (
        <ul id={listId} role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((place, index) => (
            <li
              key={place.label}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => { event.preventDefault(); pick(place); }}
              className={`cursor-pointer px-4 py-2 text-sm ${index === active ? "bg-indigo-50 text-indigo-800" : "text-slate-700"}`}
            >
              {place.label}
            </li>
          ))}
          {attribution && <li role="presentation" className="px-4 pt-1 text-[10px] text-slate-400">{attribution}</li>}
        </ul>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {located
          ? "Distance to on-site opportunities counts toward your match."
          : value.trim()
            ? "Pick a city from the list to use distance in your match. Other text is saved but not used for distance."
            : "Optional. Pick a US city to use distance in your match."}
      </p>
    </div>
  );
}
