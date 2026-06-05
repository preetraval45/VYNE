// PH-J — In-memory pub/sub bus contract tests.
//
// The bus is the entire fallback transport when no Pusher / Supabase
// env is configured. Properties we MUST keep working:
//   1. publish reaches every current subscriber on the same channel.
//   2. publish DOES NOT cross channels.
//   3. unsubscribe removes the subscriber + a subsequent publish does
//      NOT reach it.
//   4. Last-Event-ID replay surfaces events the client missed while
//      disconnected.
//   5. Ring buffer is bounded (no unbounded memory growth on a chatty
//      channel).
//   6. A throwing subscriber is removed without taking out siblings.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { subscribe, publish, busStats, _resetBusForTests } from "../sseBus";

beforeEach(() => {
  _resetBusForTests();
});

function spy() {
  return vi.fn((_id: string, _event: string, _data: string) => undefined);
}

describe("sseBus — pub/sub basics", () => {
  it("delivers a publish to every subscriber on the same channel", () => {
    const a = spy();
    const b = spy();
    subscribe("ch", null, { id: "sub-a", send: a });
    subscribe("ch", null, { id: "sub-b", send: b });
    publish("ch", "hello", { who: "world" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    const [aid, aevent, adata] = a.mock.calls[0];
    expect(aevent).toBe("hello");
    expect(JSON.parse(adata)).toEqual({ who: "world" });
    expect(aid).toBe("1"); // monotonic per channel, starts at 1
  });

  it("does NOT cross channels", () => {
    const a = spy();
    const b = spy();
    subscribe("ch-A", null, { id: "sub-a", send: a });
    subscribe("ch-B", null, { id: "sub-b", send: b });
    publish("ch-A", "x", 1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it("unsubscribe stops further deliveries to that subscriber", () => {
    const a = spy();
    const { unsubscribe } = subscribe("ch", null, { id: "sub-a", send: a });
    publish("ch", "first", null);
    unsubscribe();
    publish("ch", "second", null);
    expect(a).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][1]).toBe("first");
  });

  it("removes a throwing subscriber but keeps delivering to siblings", () => {
    const good = spy();
    const bad = vi.fn(() => {
      throw new Error("subscriber blew up");
    });
    subscribe("ch", null, { id: "good", send: good });
    subscribe("ch", null, { id: "bad", send: bad });
    publish("ch", "x", 1);
    publish("ch", "x", 2);
    // good gets BOTH; bad gets evicted after the first throw so only 1
    expect(good).toHaveBeenCalledTimes(2);
    expect(bad).toHaveBeenCalledTimes(1);
  });
});

describe("sseBus — Last-Event-ID replay", () => {
  it("replays events with id > lastEventId on (re)subscribe", () => {
    const noop = spy();
    // Build history with 3 events (ids 1, 2, 3).
    subscribe("ch", null, { id: "warmup", send: noop });
    publish("ch", "a", 1);
    publish("ch", "b", 2);
    publish("ch", "c", 3);

    // Reconnect at id=1 — should replay ids 2 + 3.
    const { replay } = subscribe("ch", "1", {
      id: "reconnect",
      send: spy(),
    });
    expect(replay.map((e) => e.id)).toEqual(["2", "3"]);
    expect(replay.map((e) => e.event)).toEqual(["b", "c"]);
  });

  it("returns empty replay when lastEventId is up-to-date", () => {
    const noop = spy();
    subscribe("ch", null, { id: "warmup", send: noop });
    publish("ch", "a", 1);
    publish("ch", "b", 2);
    const { replay } = subscribe("ch", "2", { id: "x", send: spy() });
    expect(replay).toEqual([]);
  });

  it("returns empty replay when there is no prior id", () => {
    const { replay } = subscribe("ch", null, { id: "x", send: spy() });
    expect(replay).toEqual([]);
  });

  it("ignores a malformed Last-Event-ID string", () => {
    subscribe("ch", null, { id: "warmup", send: spy() });
    publish("ch", "a", 1);
    const { replay } = subscribe("ch", "not-a-number", {
      id: "x",
      send: spy(),
    });
    expect(replay).toEqual([]);
  });
});

describe("sseBus — bounded memory", () => {
  it("ring buffer caps at the documented limit (100)", () => {
    subscribe("ch", null, { id: "x", send: spy() });
    for (let i = 0; i < 250; i++) publish("ch", "e", i);
    const stats = busStats();
    // One channel, one subscriber, ring at the cap.
    expect(stats.channelCount).toBe(1);
    expect(stats.subscriberCount).toBe(1);
    expect(stats.ringEntries).toBe(100);
  });

  it("busStats sums across channels", () => {
    subscribe("ch-A", null, { id: "a1", send: spy() });
    subscribe("ch-A", null, { id: "a2", send: spy() });
    subscribe("ch-B", null, { id: "b1", send: spy() });
    publish("ch-A", "x", 1);
    publish("ch-B", "x", 1);
    const stats = busStats();
    expect(stats.channelCount).toBe(2);
    expect(stats.subscriberCount).toBe(3);
    expect(stats.ringEntries).toBe(2);
  });
});
