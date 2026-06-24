# Trust Signals & Token Launch Engineering

> Part of [solana-tokenomics-skill](SKILL.md). Load this file when the user asks
> about token launch sequence, authority revocation, anti-rug signals, metadata
> verification, transparency reports, or submitting to token registries.

---

## 1. The Golden Rule of Token Launch

> **Always follow this order:**
> `Deploy → Configure Metadata → Create Vesting Streams → Add & Lock LP → Revoke Authorities → Verify On-Chain → Announce`

Never revoke authorities before vesting and LP are live. Revocation is permanent — if you revoke mint authority before minting all team/investor allocations, those tokens are gone forever.

---

## 2. Authority Management — The Most Critical Trust Signal

### What the Three Authorities Control

| Authority | Controls | Keep or Revoke? |
|-----------|---------|----------------|
| **Mint Authority** | Can create new tokens (inflate supply) | Revoke if supply is fixed. Keep ONLY if you need ongoing emissions (staking rewards, etc.) — and document this clearly. |
| **Freeze Authority** | Can freeze any token account (prevent transfers) | Almost always revoke. Keeping it is a major red flag — it means you can block any holder from using their tokens. |
| **Update Authority** (Token-2022 / Metaplex) | Can change token metadata | Revoke after metadata is finalized. Keep ONLY if you plan future metadata updates (e.g., upgradeable NFTs). |

### Revoking Authorities (TypeScript)

```typescript
import {
  setAuthority,
  AuthorityType,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
const currentAuthority = payer; // The wallet that currently holds the authority

// ─── Revoke Mint Authority ────────────────────────────────────────────────────
// After this, no new tokens can ever be minted. Confirm total supply is correct first.
const revokeMintTx = await setAuthority(
  connection,
  currentAuthority,          // payer + signer
  mint,                      // mint address
  currentAuthority.publicKey, // current authority
  AuthorityType.MintTokens,  // which authority to revoke
  null,                      // new authority = null = revoke permanently
  [],
  undefined,
  TOKEN_PROGRAM_ID           // or TOKEN_2022_PROGRAM_ID for Token-2022
);
console.log("Mint authority revoked:", revokeMintTx);

// ─── Revoke Freeze Authority ──────────────────────────────────────────────────
const revokeFreezetx = await setAuthority(
  connection,
  currentAuthority,
  mint,
  currentAuthority.publicKey,
  AuthorityType.FreezeAccount,
  null,
  [],
  undefined,
  TOKEN_PROGRAM_ID
);
console.log("Freeze authority revoked:", revokeFreezetx);
```

### Verifying Revocation
```typescript
import { getMint } from "@solana/spl-token";

const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);

console.log("Mint Authority:", mintInfo.mintAuthority?.toBase58() ?? "REVOKED ✅");
console.log("Freeze Authority:", mintInfo.freezeAuthority?.toBase58() ?? "REVOKED ✅");
console.log("Supply:", mintInfo.supply.toString());
console.log("Decimals:", mintInfo.decimals);
```

---

## 3. Metadata Verification

### Step 1 — On-Chain Metadata (Metaplex Standard)

If you're using Metaplex metadata (most common), verify it with:

```typescript
import { Metaplex } from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";

const metaplex = Metaplex.make(connection);
const mintAddress = new PublicKey("YOUR_TOKEN_MINT");

const token = await metaplex.nfts().findByMint({ mintAddress });

console.log("Name:", token.name);
console.log("Symbol:", token.symbol);
console.log("URI:", token.uri);
console.log("Update Authority:", token.updateAuthorityAddress.toBase58());

// Fetch the off-chain JSON
const response = await fetch(token.uri);
const offChainMetadata = await response.json();
console.log("Off-chain metadata:", offChainMetadata);
```

### Metadata JSON Standard (Token Metadata Standard)
```json
{
  "name": "Your Token",
  "symbol": "TKN",
  "description": "One clear sentence describing what your token does.",
  "image": "https://your-cdn.com/token-logo-512x512.png",
  "external_url": "https://yourproject.com",
  "attributes": [],
  "properties": {
    "category": "fungible",
    "links": {
      "twitter": "https://twitter.com/yourproject",
      "discord": "https://discord.gg/yourproject",
      "website": "https://yourproject.com"
    }
  }
}
```

**Metadata hosting requirements:**
- Use a permanent, decentralized host: **Arweave** (via Irys/Bundlr) or **IPFS** (via Pinata, NFT.Storage)
- Avoid GitHub raw links (can 404 if repo changes), AWS S3 (can be deleted), or Imgur
- 512×512px PNG logo minimum; SVG preferred where supported

