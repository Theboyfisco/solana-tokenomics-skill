# Token Standard Selection — SPL vs Token-2022

> Part of [solana-tokenomics-skill](SKILL.md). Load this file when the user asks
> which token standard to use, whether they need Token-2022 extensions, how
> transfer hooks work, or about extension compatibility.

---

## 1. Quick Decision: Do You Need Token-2022?

```
Start here ─► Do you need ANY of the following?
               │
               ├─ Transfer fees (tax on every transfer)?           ─► YES → Token-2022 + TransferFeeConfig
               ├─ Royalties on secondary sales?                    ─► YES → Token-2022 + TransferHook
               ├─ KYC/compliance gating on transfers?              ─► YES → Token-2022 + TransferHook
               ├─ Interest-bearing token mechanics?                ─► YES → Token-2022 + InterestBearingConfig
               ├─ Confidential (hidden) transfer amounts?          ─► YES → Token-2022 + ConfidentialTransfers ⚠️
               ├─ Permanent delegate for clawbacks?                ─► YES → Token-2022 + PermanentDelegate ⚠️
               ├─ On-chain metadata (no Metaplex)?                 ─► YES → Token-2022 + MetadataPointer
               ├─ Non-transferable (soul-bound) tokens?            ─► YES → Token-2022 + NonTransferable
               └─ None of the above?                               ─► Use SPL Token (classic)
```

**Default recommendation:** If you answered "none of the above," use **SPL Token**. It has universal wallet support, full DEX integration, the simplest mental model, and zero migration risk. Don't add complexity you don't need.

---

## 2. SPL Token (Classic) — The Safe Default

### Program Address
`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`

### SDK
```bash
npm install @solana/spl-token
```

### When to Choose SPL Token
- Standard governance token (DAO voting, protocol fees)
- Utility token with no transfer restrictions
- Staking rewards token
- Any token where maximum ecosystem compatibility matters
- If your project is launching publicly in <3 months (less time to test Token-2022 edge cases)

### Creating an SPL Token (TypeScript)
```typescript
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
const payer = Keypair.fromSecretKey(/* your key */);
const mintAuthority = payer.publicKey;
const freezeAuthority = payer.publicKey; // set to null if you don't need it

// Create mint
const mint = await createMint(
  connection,
  payer,
  mintAuthority,
  freezeAuthority,  // pass null to disable freeze from the start
  6,                // decimals — 6 is the standard for most SPL tokens
  undefined,
  undefined,
  TOKEN_PROGRAM_ID
);

console.log("Mint address:", mint.toBase58());
```

### Key SPL Token Decisions
| Authority | Keep? | When to Revoke |
|-----------|-------|---------------|
| Mint Authority | Only if inflationary emissions needed | At TGE for fixed-supply tokens |
| Freeze Authority | Rarely — mostly for regulated assets | At TGE for permissionless tokens |

---

## 3. Token-2022 (Token Extensions Program)

### Program Address
`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

### SDK
```bash
npm install @solana/spl-token  # Token-2022 support included since v0.4.0
```

### Critical Warning
> ⚠️ **Mint extensions are immutable.** Once a mint is created with a specific set of extensions, you cannot add, remove, or change them. Design once, deploy carefully. Test on devnet until confident.

---

## 4. Token-2022 Extension Reference

### 4.1 TransferFeeConfig — Fee on Every Transfer

**Use case:** Protocol revenue from token activity; "tax" tokens; royalty streams.

```typescript
import {
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  ExtensionType,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram, Transaction } from "@solana/web3.js";

const extensions = [ExtensionType.TransferFeeConfig];
const mintLen = getMintLen(extensions);
const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

const mintKeypair = Keypair.generate();
const feeBasisPoints = 100;   // 1% fee (100 basis points)
const maxFee = BigInt(1_000_000_000); // cap at 1000 tokens max fee

