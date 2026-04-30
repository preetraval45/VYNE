"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// On/off geolocation tracker. While on, samples coordinates every ~5s
// (browser-decided), computes haversine distance between consecutive
// points, and accumulates trip miles. Persists trips to localStorage
// and tallies reimbursement at the IRS 2026 standard rate ($0.67/mi).

interface MileageTrip {
  id: string;
  date: string;
  miles: number;
  purpose: string;
}

const RATE = 0.67;

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

export function MileageTab() {
  const [trips, setTrips] = useState<MileageTrip[]>([]);
  const [tracking, setTracking] = useState(false);
  const [liveMiles, setLiveMiles] = useState(0);
  const [purpose, setPurpose] = useState("");
  const watchRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const accumRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("vyne-mileage");
      if (raw) setTrips(JSON.parse(raw) as MileageTrip[]);
    } catch {
      // ignore
    }
  }, []);

  function persist(next: MileageTrip[]) {
    setTrips(next);
    try {
      localStorage.setItem("vyne-mileage", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation not supported in this browser.");
      return;
    }
    accumRef.current = 0;
    setLiveMiles(0);
    lastPosRef.current = null;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current, here);
          if (d > 0.006) {
            accumRef.current += d;
            setLiveMiles(Math.round(accumRef.current * 100) / 100);
          }
        }
        lastPosRef.current = here;
      },
      () => {
        toast.error("Couldn't access location. Tracking stopped.");
        stop(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    watchRef.current = id;
    setTracking(true);
  }

  function stop(save = true) {
    if (watchRef.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
    setTracking(false);
    if (save && accumRef.current > 0) {
      const trip: MileageTrip = {
        id: `m${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        miles: Math.round(accumRef.current * 100) / 100,
        purpose: purpose || "Business",
      };
      persist([trip, ...trips]);
      toast.success(`Logged ${trip.miles} mi`);
      setPurpose("");
    }
    accumRef.current = 0;
    setLiveMiles(0);
    lastPosRef.current = null;
  }

  function deleteTrip(id: string) {
    persist(trips.filter((t) => t.id !== id));
  }

  const totalMiles = trips.reduce((s, t) => s + t.miles, 0);
  const reimbursable = totalMiles * RATE;

  return (
    <div>
      <section
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Mileage tracker</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
            {tracking
              ? `Tracking · ${liveMiles.toFixed(2)} mi this trip`
              : `${trips.length} trips · ${totalMiles.toFixed(1)} mi · ~$${reimbursable.toFixed(2)} reimbursable @ $${RATE}/mi`}
          </p>
        </div>
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Trip purpose (optional)"
          aria-label="Trip purpose"
          style={{
            padding: "7px 10px",
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            minWidth: 200,
          }}
        />
        <button
          type="button"
          onClick={tracking ? () => stop(true) : start}
          aria-pressed={tracking}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: tracking ? "#dc2626" : "var(--vyne-accent, #5B5BD6)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {tracking ? "Stop & save" : "Start tracking"}
        </button>
      </section>

      <section
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table className="m-cards" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {["Date", "Miles", "Purpose", "Reimbursable", ""].map((h, i) => (
                <th
                  key={h || `act-${i}`}
                  style={{
                    padding: "9px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No trips logged yet. Start tracking to add one.
                </td>
              </tr>
            ) : (
              trips.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderTop: "1px solid var(--content-border)" }}
                >
                  <td data-th="Date" style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {t.date}
                  </td>
                  <td data-th="Miles" style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    {t.miles.toFixed(2)}
                  </td>
                  <td data-th="Purpose" style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {t.purpose}
                  </td>
                  <td data-th="Reimbursable" style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-primary)" }}>
                    ${(t.miles * RATE).toFixed(2)}
                  </td>
                  <td data-th="" style={{ padding: "10px 14px", textAlign: "right" }}>
                    <a
                      href={`/expenses/new?amount=${(t.miles * RATE).toFixed(2)}&description=${encodeURIComponent(`Mileage: ${t.miles.toFixed(1)} mi · ${t.purpose}`)}&category=transport&date=${t.date}`}
                      style={{
                        marginRight: 10,
                        color: "var(--vyne-accent, #5B5BD6)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      → Expense
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteTrip(t.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
