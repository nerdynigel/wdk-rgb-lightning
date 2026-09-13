import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import Base from "../../src/wallet-manager-rgb-lightning.js";
for (const scenario of [
  "created",
  "locked",
  "bootstrap cleanup failure",
  "unlock failure",
  "successful unlock",
  "double dispose",
  "native shutdown failure",
  "partial initialization failure",
  "partial init and shutdown failure",
]) {
  test(`upstream manager lifecycle: ${scenario}`, async () => {
    let shutdowns = 0;
    let destroyed = false;
    class Binding {
      attachExternalSigner() {
        if (scenario.startsWith("partial"))
          throw new Error("initialization failed");
      }
      bootstrap() {
        if (scenario === "bootstrap cleanup failure")
          throw new Error("bootstrap failed");
        assert.equal(
          destroyed,
          false,
          "bootstrap was accessed after destruction",
        );
        return { node_id: `02${"11".repeat(32)}` };
      }
      unlock() {
        if (scenario === "unlock failure") throw new Error("unlock failed");
      }
      shutdown() {
        shutdowns++;
        destroyed = true;
        if (scenario.includes("shutdown failure"))
          throw new Error("shutdown failed");
      }
    }
    class Manager extends Base {
      static get Binding() {
        return Binding;
      }
    }
    const seed = randomBytes(32);
    const manager = new Manager(seed, {
      network: "regtest",
      dataDir: "unused-test-binding",
      permissiveSignerPolicy: false,
    });
    const retainedSeed = manager.seed;
    if (scenario.startsWith("partial"))
      await assert.rejects(manager.getAccount());
    else if (scenario !== "created") {
      const account = await manager.getAccount();
      if (scenario === "unlock failure")
        await assert.rejects(account.unlock({}));
      if (scenario === "successful unlock") await account.unlock({});
    }
    if (
      ["native shutdown failure", "bootstrap cleanup failure"].includes(
        scenario,
      )
    )
      assert.throws(() => manager.dispose(), AggregateError);
    else manager.dispose();
    manager.dispose();
    assert.equal(shutdowns, scenario === "created" ? 0 : 1);
    assert.equal(
      retainedSeed.every((byte) => byte === 0),
      true,
    );
    await assert.rejects(manager.getAccount(), /disposed/);
    seed.fill(0);
  });
}