const transaction = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: mintLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  createInitializeTransferFeeConfigInstruction(
    mintKeypair.publicKey,
    payer.publicKey,   // transferFeeConfigAuthority
    payer.publicKey,   // withdrawWithheldAuthority
    feeBasisPoints,
    maxFee,
    TOKEN_2022_PROGRAM_ID
  ),
  createInitializeMintInstruction(
    mintKeypair.publicKey,
    6,                 // decimals
    payer.publicKey,   // mintAuthority
    null,              // freezeAuthority
    TOKEN_2022_PROGRAM_ID
  )
);
```

**Considerations:**
- Fees are withheld in recipient token accounts — must be harvested and withdrawn separately
- Aggregator and DEX support for transfer-fee mints changes over time; verify with the exact pools, wallets, and routes you plan to support before launch
- Max fee cap prevents large transfers from being disproportionately taxed

---

### 4.2 TransferHook — Custom Logic on Every Transfer

**Use case:** Royalties, KYC/allowlist enforcement, dynamic fees, on-chain event logging.

**Architecture:**
1. Deploy a separate Anchor program implementing the `TransferHook` interface
2. Configure the mint to point to your hook program
3. On every transfer, Token-2022 CPIs into your hook program

**Critical constraint:** All accounts from the original transfer become **read-only** in the CPI. You cannot rely on signer privileges — validate based on state.

```rust
// Anchor hook program skeleton (programs/transfer-hook/src/lib.rs)
use anchor_lang::prelude::*;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("YOUR_HOOK_PROGRAM_ID");

#[program]
pub mod transfer_hook {
    use super::*;

    // Called on every token transfer
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        // Example: enforce allowlist
        let allowlist = &ctx.accounts.allowlist;
        require!(
            allowlist.is_approved(&ctx.accounts.source_owner.key()),
            HookError::NotAllowed
        );
        
        // Example: emit event
        emit!(TransferEvent {
            from: ctx.accounts.source_owner.key(),
            to: ctx.accounts.destination_owner.key(),
            amount,
        });
        
        Ok(())
    }

    // Must implement: initialize_extra_account_meta_list
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccounts>,
        extra_account_metas: Vec<ExtraAccountMeta>,
    ) -> Result<()> {
        // Register extra accounts your hook needs
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Execute<'info> {
    pub source_token: AccountInfo<'info>,
    pub mint: AccountInfo<'info>,
    pub destination_token: AccountInfo<'info>,
    pub source_owner: AccountInfo<'info>,
    pub extra_account_meta_list: AccountInfo<'info>,
    pub allowlist: Account<'info, Allowlist>,
}

#[error_code]
pub enum HookError {
    #[msg("Transfer not allowed: sender not on allowlist")]
    NotAllowed,
}

#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}
```

**Keep hooks lean:** They execute on every single transfer. Heavy computation = higher fees and slower UX for all users.

---

### 4.3 InterestBearingConfig — Accruing Interest On-Chain

**Use case:** Yield-bearing stablecoins, liquid staking derivatives, synthetic bonds.

```typescript
import { createInitializeInterestBearingMintInstruction } from "@solana/spl-token";

// Interest rate in basis points per year (500 = 5% APY)
const rateAuthority = payer.publicKey;
const rate = 500; // 5% APY in basis points

transaction.add(
  createInitializeInterestBearingMintInstruction(
    mintKeypair.publicKey,
    rateAuthority,
    rate,
    TOKEN_2022_PROGRAM_ID
  )
);
```

**Note:** The "interest" is a display multiplier, not actual yield accrual. For real yield, you still need a separate yield-distribution mechanism.

---

### 4.4 PermanentDelegate — Protocol-Level Clawback

**Use case:** Regulated tokens requiring clawback authority; escrow systems.

> ⚠️ **Major trust concern:** A permanent delegate can transfer or burn tokens from any holder's wallet. This is a significant red flag unless your use case explicitly requires it (e.g., regulated securities). Always disclose this prominently.

```typescript
import { createInitializePermanentDelegateInstruction } from "@solana/spl-token";

transaction.add(
  createInitializePermanentDelegateInstruction(
    mintKeypair.publicKey,
    payer.publicKey,   // permanent delegate — can transfer from any account
    TOKEN_2022_PROGRAM_ID
  )
);
```

---

### 4.5 MetadataPointer + TokenMetadata — On-Chain Metadata

**Use case:** Tokens that want metadata stored on-chain without Metaplex dependency.

```typescript
import {
  createInitializeMetadataPointerInstruction,
  createInitializeInstruction as createInitializeMetadataInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
} from "@solana/spl-token";

// During mint initialization, add MetadataPointer extension
// pointing to the mint itself as the metadata account
transaction.add(
  createInitializeMetadataPointerInstruction(
    mintKeypair.publicKey,
    payer.publicKey,          // updateAuthority
    mintKeypair.publicKey,    // metadataAddress (mint itself)
    TOKEN_2022_PROGRAM_ID
  )
);