### Step 2 — Submit Token Metadata to Indexers and Aggregators

```bash
# Jupiter token list / organic score docs:
# https://station.jup.ag/docs/token-list/token-list-api
#
# Solscan token info submission:
# https://solscan.io/token/YOUR_MINT_ADDRESS
#
# Also confirm Birdeye and DexScreener resolve the pool/token correctly.
```

Common metadata fields expected by indexers and aggregators:
- Mint address
- Name, Symbol, Decimals
- Logo URI (hosted on Arweave/IPFS)
- Tags (if applicable: stablecoin, wrapped, etc.)

### Step 3 — Verify on Solscan

1. Go to `https://solscan.io/token/YOUR_MINT_ADDRESS`
2. Click "Submit Token Info" to request verification
3. Provide: project name, description, logo, website, social links
4. After verification: green checkmark appears — major trust signal

---

## 4. Anti-Rug Checklist

This is what sophisticated buyers and tools like SolSniffer and GoPlus check. Run through this before announcing your launch.

### Automated Checks (Run These Yourself First)
```bash
# SolSniffer — tokenomics and authority check
# https://solsniffer.com/scanner?address=YOUR_MINT

# GoPlus Security — comprehensive risk scan  
# https://gopluslabs.io/token-security/101/YOUR_MINT

# DEX Screener — liquidity verification
# https://dexscreener.com/solana/YOUR_POOL_ADDRESS

# Birdeye — holder distribution and whale analysis
# https://birdeye.so/token/YOUR_MINT
```

### Authority Checklist
- [ ] Mint authority: **REVOKED** (or documented emission schedule if kept)
- [ ] Freeze authority: **REVOKED**
- [ ] Update authority: **REVOKED** (or documented reason if kept)
- [ ] If Token-2022: PermanentDelegate is **NOT** set (or prominently disclosed)

### Liquidity Checklist
- [ ] LP tokens locked (minimum 6 months, 12+ preferred)
- [ ] LP lock proof URL available and working
- [ ] LP represents ≥5% of FDV at launch
- [ ] Pool address verified on DEX explorer

### Supply Checklist
- [ ] Total supply matches allocation model exactly (verify on-chain)
- [ ] No hidden wallets holding >5% of supply
- [ ] Team wallets on verified vesting schedules (Streamflow links)
- [ ] Investor wallets on verified vesting schedules
- [ ] Supply shock calendar published

### Code & Audit Checklist
- [ ] Source code verified on-chain (Solana Verify or anchor build --verifiable)
- [ ] Security audit completed (or acknowledged as pending with timeline)
- [ ] No honeypot mechanisms in transfer hooks (if Token-2022)
- [ ] Bug bounty program announced (even a small one signals confidence)

### Social & Transparency Checklist
- [ ] Twitter/X account active and consistent
- [ ] Discord or Telegram with active moderation
- [ ] Team doxxed or KYC'd (or clearly disclosed as anon with reason)
- [ ] Tokenomics published on website/docs
- [ ] Treasury wallet publicly known

---

## 5. The Transparency Report

Publish this as a public document (Notion, Mirror, GitHub, or your website) at TGE. It is the single most powerful trust signal you can provide.

### Template

