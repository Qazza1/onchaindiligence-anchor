# OnchainDiligence — Attestation Anchoring (Tempo)

A minimal, storage-frugal smart contract that anchors the hashes of [OnchainDiligence](https://onchaindiligence.com) compliance attestations on **Tempo**, giving independent, timestamped, tamper-evident proof that a check happened — without putting any subject data on-chain.

## Why

OnchainDiligence already returns Ed25519-signed attestations over each compliance check. A signature proves *the server* vouches for a result. Anchoring its hash on a public chain turns that into something stronger: anyone can verify the attestation existed at a specific time, against an immutable public record, without trusting or re-contacting the API.

## Privacy by design

Only the `keccak256` hash of an attestation signature is stored — never a wallet address, name, company, or result. You cannot learn *who* was screened or *what* the answer was from on-chain data. To verify, a holder presents the original attestation off-chain; anyone hashes its signature and checks the hash was anchored.

## The contract

`AttestationRegistry.sol`:
- `anchor(bytes32)` / `anchorBatch(bytes32[])` — issuer-only, append-only, immutable (re-anchoring reverts; batch is idempotent).
- `isAnchored(bytes32)` / `anchoredAt(bytes32)` — public reads.
- `transferIssuer(address)` — key rotation.

It is non-payable and never reads `msg.value` (always 0 on Tempo), and stores one word + a small timestamp per anchor — appropriate for Tempo's no-native-gas, higher state-write-cost model.

## Tempo notes

- **No native gas token.** Gas is paid in pathUSD (TIP-20). The deployer/issuer wallet must hold pathUSD.
- **Networks:** Moderato testnet (chainId `42431`, `https://rpc.moderato.tempo.xyz`) and mainnet (chainId `4217`, `https://rpc.tempo.xyz`).
- **Testnet faucet:** `cast rpc tempo_fundAddress <ADDRESS> --rpc-url https://rpc.moderato.tempo.xyz`

## Develop

```bash
npm install
npx hardhat test          # full behavioural test suite
```

## Deploy (testnet first)

```bash
# .env:
#   DEPLOYER_PRIVATE_KEY=0x...   (wallet funded with testnet pathUSD)
#   ISSUER_ADDRESS=0x...         (optional; defaults to the deployer)

npm run deploy:testnet
```

The script prints the deployed address and the env var to add to the API (`ANCHOR_CONTRACT_ADDRESS`).

## License

MIT
