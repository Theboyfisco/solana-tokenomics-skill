# Liquidity Strategy & DEX Bootstrapping

> Part of [solana-tokenomics-skill](SKILL.md). Load this file when the user asks
> about adding liquidity, choosing a DEX, sizing their LP, locking liquidity,
> bonding curve graduation, or CLMM/DLMM strategies.

---

## 1. DEX Decision Tree

```
Is your token newly launched with uncertain price?
│
├─ Yes ──► Meteora DLMM — dynamic fees adapt to volatility, 
│          best price discovery, bin-based liquidity
│
└─ No ──► Does your token have an established price range?
           │
           ├─ Yes + capital efficiency matters ──► Orca CLMM (Whirlpools)
           │                                       or Raydium CLMM
           │
           └─ No / want simplicity ──────────────► Raydium CPMM
                                                    or Orca CPMM
```

### DEX Comparison Matrix

| DEX | Pool Type | Fee Model | Best For | SDK |
|-----|-----------|-----------|---------|-----|
| **Meteora DLMM** | Bin-based | Dynamic (adapts to volatility) | New tokens, volatile assets, price discovery | `@meteora-ag/dlmm` |
| **Meteora CPMM** | x*y=k | Static | Stablecoins, low-volatility pairs | `@meteora-ag/dynamic-amm-sdk` |
| **Raydium CPMM** | x*y=k | Static (0.25% default) | General tokens, good volume/exposure | `@raydium-io/raydium-sdk-v2` |
| **Raydium CLMM** | Concentrated | Static tiers | Established price-range tokens | `@raydium-io/raydium-sdk-v2` |
| **Orca CPMM** | x*y=k | Static | Stablecoin pairs, simple LP | `@orca-so/whirlpools-sdk` |
| **Orca CLMM** (Whirlpools) | Concentrated | Static tiers | Capital-efficient, active management | `@orca-so/whirlpools-sdk` |

**Default recommendation for a new token:** **Meteora DLMM** — it dynamically adjusts fees based on volatility, which protects LPs during the high-volatility launch period and provides the most efficient price discovery.

**Second recommendation:** **Raydium CPMM** — widest exposure, strong aggregator routing from Jupiter, used by the majority of Solana projects.

---

## 2. Initial LP Sizing

### The Core Formula
```
LP Paired Capital = Token_Allocation_for_LP × Target_TGE_Price
                    ─────────────────────────────────────────────
                                    2

(You need an equal dollar value on both sides of the pool)

Example:
  Token supply:          1,000,000,000
  LP allocation:         10% = 100,000,000 tokens
  Target TGE price:      $0.05 per token
  Token side value:      100,000,000 × $0.05 = $5,000,000
  
  Required paired side:  $5,000,000 (in SOL, USDC, or USDT)
  At SOL = $150:         $5,000,000 / $150 = 33,333 SOL
  
  Total LP value:        $10,000,000 (token side + paired side)
```

### Minimum Viable LP (Bootstrapped Projects)
```
Minimum LP should absorb a 1% sell without >10% price impact.

Slippage formula (CPMM):
  Impact ≈ Sell_Amount / (2 × Pool_Size_One_Side)

Example — $10,000 sell with $500,000 LP (each side):
  Impact ≈ $10,000 / (2 × $500,000) = 1% price impact  ← acceptable

At minimum: LP one side ≥ 5× your expected average single trade size
```

### LP Sizing by Project Stage

| Stage | Recommended LP (USD) | Notes |
|-------|---------------------|-------|
| Micro / bootstrap | $50K–$200K | Enough for community trading, high slippage |
| Seed-funded project | $200K–$1M | Standard for $1–5M FDV launch |
| Series A / funded | $1M–$5M | Needed for institutional participation |
| Large protocol | $5M+ | Enables aggregator routing + whale trades |

---

## 3. Meteora DLMM — Setup & Strategy

### Install
```bash
npm install @meteora-ag/dlmm @solana/web3.js
```

### Key Concepts
- **Bins:** Liquidity is organized into discrete price bins (similar to tick spacing in CLMM)
- **Active Bin:** The bin containing the current market price — trades happen here
- **Bin Step:** Price difference between adjacent bins (in basis points)
- **Dynamic Fees:** Base fee + variable fee that increases with price volatility

### Recommended Bin Steps for New Tokens
| Asset Volatility | Bin Step | Fee Range |
|-----------------|----------|-----------|
| Stablecoin pairs | 1–5 bps | 0.01–0.05% |
| Low volatility | 10–25 bps | 0.1–0.25% |
| Medium volatility | 50–100 bps | 0.5–1% |
| New/volatile token | 100–200 bps | 1–2% base |

