# Experimental compatibility branch

This public fork carries minimal, upstream-oriented changes for self-custodial
RGB-Lightning atomic trading tests for BTCX on regtest. It is not a BTCX wallet,
not production-ready, and is intended to converge back to upstream. Other wallets
can integrate BTCX by capability; this fork is not required.

No funded use is supported. No permissive signer policy, hosted user keys,
custom cryptography or sequential-payment workaround is introduced.

Keep `main` aligned with upstream. Compatibility work stays on `btcx-phase2`.
Review source/dependency changes before syncing:

```sh
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git checkout btcx-phase2
git merge main
```

Rerun regressions after merging. Do not publish packages, releases or binaries.
Preserve the upstream licence.

## Exact dependency pins and remaining gates

WDK base: `4883283fb00a98db0251d5697a9eaa6edb870bb9` (beta.15).
Base wallet cleanup requires `nerdynigel/wdk-wallet@e6b0bad6e65225ca7175271e34b59928051a70f6`
(beta.14 base); its independent seed/signer cleanup cannot correctly be copied
into this module. The separate fork carries only that already-reviewed fix.
Node binding: `nerdynigel/rgb-lightning-node-nodejs@fb581ad7ec7014f5b64a3051a2ef1d8c7907ac74`
(beta.16 base `d7cadef35406bffa6bec83a50ceda2f0bb9eaebd`). Install that
exact source as the optional Node peer when exercising exact swap methods.
No Bare/mobile compatibility claim is made. Node 24 is required for lossless JSON.

Use the existing upstream beta.16 Linux GNU binary only after checking SHA256
`7fa8b97123d9b527ea628ec5d61c0ca0429583713faf7b83b92a2432197527ef`.
No binary is committed or published by this fork.

Run `node --test tests/compatibility/*.test.mjs` from this repository.
For the ninth persistence case, explicitly provide `WDK_REGTEST=1`,
`WDK_RPC_USER` and `WDK_RPC_PASSWORD` for isolated localhost regtest infrastructure.
Without that infrastructure the unlock case is skipped, never counted as passed.

Persistent initial-state restart is not funded recovery. The native RLN/VLS layer
still needs a fallible all-store quiescence/persistence barrier, coordinated
checkpoint/restore validation, and independent freshness authority that rejects
an internally consistent old checkpoint after subsequent activity. VSS presence,
file timestamps and matching local generations are insufficient.

Strict approved atomic execution additionally needs immutable exact-term native
registration, durable one-time consumption/reconciliation, and HTLC/signer
validation bound to that operation. Existing raw taker registration is not such
an approval. These capabilities remain absent; there is no JS substitute here.
See the recovery/approval contracts in BTCX commit b6c4081 under
`docs/UPSTREAM/patches/upstream-resolution/`. Those pending tests are not claimed
as passing. No funded testing or application adoption is authorized by these fixes.