// After mint is initialized, initialize the metadata
const metadataInstruction = createInitializeMetadataInstruction({
  programId: TOKEN_2022_PROGRAM_ID,
  metadata: mintKeypair.publicKey,
  updateAuthority: payer.publicKey,
  mint: mintKeypair.publicKey,
  mintAuthority: payer.publicKey,
  name: "My Token",
  symbol: "MTK",
  uri: "https://your-metadata-uri.com/token.json",
});
```

---

### 4.6 ConfidentialTransfers — Hidden Amounts

**Use case:** Privacy-preserving transfers where amount is encrypted on-chain.

> ⚠️ **Limited DEX support as of 2026.** Most AMMs cannot price assets with confidential amounts. Only use if privacy is core to your product and you've confirmed DEX compatibility.

> ⚠️ **Known incompatibility with TransferHook.** Cannot combine both on the same mint.

---

### 4.7 NonTransferable — Soul-Bound Tokens

**Use case:** Credentials, badges, reputation tokens, achievement tokens that should never be traded.

```typescript
import { createInitializeNonTransferableMintInstruction } from "@solana/spl-token";

transaction.add(
  createInitializeNonTransferableMintInstruction(
    mintKeypair.publicKey,
    TOKEN_2022_PROGRAM_ID
  )
);
```

---

## 5. Extension Compatibility Matrix

| Extension A | Extension B | Compatible? | Notes |
|-------------|-------------|-------------|-------|
| TransferFeeConfig | TransferHook | ✅ Yes | Common combination |
| TransferFeeConfig | ConfidentialTransfers | ⚠️ Partial | Limited wallet/DEX support |
| TransferHook | ConfidentialTransfers | ❌ No | Known incompatibility |
| TransferHook | NonTransferable | ✅ Yes | Hook fires on attempted transfers |
| PermanentDelegate | TransferFeeConfig | ✅ Yes | Fees apply to delegate transfers too |
| MetadataPointer | All others | ✅ Yes | Metadata is independent |
| InterestBearing | TransferFeeConfig | ✅ Yes | Interest accumulates, fee applies on transfer |
| NonTransferable | TransferFeeConfig | ⚠️ N/A | Fee never fires (no transfers) |

---

## 6. Integration Risk Matrix

Treat Token-2022 extension support as an integration risk, not a static compatibility fact. Before mainnet launch, test the exact mint configuration against your target wallet, indexer, DEX, and aggregator path.

| Extension | Integration Risk | Required Validation |
|-----------|------------------|---------------------|
| None (SPL) | Low | Standard wallet display, ATA creation, swap route, explorer metadata |
| TransferFeeConfig | Medium | Fee-aware transfers, swap quotes, withheld-fee harvesting, accounting |
| TransferHook | High | Extra account metas, wallet transfer UX, DEX routing, hook failure paths |
| InterestBearing | Medium | Display multiplier, accounting, indexer display, treasury reporting |
| PermanentDelegate | High | Wallet warnings, disclosure, governance controls, holder trust impact |
| ConfidentialTransfers | Very high | Wallet support, no AMM assumptions, audit of privacy flow |
| NonTransferable | Medium | Wallet display, failed-transfer UX, credential/reputation semantics |
| MetadataPointer | Medium | Wallet and explorer metadata resolution |

> Always run a devnet/mainnet-fork validation plan before mainnet deployment.
> Check current support status in each protocol's docs or changelog because this changes frequently.

---

## 7. Migration: Can I Switch Later?

**Short answer: No.** Mint extensions on Token-2022 are immutable. You cannot:
- Add an extension to an existing Token-2022 mint
- Remove an extension from an existing Token-2022 mint
- Migrate from SPL Token to Token-2022 without creating a new mint

If you discover you need Token-2022 after launching an SPL token, you must:
1. Create a new Token-2022 mint
2. Build a migration/swap mechanism for existing holders
3. Coordinate with DEXs to migrate liquidity pools
4. Update all integrations

**This is expensive and disruptive.** Get your extension selection right before mainnet deployment.

---

## Related Sub-skills
- Supply and allocation → [`design.md`](design.md)
- Vesting programs → [`vesting.md`](vesting.md)
- After choosing your token standard → [`launch.md`](launch.md)