### Creating a DLMM Pool
```typescript
import DLMM from "@meteora-ag/dlmm";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import BN from "bn.js";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Load existing DLMM pool (if it already exists)
const poolAddress = new PublicKey("YOUR_POOL_ADDRESS");
const dlmmPool = await DLMM.create(connection, poolAddress);

// Get active bin (current price)
const activeBin = await dlmmPool.getActiveBin();
console.log("Active bin ID:", activeBin.binId);
console.log("Current price:", dlmmPool.fromPricePerLamport(
  Number(activeBin.price)
));

// Add liquidity around active bin (spot strategy)
const TOTAL_RANGE = 10; // bins on each side of active bin
const activeBinPricePerToken = dlmmPool.fromPricePerLamport(Number(activeBin.price));

// Build bin array for balanced distribution around current price
const binArrays = await dlmmPool.getBinArrayForSwap(TOTAL_RANGE, true);

const addLiquidityTx = await dlmmPool.addLiquidityByStrategy({
  positionPubKey: Keypair.generate().publicKey, // new position
  user: payer.publicKey,
  totalXAmount: new BN(100_000_000), // token X amount (your token)
  totalYAmount: new BN(1_000_000),   // token Y amount (USDC/SOL in lamports)
  strategy: {
    maxBinId: activeBin.binId + TOTAL_RANGE,
    minBinId: activeBin.binId - TOTAL_RANGE,
    strategyType: StrategyType.SpotBalanced, // evenly distributed around active bin
  },
});
```

### Liquidity Strategies

| Strategy | Distribution | Best For |
|----------|-------------|---------|
| **SpotBalanced** | Even across bins | Launch — maximum initial liquidity depth |
| **BidAsk** | Concentrated around edges | Market-making, tight spreads |
| **Curve** | Bell curve around active | Stablecoin or peg maintenance |

**For new token launches:** Use `SpotBalanced` with ±20–50 bins from the active bin. This provides deep liquidity for price discovery without concentrating all liquidity in a single price point that could be quickly drained.

---

## 4. Raydium CPMM — Setup

### Install
```bash
npm install @raydium-io/raydium-sdk-v2 @solana/web3.js
```

### Create CPMM Pool
```typescript
import { Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { PublicKey, Connection } from "@solana/web3.js";

const raydium = await Raydium.load({
  connection,
  owner: payer,
  disableFeatureCheck: false,
});

const { execute, extInfo } = await raydium.cpmm.createPool({
  programId: new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"),
  mintA: {
    address: "YOUR_TOKEN_MINT",
    decimals: 6,
  },
  mintB: {
    address: "So11111111111111111111111111111111111111112", // Wrapped SOL
    decimals: 9,
  },
  mintAAmount: BigInt(100_000_000 * 10 ** 6), // 100M tokens
  mintBAmount: BigInt(333 * 10 ** 9),           // 333 SOL
  startTime: BigInt(0),                          // start immediately
  txVersion: TxVersion.V0,
});

const { txId } = await execute();
console.log("Pool created, tx:", txId);
console.log("Pool ID:", extInfo.address.poolId.toBase58());
```

---

## 5. Orca CLMM (Whirlpools) — Setup

### Install
```bash
npm install @orca-so/whirlpools-sdk @coral-xyz/anchor @solana/web3.js
```

### Create Whirlpool Position
```typescript
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PriceMath,
  TickUtil,
  increaseLiquidityQuoteByInputTokenWithParams,
  TokenExtensionContextForPool,
} from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import Decimal from "decimal.js";

const provider = AnchorProvider.env();
const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
const client = buildWhirlpoolClient(ctx);

// Load the pool
const whirlpool = await client.getPool("YOUR_WHIRLPOOL_ADDRESS");
const whirlpoolData = whirlpool.getData();
const tokenA = whirlpool.getTokenAInfo();
const tokenB = whirlpool.getTokenBInfo();
const tickSpacing = whirlpoolData.tickSpacing;

// Define price range (e.g., ±50% of current price)
const currentPrice = PriceMath.sqrtPriceX64ToPrice(
  whirlpoolData.sqrtPrice,
  tokenA.decimals,
  tokenB.decimals
);

const lowerPrice = currentPrice.mul(0.5); // 50% below
const upperPrice = currentPrice.mul(2.0); // 100% above

const lowerTick = PriceMath.priceToInitializableTickIndex(
  lowerPrice, tokenA.decimals, tokenB.decimals, tickSpacing
);
const upperTick = PriceMath.priceToInitializableTickIndex(
  upperPrice, tokenA.decimals, tokenB.decimals, tickSpacing
);

// Open position with liquidity
const { positionMint, tx } = await whirlpool.openPositionWithMetadata(
  lowerTick,
  upperTick,
  { tokenA: new Decimal(50_000_000) }, // deposit 50M of your token
  undefined,
  payer.publicKey
);

await tx.buildAndExecute();
console.log("Position NFT mint:", positionMint.toBase58());
```

