/**
 * vesting-schedule.ts
 * 
 * Streamflow vesting setup template for a Solana token launch.
 * Demonstrates: schedule construction, dry-run review, stream querying,
 * and generating a transparency report from stream metadata.
 * 
 * SDK: @streamflow/stream v5+
 * Docs: https://docs.streamflow.finance
 * 
 * Install:
 *   npm install @streamflow/stream @solana/web3.js bn.js
 * 
 * Usage:
 *   npx ts-node vesting-schedule.ts create
 *
 * Safety:
 *   This file defaults to dry-run output. Replace all placeholder addresses
 *   and review Streamflow SDK transaction handling before mainnet execution.
 */

import {
  StreamflowSolana,
  Types,
  getBN,
} from "@streamflow/stream";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  // Your token mint address
  TOKEN_MINT: process.env.TOKEN_MINT ?? "YOUR_TOKEN_MINT_ADDRESS_HERE",
  
  // Token decimals (6 for most SPL tokens)
  DECIMALS: 6,

  // RPC endpoint
  RPC_URL: process.env.RPC_URL ?? clusterApiUrl("mainnet-beta"),

  // Path to your deployer wallet keypair (never commit this)
  KEYPAIR_PATH: process.env.KEYPAIR_PATH ?? `${process.env.HOME}/.config/solana/id.json`,

  // Network
  CLUSTER: Types.ICluster.Mainnet, // or Types.ICluster.Devnet for testing
};

// ─── Time Helpers ─────────────────────────────────────────────────────────────

const NOW = Math.floor(Date.now() / 1000);
const ONE_DAY = 86_400;
const ONE_MONTH = ONE_DAY * 30; // approximation; use exact dates for production

function monthsFromNow(months: number): number {
  return NOW + ONE_MONTH * months;
}

function dateToUnix(dateString: string): number {
  return Math.floor(new Date(dateString).getTime() / 1000);
}

// ─── Token Amount Helpers ─────────────────────────────────────────────────────

function tokens(amount: number): BN {
  return getBN(amount, CONFIG.DECIMALS);
}

function monthlyAmount(totalTokens: number, vestingMonths: number): BN {
  return tokens(Math.floor(totalTokens / vestingMonths));
}

function isPlaceholder(value: string): boolean {
  return value.includes("YOUR_") || value.includes("_ADDRESS") || value.includes("PLACEHOLDER");
}

function assertReadyForExecution() {
  const placeholders: string[] = [];

  if (isPlaceholder(CONFIG.TOKEN_MINT)) {
    placeholders.push("CONFIG.TOKEN_MINT");
  }

  const allSchedules = [
    ...VESTING_SCHEDULES.team,
    ...VESTING_SCHEDULES.seed,
    ...VESTING_SCHEDULES.advisors,
  ];

  for (const schedule of allSchedules) {
    if (isPlaceholder(schedule.recipient)) {
      placeholders.push(`${schedule.label}.recipient`);
    }
    try {
      new PublicKey(schedule.recipient);
    } catch {
      placeholders.push(`${schedule.label}.recipient is not a valid Solana address`);
    }
  }

  try {
    new PublicKey(CONFIG.TOKEN_MINT);
  } catch {
    placeholders.push("CONFIG.TOKEN_MINT is not a valid Solana mint address");
  }

  if (placeholders.length > 0) {
    throw new Error(
      "Refusing to execute with invalid configuration:\n" +
        placeholders.map((item) => `- ${item}`).join("\n")
    );
  }
}

// ─── Vesting Schedule Definitions ────────────────────────────────────────────

/**
 * All stakeholder vesting schedules for a 1B token launch.
 * Edit these to match your supply-model.json.
 */
