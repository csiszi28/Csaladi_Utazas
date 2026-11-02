"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatIntroRange, type IntroPlan } from "@/lib/trip-intro";

/** Az animáció időzítése (ms) — a CSS (.ti-*) ugyanezekre az értékekre épül. */
export const TRIP_INTRO_MS = 6700;
const FLIGHT_START = 2750;
const FLIGHT_MS = 1800;
const COUNT_START = 2800;
const COUNT_MS = 1700;

const ARC = { p0: [40, 170], p1: [190, -20], p2: [340, 150] } as const;

function bezier(t: number) {
  const u = 1 - t;
  const x = u * u * ARC.p0[0] + 2 * u * t * ARC.p1[0] + t * t * ARC.p2[0];
  const y = u * u * ARC.p0[1] + 2 * u * t * ARC.p1[1] + t * t * ARC.p2[1];
  const dx = 2 * u * (ARC.p1[0] - ARC.p0[0]) + 2 * t * (ARC.p2[0] - ARC.p1[0]);
  const dy = 2 * u * (ARC.p1[1] - ARC.p0[1]) + 2 * t * (ARC.p2[1] - ARC.p1[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Determinisztikus csillagmező (nincs Math.random → stabil render). */
function useStars(count: number) {
  return useMemo(() => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      y: rand() * 70,
      r: 0.6 + rand() * 1.6,
      delay: rand() * 4000,
      dur: 2400 + rand() * 2600,
    }));
  }, [count]);
}

