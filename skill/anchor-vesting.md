# Custom Anchor Vesting Program

> Part of [solana-tokenomics-skill](SKILL.md). Load this file only when the user explicitly asks for a custom on-chain vesting program, Anchor implementation details, or no-third-party vesting infrastructure.

## 3. Custom Anchor Vesting Program

Use this when you want zero external runtime dependency and full on-chain sovereignty. This is a starting skeleton for an Anchor implementation; it must be compiled, tested, reviewed, and audited before mainnet use.

### Program Structure
```
programs/
└── token-vesting/
    └── src/
        └── lib.rs
```

### `lib.rs` — Vesting Program Skeleton
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("YOUR_PROGRAM_ID_HERE");

/// ─── State ───────────────────────────────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct VestingAccount {
    /// Wallet that will receive vested tokens
    pub beneficiary: Pubkey,
    /// Token mint being vested
    pub mint: Pubkey,
    /// Token account holding the locked tokens
    pub vault: Pubkey,
    /// Authority that initialized this vesting (for display only — no special powers)
    pub grantor: Pubkey,
    /// Unix timestamp: when the cliff ends and linear vesting begins
    pub cliff_timestamp: i64,
    /// Unix timestamp: when all tokens are fully vested
    pub end_timestamp: i64,
    /// Total tokens deposited in this vesting account
    pub total_amount: u64,
    /// Tokens already claimed by the beneficiary
    pub released_amount: u64,
    /// Whether the grantor can revoke this vesting (set false for binding commitments)
    pub revocable: bool,
    /// Whether the vesting has been revoked
    pub revoked: bool,
    /// PDA bump
    pub bump: u8,
}

impl VestingAccount {
    pub const LEN: usize = 8  // discriminator
        + 32   // beneficiary
        + 32   // mint
        + 32   // vault
        + 32   // grantor
        + 8    // cliff_timestamp
        + 8    // end_timestamp
        + 8    // total_amount
        + 8    // released_amount
        + 1    // revocable
        + 1    // revoked
        + 1    // bump
        + 32;  // padding for future fields

    /// Calculate how many tokens are currently vested (but not yet released)
    pub fn vested_amount(&self, now: i64) -> u64 {
        if self.revoked {
            return 0;
        }
        if now < self.cliff_timestamp {
            // Before cliff: nothing vested
            return 0;
        }
        if now >= self.end_timestamp {
            // Fully vested
            return self.total_amount;
        }
        // Linear vesting between cliff and end
        let vesting_duration = (self.end_timestamp - self.cliff_timestamp) as u128;
        let elapsed = (now - self.cliff_timestamp) as u128;
        let vested = (self.total_amount as u128)
            .checked_mul(elapsed)
            .unwrap()
            .checked_div(vesting_duration)
            .unwrap() as u64;
        vested
    }

    /// Tokens currently claimable (vested minus already released)
    pub fn claimable_amount(&self, now: i64) -> u64 {
        self.vested_amount(now)
            .saturating_sub(self.released_amount)
    }
}

/// ─── Instructions ────────────────────────────────────────────────────────────

#[program]
pub mod token_vesting {
    use super::*;

    /// Initialize a new vesting account and deposit tokens into the vault.
    /// Called by the grantor (e.g., the protocol treasury multisig).
    pub fn initialize_vesting(
        ctx: Context<InitializeVesting>,
        total_amount: u64,
        cliff_timestamp: i64,
        end_timestamp: i64,
        revocable: bool,
    ) -> Result<()> {
        require!(total_amount > 0, VestingError::ZeroAmount);
        require!(cliff_timestamp > Clock::get()?.unix_timestamp, VestingError::CliffInPast);
        require!(end_timestamp > cliff_timestamp, VestingError::InvalidSchedule);

        let vesting = &mut ctx.accounts.vesting_account;
        vesting.beneficiary = ctx.accounts.beneficiary.key();
        vesting.mint = ctx.accounts.mint.key();
        vesting.vault = ctx.accounts.vault.key();
        vesting.grantor = ctx.accounts.grantor.key();
        vesting.cliff_timestamp = cliff_timestamp;
        vesting.end_timestamp = end_timestamp;
        vesting.total_amount = total_amount;
        vesting.released_amount = 0;
        vesting.revocable = revocable;
        vesting.revoked = false;
        vesting.bump = ctx.bumps.vesting_account;

        // Transfer tokens from grantor's token account to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.grantor_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.grantor.to_account_info(),
                },
            ),
            total_amount,
        )?;

        emit!(VestingInitialized {
            vesting: vesting.key(),
            beneficiary: vesting.beneficiary,
            total_amount,
            cliff_timestamp,
            end_timestamp,
        });

        Ok(())
    }

    /// Claim vested tokens. Can only be called by the beneficiary.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vesting = &mut ctx.accounts.vesting_account;

        let claimable = vesting.claimable_amount(now);
        require!(claimable > 0, VestingError::NothingToClaim);

        vesting.released_amount = vesting.released_amount
            .checked_add(claimable)
            .ok_or(VestingError::MathOverflow)?;

        // Transfer from vault to beneficiary, signed by PDA
        let vesting_key = vesting.key();
        let seeds = &[
            b"vesting",
            vesting_key.as_ref(),
            &[vesting.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.beneficiary_token_account.to_account_info(),
                    authority: ctx.accounts.vesting_account.to_account_info(),
                },
                signer_seeds,
            ),
            claimable,
        )?;

        emit!(TokensClaimed {
            vesting: vesting.key(),
            beneficiary: vesting.beneficiary,
            amount: claimable,
            total_released: vesting.released_amount,
        });

        Ok(())
    }

    /// Revoke vesting (only if revocable = true). Returns unvested tokens to grantor.
    pub fn revoke(ctx: Context<Revoke>) -> Result<()> {
        let vesting = &mut ctx.accounts.vesting_account;
        require!(vesting.revocable, VestingError::NotRevocable);
        require!(!vesting.revoked, VestingError::AlreadyRevoked);

        let now = Clock::get()?.unix_timestamp;
        let vested = vesting.vested_amount(now);
        let unvested = vesting.total_amount.saturating_sub(vested);

        vesting.revoked = true;

        // Return unvested tokens to grantor
        if unvested > 0 {
            let vesting_key = vesting.key();
            let seeds = &[b"vesting", vesting_key.as_ref(), &[vesting.bump]];
            let signer_seeds = &[&seeds[..]];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.grantor_token_account.to_account_info(),
                        authority: ctx.accounts.vesting_account.to_account_info(),
                    },
                    signer_seeds,
                ),
                unvested,
            )?;
        }

        emit!(VestingRevoked {
            vesting: vesting.key(),
            beneficiary: vesting.beneficiary,
            unvested_returned: unvested,
        });

        Ok(())
    }
}