const VESTING_SCHEDULES = {
  /**
   * Team vesting: 12-month cliff, 36-month linear stream
   * Total team allocation: 18% = 180,000,000 tokens
   */
  team: [
    {
      label: "Team — Co-founder A",
      recipient: "CO_FOUNDER_A_WALLET_ADDRESS",
      totalTokens: 60_000_000,
      cliffMonths: 12,
      linearMonths: 36,
      revocable: true, // team vesting should be revocable for departure protection
    },
    {
      label: "Team — Co-founder B",
      recipient: "CO_FOUNDER_B_WALLET_ADDRESS",
      totalTokens: 60_000_000,
      cliffMonths: 12,
      linearMonths: 36,
      revocable: true,
    },
    {
      label: "Team — CTO",
      recipient: "CTO_WALLET_ADDRESS",
      totalTokens: 40_000_000,
      cliffMonths: 12,
      linearMonths: 36,
      revocable: true,
    },
    {
      label: "Team — Head of Growth",
      recipient: "HEAD_OF_GROWTH_WALLET_ADDRESS",
      totalTokens: 20_000_000,
      cliffMonths: 12,
      linearMonths: 36,
      revocable: true,
    },
  ],

  /**
   * Seed investor vesting: 6-month cliff, 24-month linear stream
   * Total seed allocation: 8% = 80,000,000 tokens
   */
  seed: [
    {
      label: "Seed — VC Fund A",
      recipient: "VC_FUND_A_WALLET_ADDRESS",
      totalTokens: 50_000_000,
      cliffMonths: 6,
      linearMonths: 24,
      revocable: false, // investor vesting is binding
    },
    {
      label: "Seed — Angel Investor",
      recipient: "ANGEL_INVESTOR_WALLET_ADDRESS",
      totalTokens: 30_000_000,
      cliffMonths: 6,
      linearMonths: 24,
      revocable: false,
    },
  ],

  /**
   * Advisor vesting: 6-month cliff, 18-month linear stream
   * Total advisor allocation: 3% = 30,000,000 tokens
   */
  advisors: [
    {
      label: "Advisor — DeFi Expert",
      recipient: "ADVISOR_A_WALLET_ADDRESS",
      totalTokens: 15_000_000,
      cliffMonths: 6,
      linearMonths: 18,
      revocable: false,
    },
    {
      label: "Advisor — BD Lead",
      recipient: "ADVISOR_B_WALLET_ADDRESS",
      totalTokens: 15_000_000,
      cliffMonths: 6,
      linearMonths: 18,
      revocable: false,
    },
  ],
};

// ─── Stream Parameter Builder ─────────────────────────────────────────────────

interface StakeholderSchedule {
  label: string;
  recipient: string;
  totalTokens: number;
  cliffMonths: number;
  linearMonths: number;
  revocable: boolean;
}

function buildStreamParams(schedule: StakeholderSchedule): Types.ICreateStreamData {
  const cliffTimestamp = monthsFromNow(schedule.cliffMonths);
  const monthly = Math.floor(schedule.totalTokens / schedule.linearMonths);

  return {
    recipient: schedule.recipient,
    tokenId: CONFIG.TOKEN_MINT,
    
    // Stream starts immediately (but nothing is claimable until cliff)
    start: NOW,
    
    // Total tokens in this stream
    amount: tokens(schedule.totalTokens),
    
    // Release cadence: monthly (30 days in seconds)
    period: ONE_MONTH,
    
    // Amount released each period after cliff
    amountPerPeriod: tokens(monthly),
    
    // Cliff timestamp: nothing before this
    cliff: cliffTimestamp,
    
    // Tokens released at the exact cliff moment
    // Set to 0 for pure linear-after-cliff vesting
    cliffAmount: tokens(0),
    
    // Revocability — set based on your agreement with stakeholder
    cancelableBySender: schedule.revocable,
    cancelableByRecipient: false,
    
    // Transferability
    transferableBySender: false,
    transferableByRecipient: false,
    
    canTopup: false,
    name: schedule.label,
  };
}

// ─── Main: Create All Vesting Streams ────────────────────────────────────────

