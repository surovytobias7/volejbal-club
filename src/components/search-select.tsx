"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { lookupOptions } from "@/features/selectors";
import type { SelectorKind } from "@/lib/selectors";
import { Button } from "@/components/ui/button";
type Option = { id: string; label: string };
export function SearchSelect({
  name,
  label,
  source,
  value = "",
  multiple = false,
  error,
  hint,
}: {
  name: string;
  label: string;
  source: SelectorKind;
  value?: string;
  multiple?: boolean;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState<Option[]>(() =>
    value
      .split(",")
      .filter(Boolean)
      .map((id) => ({ id, label: "Vybraná položka" })),
  );
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Option[]>([]);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState<string>();
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const initial = useRef({ source, value });
  useEffect(() => {
    const { source, value } = initial.current;
    if (!value) return;
    let live = true;
    lookupOptions({
      kind: source,
      query: "",
      ids: value.split(",").filter(Boolean),
    }).then((result) => {
      if (live) {
        setSelected((current) =>
          current.map((s) => result.items.find((o) => o.id === s.id) ?? s),
        );
        if (result.error) setMessage(result.error);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  function search(next = false) {
    startTransition(async () => {
      const result = await lookupOptions({
        kind: source,
        query,
        ...(next && items.length ? { after: items.at(-1) } : {}),
      });
      setMessage(result.error);
      setSearched(true);
      if (!result.error) {
        setItems(result.items);
        setMore(result.has_more);
      }
    });
  }
  return (
    <fieldset
      className="field search-select"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="px-1 font-semibold">{label}</legend>
      <input
        type="hidden"
        name={name}
        value={selected.map((o) => o.id).join(",")}
      />
      <div className="flex flex-wrap gap-2">
        {selected.map((o) => (
          <Button
            key={o.id}
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setSelected((s) => s.filter((i) => i.id !== o.id))}
            aria-label={`Odstrániť výber: ${o.label}`}
          >
            {o.label} ×
          </Button>
        ))}
      </div>
      <label htmlFor={id} className="sr-only">
        Hľadať: {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={query}
          maxLength={160}
          placeholder="Meno alebo názov…"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setMore(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          disabled={pending}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => search()}
        >
          Hľadať
        </Button>
      </div>
      <div aria-live="polite">
        {pending
          ? "Načítavam…"
          : searched && !items.length && !message
            ? "Žiadne zodpovedajúce možnosti."
            : null}
      </div>
      <ul className="max-h-56 overflow-y-auto space-y-1">
        {items.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className="w-full rounded-lg p-2 text-left hover:bg-slate-100 focus-visible:outline-2"
              disabled={
                selected.some((s) => s.id === o.id) ||
                (multiple && selected.length >= 50)
              }
              onClick={() => setSelected((s) => (multiple ? [...s, o] : [o]))}
            >
              {o.label}
              {selected.some((s) => s.id === o.id) ? " ✓" : ""}
            </button>
          </li>
        ))}
      </ul>
      {more && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => search(true)}
        >
          Ďalšie možnosti
        </Button>
      )}
      {hint && <small className="muted">{hint}</small>}
      {(message || error) && (
        <small id={`${id}-error`} className="feedback-error" role="alert">
          {error || message}
        </small>
      )}
    </fieldset>
  );
}
