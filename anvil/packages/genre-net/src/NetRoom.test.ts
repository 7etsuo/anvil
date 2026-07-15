import { describe, expect, it } from "vitest";
import { createLoopbackSession } from "./loopbackSession.js";
import { decodeMessage, encodeMessage } from "./messages.js";
import { LoopbackTransport } from "./transport.js";

describe("messages", () => {
  it("round-trips state JSON", () => {
    const msg = {
      type: "state" as const,
      tick: 3,
      entities: [{ id: "a", x: 1, y: 2, hp: 5 }],
    };
    const back = decodeMessage(encodeMessage(msg));
    expect(back).toEqual(msg);
  });
});

describe("loopback Transport", () => {
  it("delivers bytes peer-to-peer", () => {
    const [a, b] = LoopbackTransport.pair();
    const got: string[] = [];
    b.onMessage((bytes) => {
      got.push(new TextDecoder().decode(bytes));
    });
    a.send(new TextEncoder().encode("ping"));
    expect(got).toEqual(["ping"]);
    a.close();
    b.close();
  });
});

describe("NetRoom loopback 2-peer (S-NET acceptance)", () => {
  it("client sees host player after handshake", () => {
    const s = createLoopbackSession();
    s.stepBoth(2);
    const hostOnClient = s.client.getEntity("host");
    expect(hostOnClient).toBeDefined();
    expect(hostOnClient!.x).toBeCloseTo(100, 0);
    s.close();
  });

  it("move one peer; other observes position within N ticks", () => {
    const s = createLoopbackSession({ moveSpeed: 300, fixedDt: 1 / 60 });
    s.stepBoth(2);

    const before = s.client.getEntity("host")!.x;

    // Host moves right
    s.host.setAction("move_right", true);
    // Within N ticks (≤ 10) client must see x increase
    let updated = false;
    for (let i = 0; i < 10; i++) {
      s.stepBoth(1);
      const x = s.client.getEntity("host")!.x;
      if (x > before + 1) {
        updated = true;
        break;
      }
    }
    expect(updated).toBe(true);

    // Client moves left; host (authority) sees client position change
    s.host.setAction("move_right", false);
    s.client.setAction("move_left", true);
    const clientX0 = s.host.getEntity("client")!.x;
    for (let i = 0; i < 10; i++) s.stepBoth(1);
    const clientX1 = s.host.getEntity("client")!.x;
    expect(clientX1).toBeLessThan(clientX0);

    // Client mirror of itself matches host authority
    s.stepBoth(1);
    const clientLocal = s.client.getEntity("client")!;
    const clientOnHost = s.host.getEntity("client")!;
    expect(clientLocal.x).toBeCloseTo(clientOnHost.x, 1);
    expect(clientLocal.hp).toBe(clientOnHost.hp);

    s.close();
  });

  it("host is authoritative for hp", () => {
    const s = createLoopbackSession();
    s.stepBoth(2);
    s.host.damage("client", 3);
    s.stepBoth(2);
    expect(s.client.getEntity("client")!.hp).toBe(7);
    expect(s.host.getEntity("client")!.hp).toBe(7);
    s.close();
  });
});
