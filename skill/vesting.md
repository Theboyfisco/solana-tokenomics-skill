# Vesting & Token Distribution

> Part of [solana-tokenomics-skill](SKILL.md). Load this file when the user asks
> about vesting schedules, vesting programs, Streamflow setup, cliff/linear unlock,
> multi-beneficiary distribution, or building a custom Anchor vesting contract.

---

## 1. Choosing Your Vesting Approach

```
Does your team have Anchor experience?
│
├─ No / Limited ──► Use Streamflow or Smithii (audited, no-code/low-code)
│
└─ Yes ──────────► Do you want zero external runtime dependency?
                   │
                   ├─ No  ──► Use Streamflow (SDK v5+, most features)
                   └─ Yes ──► Build custom Anchor vesting program (full sovereignty)
```

### Platform Comparison

| Platform | Type | Features | Best For |
|----------|------|---------|---------|
| **Streamflow** | On-chain protocol | Linear, cliff, milestone, price-based, multi-recipient | Most projects — audited, flexible |
| **Smithii** | No-code UI | Linear, cliff | Non-technical founders, simple schedules |
| **Jupiter Lock** | Token lock | Time-locked escrow | LP locks, simple advisor locks |
| **Custom Anchor** | Self-deployed | Fully custom logic | Teams wanting zero external dependency |

**Default recommendation:** Streamflow for most projects. It's audited (multiple firms), supports every schedule type you'll need, and has a clean TypeScript SDK.

---

## 2. Streamflow — Production Setup

### Install
```bash
npm install @streamflow/stream @solana/web3.js
```

### Initialize Client
```typescript
import { StreamflowSolana, Types, getBN } from "@streamflow/stream";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const client = new StreamflowSolana.SolanaStreamClient(
  "https://api.mainnet-beta.solana.com",
  Types.ICluster.Mainnet
);
```

### Create a Standard Team Vesting Stream
```typescript
// 12-month cliff, then linear over 36 months
// Total: 18,000,000 tokens to one team member

const DECIMALS = 6; // match your token's decimals
const TOTAL_TOKENS = 18_000_000;
const TOKEN_MINT = new PublicKey("YOUR_TOKEN_MINT");

const NOW = Math.floor(Date.now() / 1000);
const ONE_MONTH = 30 * 24 * 60 * 60;
const CLIFF_DATE = NOW + ONE_MONTH * 12;    // 12 months from now
const END_DATE = CLIFF_DATE + ONE_MONTH * 36; // 36 months of linear after cliff

// Monthly amount released after cliff
const MONTHLY_AMOUNT = TOTAL_TOKENS / 36;

const params: Types.ICreateStreamData = {
  recipient: "RECIPIENT_WALLET_ADDRESS",
  tokenId: TOKEN_MINT.toBase58(),
  
  // Stream starts now but nothing releases until cliff
  start: NOW,
  
  // Total tokens in the stream
  amount: getBN(TOTAL_TOKENS, DECIMALS),
  
  // Release period: 1 = every second, ONE_MONTH = monthly releases
  period: ONE_MONTH,
  
  // Amount released each period after cliff
  amountPerPeriod: getBN(MONTHLY_AMOUNT, DECIMALS),
  
  // Cliff timestamp — nothing before this
  cliff: CLIFF_DATE,
  
  // Tokens released AT the cliff moment (0 = nothing at cliff, pure linear after)
  cliffAmount: getBN(0, DECIMALS),
  
  // Revocability — set false for team/investor credibility
  cancelableBySender: false,
  cancelableByRecipient: false,
  
  // Transferability
  transferableBySender: false,
  transferableByRecipient: false,
  
  canTopup: false,
  name: "Team Vesting — [Name]",
};

const { ixs, metadata } = await client.create(params, {
  sender: payer,
  isNative: false,
});

// Execute transaction
// (sign and send ixs using your preferred transaction builder)
console.log("Stream ID:", metadata.id);
console.log("Stream URL: https://app.streamflow.finance/stream/" + metadata.id);
```

