#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const modelPath = process.argv[2] ?? path.join("examples", "supply-model.json");
const raw = fs.readFileSync(modelPath, "utf8");
const model = JSON.parse(raw);

const errors = [];
const totalSupply = Number(model?.token?.total_supply);

if (!Number.isFinite(totalSupply) || totalSupply <= 0) {
  errors.push("token.total_supply must be a positive number");
}

const allocations = Array.isArray(model.allocations) ? model.allocations : [];
if (allocations.length === 0) {
  errors.push("allocations must be a non-empty array");
}

const pctTotal = allocations.reduce((sum, item) => sum + Number(item.percentage ?? 0), 0);
const tokenTotal = allocations.reduce((sum, item) => sum + Number(item.tokens ?? 0), 0);

if (Math.abs(pctTotal - 100) > 0.000001) {
  errors.push(`allocation percentages must sum to 100; got ${pctTotal}`);
}

if (tokenTotal !== totalSupply) {
  errors.push(`allocation token total must equal total supply; got ${tokenTotal} vs ${totalSupply}`);
}

for (const item of allocations) {
  const expected = Math.round((totalSupply * Number(item.percentage ?? 0)) / 100);
  if (Number(item.tokens) !== expected) {
    errors.push(`${item.category}: tokens should be ${expected} from ${item.percentage}% of total supply`);
  }

  const recipients = Array.isArray(item.recipients) ? item.recipients : [];
  if (recipients.length > 0) {
    const recipientTotal = recipients.reduce((sum, recipient) => sum + Number(recipient.tokens ?? 0), 0);
    if (recipientTotal !== Number(item.tokens)) {
      errors.push(`${item.category}: recipient tokens sum to ${recipientTotal}, expected ${item.tokens}`);
    }
  }
}

const summary = model.summary ?? {};
if (Number(summary.total_supply) !== totalSupply) {
  errors.push("summary.total_supply must match token.total_supply");
}

const tgeSupply = Number(summary.tge_circulating_supply);
const tgePct = Number(summary.tge_circulating_pct);
if (Number.isFinite(tgeSupply) && Number.isFinite(tgePct)) {
  const expectedPct = (tgeSupply / totalSupply) * 100;
  if (Math.abs(expectedPct - tgePct) > 0.01) {
    errors.push(`summary.tge_circulating_pct should be ${expectedPct.toFixed(2)}, got ${tgePct}`);
  }
}

if (errors.length > 0) {
  console.error("Supply model validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Supply model OK: ${allocations.length} allocations, ${pctTotal}% total, ${tokenTotal} tokens.`);
