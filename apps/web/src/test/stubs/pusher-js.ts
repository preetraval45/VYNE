// PH-H — vitest stub for pusher-js. Vite 7's stricter exports
// resolution can't read pusher-js's package.json main field, which
// breaks any test that transitively imports a store going through
// lib/realtime/pusher.ts. The vitest.config aliases "pusher-js" to
// this file so tests never touch the real package.

class MockChannel {
  bind() {}
  unbind() {}
  unbind_all() {}
  trigger() {}
}

export default class Pusher {
  connection = {
    state: "disconnected" as const,
    bind: () => {},
    unbind: () => {},
  };
  subscribe(): MockChannel {
    return new MockChannel();
  }
  unsubscribe() {}
  disconnect() {}
  bind() {}
  unbind() {}
  trigger() {}
}