async function createAllVestingStreams() {
  // Load keypair
  const keypairData = JSON.parse(fs.readFileSync(CONFIG.KEYPAIR_PATH, "utf-8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  assertReadyForExecution();

  console.log("\nDeployer wallet:", payer.publicKey.toBase58());
  console.log("Token mint:", CONFIG.TOKEN_MINT);
  console.log("Cluster:", CONFIG.CLUSTER);
  console.log("\n─────────────────────────────────────────────\n");

  const client = new StreamflowSolana.SolanaStreamClient(
    CONFIG.RPC_URL,
    CONFIG.CLUSTER
  );

  const results: Array<{
    label: string;
    recipient: string;
    streamId: string;
    streamUrl: string;
    totalTokens: number;
    cliffMonths: number;
    linearMonths: number;
  }> = [];

  // Process each stakeholder group
  const allSchedules = [
    ...VESTING_SCHEDULES.team,
    ...VESTING_SCHEDULES.seed,
    ...VESTING_SCHEDULES.advisors,
  ];

  for (const schedule of allSchedules) {
    console.log(`Preparing stream: ${schedule.label}`);
    console.log(
      `   Recipient: ${schedule.recipient.slice(0, 8)}...`
    );
    console.log(
      `   Amount: ${schedule.totalTokens.toLocaleString()} tokens`
    );
    console.log(
      `   Schedule: ${schedule.cliffMonths}mo cliff → ${schedule.linearMonths}mo linear`
    );

    try {
      const params = buildStreamParams(schedule);
      
      const { ixs, metadata } = await client.create(params, {
        sender: payer,
        isNative: false,
      });

      const streamUrl = `https://app.streamflow.finance/stream/${metadata.id}`;
      
      results.push({
        label: schedule.label,
        recipient: schedule.recipient,
        streamId: metadata.id,
        streamUrl,
        totalTokens: schedule.totalTokens,
        cliffMonths: schedule.cliffMonths,
        linearMonths: schedule.linearMonths,
      });

      console.log(`   Stream ID: ${metadata.id}`);
      console.log(`   URL: ${streamUrl}\n`);

    } catch (err) {
      console.error(`   Failed: ${schedule.label}`, err);
      // Continue with other streams rather than aborting
    }
  }

  return results;
}

// ─── Query Existing Streams ───────────────────────────────────────────────────

async function queryExistingStreams(senderAddress: string) {
  const client = new StreamflowSolana.SolanaStreamClient(
    CONFIG.RPC_URL,
    CONFIG.CLUSTER
  );

  const streams = await client.get({
    address: senderAddress,
    type: Types.StreamType.All,
    direction: Types.StreamDirection.Outgoing,
  });

  console.log(`\nActive streams for ${senderAddress.slice(0, 8)}...\n`);
  
  const table: Array<{
    Name: string;
    Recipient: string;
    "Total Tokens": string;
    "% Withdrawn": string;
    "Cliff Date": string;
    Status: string;
  }> = [];

  for (const [id, stream] of streams) {
    const pctWithdrawn = stream.depositedAmount.isZero()
      ? 0
      : (Number(stream.withdrawnAmount) / Number(stream.depositedAmount)) * 100;

    const cliffDate = new Date(Number(stream.cliff) * 1000).toLocaleDateString();
    const isCanceled = stream.canceledAt > 0;
    const now = Math.floor(Date.now() / 1000);
    const hasStarted = Number(stream.cliff) < now;

    table.push({
      Name: stream.name ?? id.slice(0, 12) + "...",
      Recipient: stream.recipient.slice(0, 8) + "...",
      "Total Tokens": (Number(stream.depositedAmount) / 10 ** CONFIG.DECIMALS)
        .toLocaleString(),
      "% Withdrawn": pctWithdrawn.toFixed(1) + "%",
      "Cliff Date": cliffDate,
      Status: isCanceled
        ? "REVOKED"
        : hasStarted
        ? "STREAMING"
        : "PENDING CLIFF",
    });
  }

  console.table(table);
  return streams;
}

// ─── Generate Transparency Report ────────────────────────────────────────────

function generateTransparencyReport(
  results: Array<{
    label: string;
    recipient: string;
    streamId: string;
    streamUrl: string;
    totalTokens: number;
    cliffMonths: number;
    linearMonths: number;
  }>
) {
  const totalVested = results.reduce((sum, r) => sum + r.totalTokens, 0);

  const vestingTable = results
    .map(
      (r) =>
        `| ${r.label.padEnd(30)} | ${r.recipient.slice(0, 8)}... | ${r.totalTokens
          .toLocaleString()
          .padStart(15)} | ${r.cliffMonths}mo cliff, ${r.linearMonths}mo linear | [View](${r.streamUrl}) |`
    )
    .join("\n");

  const report = `
# Vesting Transparency Report
Generated: ${new Date().toISOString()}

## Summary
- **Token Mint:** \`${CONFIG.TOKEN_MINT}\`
- **Total Under Vesting:** ${totalVested.toLocaleString()} tokens
- **Streams Created:** ${results.length}

## Vesting Streams

| Stakeholder | Wallet | Tokens | Schedule | Proof |
|-------------|--------|--------|---------|-------|
${vestingTable}

## Stream IDs (for on-chain verification)
${results.map((r) => `- ${r.label}: \`${r.streamId}\``).join("\n")}

---
*Powered by Streamflow Finance. All streams are on-chain and publicly verifiable.*
`;

  fs.writeFileSync("vesting-transparency-report.md", report.trim());
  console.log("\nTransparency report saved to: vesting-transparency-report.md");
  return report;
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "create";

  switch (command) {
    case "create": {
      console.log("Reviewing vesting stream configuration...\n");
      console.log("Running in DRY RUN mode. Set STREAMFLOW_EXECUTE=true after replacing all placeholders.\n");
      
      // In a real deployment, execute the streams.
      // For safety, this example logs the configuration without executing.
      const allSchedules = [
        ...VESTING_SCHEDULES.team,
        ...VESTING_SCHEDULES.seed,
        ...VESTING_SCHEDULES.advisors,
      ];

      console.log(`Will create ${allSchedules.length} vesting streams:\n`);
      for (const s of allSchedules) {
        const monthly = Math.floor(s.totalTokens / s.linearMonths);
        console.log(`  ${s.label}`);
        console.log(`     Wallet:   ${s.recipient.slice(0, 16)}...`);
        console.log(`     Total:    ${s.totalTokens.toLocaleString()} tokens`);
        console.log(`     Cliff:    ${s.cliffMonths} months from now`);
        console.log(`     Linear:   ${s.linearMonths} months @ ~${monthly.toLocaleString()}/month`);
        console.log(`     Revoke:   ${s.revocable ? "Yes (sender can cancel)" : "No (binding)"}\n`);
      }

      if (process.env.STREAMFLOW_EXECUTE === "true") {
        console.log("STREAMFLOW_EXECUTE=true detected. This template will call the Streamflow SDK create path.");
        console.log("Review the installed SDK version and transaction handling before using this on mainnet.\n");
        const results = await createAllVestingStreams();
        generateTransparencyReport(results);
      } else {
        console.log("Set STREAMFLOW_EXECUTE=true to submit transactions to Solana.\n");
      }
      break;
    }

    case "query": {
      const senderAddress = args[1];
      if (!senderAddress) {
        console.error("Usage: npx ts-node vesting-schedule.ts query <SENDER_ADDRESS>");
        process.exit(1);
      }
      await queryExistingStreams(senderAddress);
      break;
    }

    default: {
      console.log("Usage:");
      console.log("  npx ts-node vesting-schedule.ts create           # Dry-run: print all stream configs");
      console.log("  STREAMFLOW_EXECUTE=true npx ts-node vesting-schedule.ts create  # Execute on-chain");
      console.log("  npx ts-node vesting-schedule.ts query <SENDER>   # Query existing streams");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
