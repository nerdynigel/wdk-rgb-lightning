// Unfunded isolated WDK process probe. Secrets arrive on stdin and never appear in output.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
input = "";
const seed = Buffer.from(request.seed, "hex");
request.seed = undefined;
const { default: Manager } = await import(
  pathToFileURL(
    path.resolve(
      "index-node.js",
    ),
  )
);
let manager;
try {
  manager = new Manager(seed, {
    network: "regtest",
    dataDir: request.nodePath,
    permissiveSignerPolicy: false,
    signerStorage: { path: request.storePath, mode: request.mode },
  });
  const account = await manager.getAccount();
  if (request.unlock) {
    await account.unlock({
      rpc_config: {
        bitcoind_rpc_username: process.env.WDK_RPC_USER,
        bitcoind_rpc_password: process.env.WDK_RPC_PASSWORD,
        bitcoind_rpc_host: "127.0.0.1",
        bitcoind_rpc_port: 18443,
      },
      indexer_url: "127.0.0.1:50001",
      proxy_endpoint: "rpc://127.0.0.1:3000/json-rpc",
      announce_addresses: [],
    });
    if ((await account.getNetworkInfo()).network !== "regtest")
      throw new Error("Wrong network");
  }
  // Public key material only. Equal identity alone is NOT a channel recovery proof.
  const identity = createHash("sha256")
    .update(JSON.stringify(account.keyPair))
    .digest("hex");
  manager.dispose();
  manager.dispose();
  process.stdout.write(JSON.stringify({ identity, disposed: true }));
} catch {
  try {
    manager?.dispose();
  } catch {
    /* Probe reports failure, never cleanup success. */
  }
  process.stdout.write(JSON.stringify({ rejected: true }));
  process.exitCode = 2;
} finally {
  seed.fill(0);
}