---

## 6. Locking Liquidity — Critical Trust Signal

LP tokens must be locked immediately at TGE. This is non-negotiable for credibility.

### Option A: Jupiter Lock
```typescript
// Jupiter Lock is the simplest option — UI and API available
// API: https://lock.jup.ag/api
// UI:  https://jup.ag/lock

// Lock your LP tokens for 1 year minimum
fetch("https://lock.jup.ag/api/lock", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mint: "YOUR_LP_TOKEN_MINT",
    amount: "100000000",    // amount of LP tokens to lock
    unlockDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
    vestingEnabled: false,  // full lock, not gradual release
  }),
});
```

### Option B: Streamflow Lock
```typescript
// Use Streamflow to create a non-cancellable, non-transferable stream
// with cliff = lock duration and 0 cliff amount

const lockParams: Types.ICreateStreamData = {
  recipient: payer.publicKey.toBase58(), // lock to yourself
  tokenId: "YOUR_LP_TOKEN_MINT",
  start: Math.floor(Date.now() / 1000),
  amount: getBN(LP_TOKEN_AMOUNT, LP_DECIMALS),
  period: 1,
  amountPerPeriod: getBN(0, LP_DECIMALS),   // nothing until cliff
  cliff: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
  cliffAmount: getBN(LP_TOKEN_AMOUNT, LP_DECIMALS), // all at cliff end
  cancelableBySender: false,
  cancelableByRecipient: false,
  transferableBySender: false,
  transferableByRecipient: false,
  canTopup: false,
  name: "LP Lock — 1 Year",
};
```

### Option C: Raydium Built-in Lock (for Raydium CPMM pools)
Raydium CPMM pools launched via Raydium Launchpad include a native LP lock option during pool creation — use this for the simplest path when launching through Raydium.

---

## 7. Bonding Curve Graduation Strategy (pump.fun / Launchpad)

If launching via a bonding curve platform (pump.fun, Raydium Launchpad):

### How It Works
1. Token starts on bonding curve with no traditional LP
2. Price rises as demand increases
3. At graduation threshold (~85 SOL raised on pump.fun), liquidity auto-migrates to DEX (typically Raydium CPMM)
4. LP tokens are locked at graduation

### Strategy for Bonding Curve Launch
```
Tokenomics adjustment for bonding curves:
- Reserve 20–30% of supply for the bonding curve phase
- The graduation event deploys liquidity automatically
- Remaining tokens should still have vesting schedules
- Keep the "non-bonding-curve" allocation structure the same

Key metric: "graduation probability" 
  - <1% of pump.fun tokens graduate (2025 data)
  - Strategy: build community BEFORE launch, not after
  - Coordinate 3–5 whale buys for early momentum
  - Have Discord/Telegram active with 500+ members before launch
```

---

## 8. Post-Launch Liquidity Management

### Monitoring Your LP
- **Impermanent loss:** Track using tools like step.finance or DeFiLlama portfolio
- **Out-of-range (CLMM/DLMM):** Set alerts when price leaves your position range — no fees earned out-of-range
- **LP depth:** Monitor daily — if falling, consider adding liquidity from treasury

### When to Rebalance (CLMM/DLMM)
- Price has moved outside your position range
- Your fee tier is no longer competitive vs. other LPs
- You want to tighten the range as price stabilizes post-launch

### Supply Shock Prep
Before any large unlock event:
1. Increase LP depth by 20–30% the week before
2. Pre-announce the unlock date publicly (30 days in advance)
3. Have a market maker relationship in place if possible
4. Monitor selling pressure hourly during the first 48h post-unlock

---

## 9. LP Launch Checklist

- [ ] LP size covers at least 5–10% of FDV (or minimum viable per stage table)
- [ ] LP token locked immediately — minimum 6 months (12 months preferred)
- [ ] Lock proof URL saved for transparency report
- [ ] Pool address verified on Solscan
- [ ] Pool listed/verified on Jupiter (submit at: https://station.jup.ag/docs/token-list/token-list-api)
- [ ] Price feed confirmed on Birdeye and DexScreener
- [ ] Slippage tested: simulate a 1% of pool size sell — impact acceptable?
- [ ] Supply shock calendar published (see [`design.md`](design.md))

---

## Related Sub-skills
- LP allocation percentage → [`design.md`](design.md)
- Token standard choice affects LP compatibility → [`token-standard.md`](token-standard.md)
- Publishing LP lock proof → [`launch.md`](launch.md)