/// ─── Account Contexts ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeVesting<'info> {
    #[account(mut)]
    pub grantor: Signer<'info>,

    /// CHECK: beneficiary receives tokens — validated via seeds
    pub beneficiary: UncheckedAccount<'info>,

    pub mint: Account<'info, anchor_spl::token::Mint>,

    #[account(
        init,
        payer = grantor,
        space = VestingAccount::LEN,
        seeds = [b"vesting", beneficiary.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        payer = grantor,
        token::mint = mint,
        token::authority = vesting_account,
        seeds = [b"vault", vesting_account.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = grantor_token_account.mint == mint.key(),
        constraint = grantor_token_account.owner == grantor.key(),
    )]
    pub grantor_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut,
        constraint = vesting_account.beneficiary == beneficiary.key() @ VestingError::Unauthorized,
        constraint = !vesting_account.revoked @ VestingError::AlreadyRevoked,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    pub beneficiary: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vesting_account.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = beneficiary_token_account.mint == vesting_account.mint @ VestingError::WrongMint,
        constraint = beneficiary_token_account.owner == beneficiary.key() @ VestingError::Unauthorized,
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Revoke<'info> {
    #[account(
        mut,
        constraint = vesting_account.grantor == grantor.key() @ VestingError::Unauthorized,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    pub grantor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vesting_account.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub grantor_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct VestingInitialized {
    pub vesting: Pubkey,
    pub beneficiary: Pubkey,
    pub total_amount: u64,
    pub cliff_timestamp: i64,
    pub end_timestamp: i64,
}

#[event]
pub struct TokensClaimed {
    pub vesting: Pubkey,
    pub beneficiary: Pubkey,
    pub amount: u64,
    pub total_released: u64,
}

#[event]
pub struct VestingRevoked {
    pub vesting: Pubkey,
    pub beneficiary: Pubkey,
    pub unvested_returned: u64,
}

/// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum VestingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Cliff timestamp must be in the future")]
    CliffInPast,
    #[msg("End timestamp must be after cliff timestamp")]
    InvalidSchedule,
    #[msg("No tokens available to claim yet")]
    NothingToClaim,
    #[msg("Unauthorized: caller is not the beneficiary or grantor")]
    Unauthorized,
    #[msg("Vesting is not revocable")]
    NotRevocable,
    #[msg("Vesting has already been revoked")]
    AlreadyRevoked,
    #[msg("Token mint does not match vesting account")]
    WrongMint,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
```

### Security Checklist for Custom Vesting
- [ ] All signer checks are via Anchor `Signer<'info>` — never `UncheckedAccount` for authority
- [ ] Vault authority is the PDA — never an EOA
- [ ] Arithmetic uses `checked_add`, `checked_mul`, `checked_div`, `saturating_sub`
- [ ] Cliff timestamp is validated to be in the future at initialization
- [ ] `released_amount` never exceeds `total_amount`
- [ ] Tests cover: before-cliff claim (should fail), at-cliff claim, mid-vesting claim, full-vesting claim, double-claim attempt, revoke (if enabled)
- [ ] Tested on LiteSVM or Surfpool before mainnet

---

---

## Related Sub-skills
- Streamflow and schedule design -> [vesting.md](vesting.md)
- Token standard selection -> [token-standard.md](token-standard.md)
- Launch transparency -> [launch.md](launch.md)