### Create Multiple Streams (Batch — Team + Investors)
```typescript
import { Types } from "@streamflow/stream";

// Build an array of stream params for all stakeholders
const batchParams: Types.ICreateMultipleStreamData = {
  recipients: [
    {
      recipient: "TEAM_MEMBER_1",
      name: "Team — Alice",
      amount: getBN(5_000_000, DECIMALS),
      amountPerPeriod: getBN(5_000_000 / 36, DECIMALS),
      cliff: NOW + ONE_MONTH * 12,
      cliffAmount: getBN(0, DECIMALS),
    },
    {
      recipient: "TEAM_MEMBER_2",
      name: "Team — Bob",
      amount: getBN(3_000_000, DECIMALS),
      amountPerPeriod: getBN(3_000_000 / 36, DECIMALS),
      cliff: NOW + ONE_MONTH * 12,
      cliffAmount: getBN(0, DECIMALS),
    },
    {
      recipient: "SEED_INVESTOR_1",
      name: "Seed — VC Fund A",
      amount: getBN(8_000_000, DECIMALS),
      amountPerPeriod: getBN(8_000_000 / 24, DECIMALS),
      cliff: NOW + ONE_MONTH * 6,
      cliffAmount: getBN(0, DECIMALS),
    },
  ],
  tokenId: TOKEN_MINT.toBase58(),
  start: NOW,
  period: ONE_MONTH,
  cancelableBySender: false,
  cancelableByRecipient: false,
  transferableBySender: false,
  transferableByRecipient: false,
  canTopup: false,
};

const batchResult = await client.createMultiple(batchParams, {
  sender: payer,
  isNative: false,
});

// Save stream IDs for your transparency report
batchResult.metadatas.forEach((m, i) => {
  console.log(`Stream ${i}: https://app.streamflow.finance/stream/${m.id}`);
});
```

### Query Active Streams
```typescript
// Get all streams for a specific token mint where you are the sender
const streams = await client.get({
  address: payer.publicKey.toBase58(),
  type: Types.StreamType.All,
  direction: Types.StreamDirection.Outgoing,
});

streams.forEach(([id, stream]) => {
  const unlockedPct = (Number(stream.withdrawnAmount) / Number(stream.depositedAmount)) * 100;
  console.log(`Stream ${id}: ${unlockedPct.toFixed(1)}% withdrawn`);
});
```

---

## 3. Custom Anchor Vesting Program

Use a custom Anchor vesting program only when the team explicitly wants zero external runtime dependency and has the engineering capacity to maintain and audit it.

For implementation details, load [anchor-vesting.md](anchor-vesting.md). Keep this file focused on founder-facing vesting decisions and Streamflow workflows; custom program code is intentionally split out for progressive loading.
## 4. Vesting Schedule Archetypes by Stakeholder

| Stakeholder | Cliff | Linear Vesting | Revocable? | Notes |
|-------------|-------|---------------|-----------|-------|
| Co-founders | 12 months | 36 months | Yes (advisable) | Protects against early departure |
| Full-time employees | 12 months | 36 months | Yes | Standard tech-company model |
| Seed investors | 6 months | 24 months | No | Binding commitment |
| Series A investors | 3 months | 18 months | No | Shorter due to later entry |
| Advisors | 6 months | 18 months | No | Smaller allocation, shorter vest |
| Community grants | None | 12 months | No | Streamed for contributor retention |
| Bug bounty awards | None | None | No | Immediate (earned) |
| Hackathon winners | 3 months | 6 months | No | Short cliff signals trust |

---

## 5. Pre-Launch Vesting Checklist

Before TGE:
- [ ] All team and investor wallets collected and verified
- [ ] Vesting streams created on devnet and tested (simulate claiming after cliff)
- [ ] Stream IDs or program addresses recorded for transparency report
- [ ] Total tokens in vesting contracts equals your allocation model exactly
- [ ] Revocability settings match your agreements with each stakeholder
- [ ] Beneficiaries have confirmed they can access their wallet/funds

At TGE:
- [ ] Vesting streams live on mainnet
- [ ] Stream URLs shared with each beneficiary
- [ ] Stream URLs published publicly for transparency

---

## Related Sub-skills
- Allocation percentages → [`design.md`](design.md)
- Deploying the token itself → [`token-standard.md`](token-standard.md)
- Publishing vesting proof at launch → [`launch.md`](launch.md)