```markdown
# [PROJECT NAME] — Token Launch Transparency Report
Date: [TGE DATE]
Network: Solana Mainnet-Beta

---

## Token Details
- **Mint Address:** [ADDRESS]
- **Solscan:** https://solscan.io/token/[ADDRESS]
- **Total Supply:** [AMOUNT] [SYMBOL]
- **Decimals:** 6
- **Token Standard:** SPL Token / Token-2022

---

## Supply Allocation

| Allocation | % | Tokens | Vesting |
|-----------|---|--------|---------|
| Team | 18% | 180,000,000 | 12mo cliff, 36mo linear |
| Seed Investors | 8% | 80,000,000 | 6mo cliff, 24mo linear |
| Community | 35% | 350,000,000 | Governed, 48mo stream |
| Treasury | 19% | 190,000,000 | Multisig — 3/5 required |
| Initial LP | 10% | 100,000,000 | Locked 12 months |
| Strategic/Advisors | 10% | 100,000,000 | Various schedules |

**Circulating at TGE:** [AMOUNT] ([%]% of total)

---

## Authority Status
- **Mint Authority:** REVOKED — [TX_HASH]
- **Freeze Authority:** REVOKED — [TX_HASH]
- **Update Authority:** REVOKED / Active (reason: [REASON]) — [TX_HASH or ADDRESS]

---

## Vesting Proof
| Stakeholder | Stream URL | Amount | Schedule |
|------------|-----------|--------|---------|
| Team — Alice | https://app.streamflow.finance/stream/[ID] | 5M TKN | 12mo cliff, 36mo linear |
| Team — Bob | https://app.streamflow.finance/stream/[ID] | 3M TKN | 12mo cliff, 36mo linear |
| Seed — VC Fund | https://app.streamflow.finance/stream/[ID] | 8M TKN | 6mo cliff, 24mo linear |

---

## Liquidity
- **Pool:** Meteora DLMM / Raydium CPMM
- **Pool Address:** [ADDRESS]
- **Initial LP:** [AMOUNT] [SYMBOL] + [AMOUNT] SOL
- **LP Lock:** [LOCK_URL] — locked until [DATE]
- **LP Token Mint:** [ADDRESS]

---

## Supply Shock Calendar
| Date | Event | Tokens | % Supply |
|------|-------|--------|---------|
| [DATE] | TGE — LP live | 100M | 10% |
| [DATE+6mo] | Seed investor cliff ends (streaming begins) | ~3.3M/mo | 0.33%/mo |
| [DATE+12mo] | Team cliff ends (streaming begins) | ~5M/mo | 0.5%/mo |
| [DATE+12mo] | LP lock expires | — | — |

---

## Treasury
- **Address:** [MULTISIG_ADDRESS]
- **Signers:** 3-of-5 multisig (Squads Protocol)
- **Balance:** 190,000,000 [SYMBOL]
- **Squads URL:** https://app.squads.so/squads/[ADDRESS]

---

## Security
- **Audit:** [LINK] by [FIRM] — [DATE]
- **Bug Bounty:** [LINK or "coming soon — [DATE]"]
- **SolSniffer Score:** [SCORE]/100
- **Source Code:** [GITHUB_LINK]

---

*This report was published at TGE and will be updated after any material change.*
```

---

## 6. Launch Day Sequence — Step by Step

### Pre-Launch (T-7 Days)
- [ ] Deploy token on devnet — run full end-to-end test
- [ ] Test vesting streams on devnet (advance clock, simulate claims)
- [ ] Prepare all mainnet wallets and multisig
- [ ] Prepare transparency report (fill in everything except tx hashes)
- [ ] Prepare LP creation scripts

### Launch Day (T-0)

**Hour 0 — Deploy**
1. Deploy token mint to mainnet
2. Record mint address
3. Mint all tokens to treasury/distribution wallet

**Hour 0.5 — Metadata**
4. Upload logo to Arweave/IPFS
5. Upload metadata JSON
6. Create/update on-chain metadata (Metaplex)
7. Verify metadata renders correctly on Solscan

**Hour 1 — Distribution**
8. Create all vesting streams (team, investors, advisors)
9. Record all stream IDs and URLs
10. Transfer community allocation to DAO/multisig
11. Verify on-chain: all allocations match model

**Hour 2 — Liquidity**
12. Create liquidity pool
13. Add LP (equal value both sides)
14. Lock LP tokens immediately
15. Record pool address and lock proof URL

**Hour 3 — Revoke**
16. Revoke mint authority
17. Revoke freeze authority
18. Record revocation tx hashes
19. Verify: `getMint()` shows null for both authorities

**Hour 4 — Verify**
20. Submit to Solscan for verification
21. Submit to Jupiter token list
22. Run SolSniffer and GoPlus — fix any flagged issues
23. Check Birdeye and DexScreener — token visible

**Hour 5 — Announce**
24. Publish transparency report
25. Announce on Twitter/X with report link
26. Post in Discord/Telegram with full details
27. Pin transparency report in community channels

---

## 7. Post-Launch Monitoring (First 30 Days)

Set up monitoring for:
- [ ] Wallet concentration: alert if any wallet accumulates >5% of supply
- [ ] LP depth: daily check, alert if falls below minimum viable LP
- [ ] Price impact: monitor slippage on standard trade sizes
- [ ] Vesting stream health: confirm all streams are flowing correctly
- [ ] Supply shock dates: pre-announce all unlock events 30 days ahead

**Tools:**
- Helius webhooks — real-time alerts on wallet activity
- Birdeye portfolio — holder distribution
- DeFiLlama — LP TVL tracking
- step.finance — impermanent loss monitoring

---

## Related Sub-skills
- Finalize allocation model before this step → [`design.md`](design.md)
- Confirm token standard before deploying → [`token-standard.md`](token-standard.md)
- Set up vesting streams → [`vesting.md`](vesting.md)
- Size and create LP → [`liquidity.md`](liquidity.md)