function Letters({ text, baseDelay }: { text: string; baseDelay: number }) {
  let index = 0;
  return (
    <span className="ti-name" aria-label={text}>
      {text.split(" ").map((word, w) => (
        <span className="ti-word" key={`${word}-${w}`} aria-hidden="true">
          {Array.from(word).map((char, i) => (
            <span
              className="ti-letter"
              key={`${char}-${i}`}
              style={{ animationDelay: `${baseDelay + index++ * 55}ms` }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

interface TripIntroProps {
  plan: IntroPlan;
  onSkip: () => void;
}

export function TripIntro({ plan, onSkip }: TripIntroProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [coverReady, setCoverReady] = useState(false);
  const planeRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const stars = useStars(46);

  useEffect(() => {
    setHost(document.getElementById("app-splash-blocker"));
  }, []);

  // Billentyűzettel is kihagyható (Esc / Enter / Szóköz)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSkip();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSkip]);

  // Borítókép előtöltése — csak akkor jelenik meg, ha tényleg betöltött.
  useEffect(() => {
    if (!plan.coverUrl) return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => setCoverReady(true);
    image.src = plan.coverUrl;
    return () => {
      image.onload = null;
    };
  }, [plan.coverUrl]);

  useEffect(() => {
    if (!host) return;

    const trail = trailRef.current;
    const plane = planeRef.current;
    const count = countRef.current;
    const length = trail?.getTotalLength() ?? 0;
    if (trail) {
      trail.style.strokeDasharray = `${length}`;
      trail.style.strokeDashoffset = `${length}`;
    }

    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - started;

      const flight = easeInOut(clamp01((elapsed - FLIGHT_START) / FLIGHT_MS));
      if (trail) trail.style.strokeDashoffset = `${length * (1 - flight)}`;
      if (plane) {
        const { x, y, angle } = bezier(flight);
        plane.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
        plane.style.opacity = flight <= 0 || flight >= 1 ? "0" : "1";
      }
      if (count) {
        const progress = easeOut(clamp01((elapsed - COUNT_START) / COUNT_MS));
        count.textContent = String(Math.round(plan.days * progress));
      }

      if (elapsed < FLIGHT_START + FLIGHT_MS + 200) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [host, plan.days]);

  if (!host) return null;

  const today = plan.days === 0;
  const tomorrow = plan.days === 1;

  return createPortal(
    <div
      className="ti-root"
      onClick={onSkip}
      role="dialog"
      aria-modal="true"
      aria-label="Következő utazás"
    >
      <p className="sr-only">
        {`${plan.origin} → ${plan.destinationFull}: ${
          today ? "ma indultok" : `${plan.days} nap múlva indultok`
        }. ${plan.title}, ${formatIntroRange(plan.startDate, plan.endDate)}. Esc a kihagyáshoz.`}
      </p>
      <div className="ti-bg ti-bg--dusk" />
      <div className="ti-bg ti-bg--dawn" />
      {plan.coverUrl && coverReady && (
        <div
          className="ti-cover"
          style={{ backgroundImage: `url("${plan.coverUrl}")` }}
          aria-hidden="true"
        />
      )}
      <div className="ti-orb ti-orb--a" />
      <div className="ti-orb ti-orb--b" />

      <svg className="ti-stars" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {stars.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r * 0.18}
            className="ti-star"
            style={{ animationDelay: `${star.delay}ms`, animationDuration: `${star.dur}ms` }}
          />
        ))}
      </svg>

      <svg className="ti-hills" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 120V70C60 40 110 56 170 62s120-34 230-6v64Z" className="ti-hill ti-hill--far" />
        <path d="M0 120V92C70 70 130 84 200 90s130-26 200-8v38Z" className="ti-hill ti-hill--near" />
      </svg>

      {/* 1. jelenet — honnan indulunk */}
      <section className="ti-scene ti-scene--origin">
        <p className="ti-kicker">{plan.fromTrip ? "Most itt vagyunk" : "Innen indulunk"}</p>
        <h2 className="ti-title">
          <Letters text={plan.origin} baseDelay={450} />
        </h2>
        <div className="ti-pin" aria-hidden="true">
          <span className="ti-pin-ring" />
          <span className="ti-pin-ring ti-pin-ring--late" />
          <span className="ti-pin-dot" />
        </div>
      </section>

      {/* 2. jelenet — repülés és visszaszámlálás */}
      <section className="ti-scene ti-scene--flight">
        <div className="ti-count" aria-label={today ? "Ma indulunk" : `${plan.days} nap múlva indulunk`}>
          {today ? (
            <span className="ti-count-today">Ma indulunk!</span>
          ) : (
            <>
              <span className="ti-count-num" ref={countRef}>
                0
              </span>
              <span className="ti-count-unit">{tomorrow ? "nap · holnap indulunk" : "nap múlva indulunk"}</span>
            </>
          )}
        </div>
        <div className="ti-arc">
          <svg viewBox="0 0 380 200" aria-hidden="true">
            <path
              d={`M${ARC.p0[0]} ${ARC.p0[1]} Q${ARC.p1[0]} ${ARC.p1[1]} ${ARC.p2[0]} ${ARC.p2[1]}`}
              className="ti-arc-base"
            />
            <path
              ref={trailRef}
              d={`M${ARC.p0[0]} ${ARC.p0[1]} Q${ARC.p1[0]} ${ARC.p1[1]} ${ARC.p2[0]} ${ARC.p2[1]}`}
              className="ti-arc-trail"
            />
            <circle cx={ARC.p0[0]} cy={ARC.p0[1]} r="5" className="ti-arc-end" />
            <circle cx={ARC.p2[0]} cy={ARC.p2[1]} r="5" className="ti-arc-end ti-arc-end--dest" />
            <g ref={planeRef} className="ti-plane" style={{ opacity: 0 }}>
              <path d="M-15 0 L-5 -2.5 L-10 -13 L-5 -13 L5 -3.5 L15 -3.5 Q20 0 15 3.5 L5 3.5 L-5 13 L-10 13 L-5 2.5 Z" />
            </g>
          </svg>
          <span className="ti-arc-label ti-arc-label--from">{plan.origin}</span>
          <span className="ti-arc-label ti-arc-label--to">{plan.destination}</span>
        </div>
      </section>

      {/* 3. jelenet — úticél */}
      <section className="ti-scene ti-scene--dest">
        <p className="ti-kicker ti-kicker--warm">Következő utunk</p>
        <h2 className="ti-title ti-title--dest">
          <Letters text={plan.destination} baseDelay={4800} />
        </h2>
        <p className="ti-dest-meta">
          <span>{plan.title}</span>
          <span className="ti-dest-dates">{formatIntroRange(plan.startDate, plan.endDate)}</span>
        </p>
        <div className="ti-pin ti-pin--dest" aria-hidden="true">
          <span className="ti-pin-ring" />
          <span className="ti-pin-ring ti-pin-ring--late" />
          <span className="ti-pin-dot" />
        </div>
      </section>

      <div className="ti-progress" aria-hidden="true">
        <span className="ti-progress-bar" style={{ animationDuration: `${TRIP_INTRO_MS}ms` }} />
      </div>
      <p className="ti-skip" aria-hidden="true">Koppints a kihagyáshoz</p>
    </div>,
    host
  );
}
