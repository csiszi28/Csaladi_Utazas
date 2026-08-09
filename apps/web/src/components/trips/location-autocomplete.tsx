"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { searchLocations, type GeocodeHit } from "@/actions/geocode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectHit?: (hit: GeocodeHit) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelectHit,
  placeholder = "Cím vagy helyszín",
  disabled,
  id,
  className,
}: LocationAutocompleteProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3 || disabled) {
      setHits([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchLocations(q, 8);
        if (!result.success) {
          setError(result.error);
          setHits([]);
          return;
        }
        setError(null);
        setHits(result.data);
        setOpen(result.data.length > 0);
      });
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, disabled]);

  function pick(hit: GeocodeHit) {
    skipSearchRef.current = true;
    onChange(hit.displayName);
    onSelectHit?.(hit);
    setHits([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (hits.length > 0) setOpen(true);
          }}
          className="pr-16"
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled}
              onClick={() => {
                onChange("");
                setHits([]);
                setOpen(false);
              }}
              aria-label="Cím törlése"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      {open && hits.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg"
        >
          {hits.map((hit, index) => (
            <li key={`${hit.lat},${hit.lng},${index}`}>
              <button
                type="button"
                role="option"
                className="flex min-h-[var(--touch-target)] w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
                onClick={() => pick(hit)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2 leading-snug">{hit.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
