import { describe, it, expect } from "vitest";
import {
  addDays,
  computeTimelineWindow,
  dateToOffset,
  daysBetween,
  isWeekend,
  offsetToDate,
  resizeRange,
  shiftRange,
  spanWidth,
  startOfDay,
  toIsoDate,
  ZOOM_DAY_WIDTH,
  ZOOM_GRID_STEP,
} from "../timeline";

const D = (s: string) => new Date(s);

describe("startOfDay", () => {
  it("zeroes UTC hours/minutes/seconds/ms", () => {
    const out = startOfDay(D("2026-05-21T13:45:30.500Z"));
    expect(out.getUTCHours()).toBe(0);
    expect(out.getUTCMinutes()).toBe(0);
    expect(out.getUTCSeconds()).toBe(0);
    expect(out.getUTCMilliseconds()).toBe(0);
  });
});

describe("daysBetween", () => {
  it("is 0 for the same UTC calendar day", () => {
    expect(
      daysBetween(D("2026-05-21T01:00:00Z"), D("2026-05-21T23:00:00Z")),
    ).toBe(0);
  });
  it("counts forward days", () => {
    expect(daysBetween(D("2026-05-21Z"), D("2026-05-24Z"))).toBe(3);
  });
  it("counts backward days as negative", () => {
    expect(daysBetween(D("2026-05-24Z"), D("2026-05-21Z"))).toBe(-3);
  });
});

describe("addDays", () => {
  it("advances by N days", () => {
    expect(addDays(D("2026-05-21"), 5).toISOString().slice(0, 10)).toBe("2026-05-26");
  });
  it("rewinds with negative N", () => {
    expect(addDays(D("2026-05-21"), -3).toISOString().slice(0, 10)).toBe("2026-05-18");
  });
});

describe("isWeekend", () => {
  it("true for Sat/Sun", () => {
    // 2026-05-23 is a Saturday; 2026-05-24 is a Sunday.
    expect(isWeekend(D("2026-05-23"))).toBe(true);
    expect(isWeekend(D("2026-05-24"))).toBe(true);
  });
  it("false for Mon-Fri", () => {
    // 2026-05-21 is a Thursday.
    expect(isWeekend(D("2026-05-21"))).toBe(false);
  });
});

describe("computeTimelineWindow", () => {
  it("returns a 30-day fallback when no rows", () => {
    const w = computeTimelineWindow({ starts: [], ends: [], zoom: "week" });
    expect(w.totalDays).toBe(30);
    expect(w.dayWidth).toBe(ZOOM_DAY_WIDTH.week);
    expect(w.gridStep).toBe(ZOOM_GRID_STEP.week);
    expect(w.timelineWidth).toBe(30 * w.dayWidth);
  });

  it("expands to cover earliest start through latest end + pad", () => {
    const w = computeTimelineWindow({
      starts: [D("2026-05-10").getTime()],
      ends: [D("2026-05-30").getTime()],
      zoom: "week",
      padDays: 2,
    });
    // origin = 2026-05-08 (2 days before earliest start); end day = 2026-05-30
    // total = max(14, daysBetween(origin, latestEnd) + padDays + 2)
    //       = max(14, 22 + 2 + 2) = 26
    expect(w.totalDays).toBeGreaterThanOrEqual(26);
    expect(w.origin.toISOString().slice(0, 10)).toBe("2026-05-08");
  });

  it("emits ticks at grid-step intervals", () => {
    const w = computeTimelineWindow({
      starts: [D("2026-05-10").getTime()],
      ends: [D("2026-05-30").getTime()],
      zoom: "week",
    });
    // gridStep = 7. The for-loop runs while i <= total, so we get
    // floor(total / 7) + 1 ticks.
    expect(w.ticks.length).toBeGreaterThanOrEqual(4);
    // Each tick spaced by 7 days from the previous.
    for (let i = 1; i < w.ticks.length; i++) {
      expect(daysBetween(w.ticks[i - 1], w.ticks[i])).toBe(7);
    }
  });

  it("uses finer grid step in day zoom", () => {
    const w = computeTimelineWindow({
      starts: [D("2026-05-10").getTime()],
      ends: [D("2026-05-15").getTime()],
      zoom: "day",
    });
    expect(w.gridStep).toBe(1);
    expect(w.dayWidth).toBe(ZOOM_DAY_WIDTH.day);
  });

  it("uses coarser grid step in quarter zoom", () => {
    const w = computeTimelineWindow({
      starts: [D("2026-01-01").getTime()],
      ends: [D("2026-12-31").getTime()],
      zoom: "quarter",
    });
    expect(w.gridStep).toBe(ZOOM_GRID_STEP.quarter);
    expect(w.dayWidth).toBe(ZOOM_DAY_WIDTH.quarter);
  });
});

describe("dateToOffset / offsetToDate round-trip", () => {
  it("converts dates to px offsets relative to origin", () => {
    const origin = D("2026-05-10");
    expect(dateToOffset(D("2026-05-15"), origin, 24)).toBe(5 * 24);
    expect(dateToOffset(origin, origin, 24)).toBe(0);
  });
  it("snaps offsets back to whole days", () => {
    const origin = D("2026-05-10");
    const out = offsetToDate(5 * 24 + 8, origin, 24); // 8 px past day 5
    expect(out.toISOString().slice(0, 10)).toBe("2026-05-15");
  });
});

describe("spanWidth", () => {
  it("is at least 1 day wide even when start === end", () => {
    expect(spanWidth(D("2026-05-15"), D("2026-05-15"), 24)).toBe(24);
  });
  it("is inclusive (start + end count)", () => {
    expect(spanWidth(D("2026-05-15"), D("2026-05-17"), 24)).toBe(3 * 24);
  });
});

describe("shiftRange", () => {
  it("moves both ends by the same delta", () => {
    const out = shiftRange(D("2026-05-10"), D("2026-05-15"), 3);
    expect(out.start.toISOString().slice(0, 10)).toBe("2026-05-13");
    expect(out.end.toISOString().slice(0, 10)).toBe("2026-05-18");
  });
});

describe("resizeRange", () => {
  it("resizes the start edge", () => {
    const out = resizeRange(D("2026-05-10"), D("2026-05-15"), "start", 2);
    expect(out.start.toISOString().slice(0, 10)).toBe("2026-05-12");
    expect(out.end.toISOString().slice(0, 10)).toBe("2026-05-15");
  });
  it("resizes the end edge", () => {
    const out = resizeRange(D("2026-05-10"), D("2026-05-15"), "end", 2);
    expect(out.end.toISOString().slice(0, 10)).toBe("2026-05-17");
  });
  it("clamps start so it never crosses end", () => {
    const out = resizeRange(D("2026-05-10"), D("2026-05-15"), "start", 100);
    expect(daysBetween(out.start, out.end)).toBeGreaterThanOrEqual(0);
  });
  it("clamps end so it never crosses start", () => {
    const out = resizeRange(D("2026-05-10"), D("2026-05-15"), "end", -100);
    expect(daysBetween(out.start, out.end)).toBeGreaterThanOrEqual(0);
  });
});

describe("toIsoDate", () => {
  it("returns a UTC-midnight ISO string", () => {
    expect(toIsoDate(D("2026-05-21T13:45:00Z"))).toBe("2026-05-21T00:00:00.000Z");
  });
});
