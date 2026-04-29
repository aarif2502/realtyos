import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const SOURCE_DIR = "Serenity Consultancy (UK) Ltd council tax 2026-2027";
const DEFAULT_PDF = path.join(process.cwd(), SOURCE_DIR, "Cycle 98.pdf");
const sourceArgIndex = process.argv.findIndex((arg) => arg === "--source");
const pdfPath = sourceArgIndex >= 0 ? process.argv[sourceArgIndex + 1] : DEFAULT_PDF;

function runPythonExtractor(filePath) {
  const code = `
from pathlib import Path
import json, re, sys
try:
    from pypdf import PdfReader
except Exception as exc:
    print(json.dumps({"ok": False, "error": "pypdf unavailable"}))
    sys.exit(0)
path = Path(sys.argv[1])
try:
    text = "\\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
    print(json.dumps({"ok": True, "text": text}))
except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc)}))
`;
  const bundledPython = path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", process.platform === "win32" ? "python.exe" : "bin/python");
  const candidates = [process.env.PYTHON, bundledPython, "python", "python3"].filter(Boolean);
  for (const command of candidates) {
    const result = spawnSync(command, ["-c", code, filePath], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    if (!result.error && result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout);
        if (parsed.ok) return parsed.text;
      } catch {
        // Try next command.
      }
    }
  }
  return null;
}

function parseText(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pound = "\u00a3";
  const propertyLabel = lines[0] || null;
  const periodMatch = text.match(/Period Covered\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})/);
  const dailyMatch = text.match(new RegExp(`Daily Amount\\s+${pound}\\s*([0-9,]+\\.\\d{2})`));
  const totalMatch = text.match(new RegExp(`Total Payable\\s+${pound}\\s*([0-9,]+\\.\\d{2})`));
  const lineRegex = new RegExp(`^(\\d+)\\s+(.+?)\\s+(\\d{2}\\/\\d{2}\\/\\d{2})\\s+(\\d{2}\\/\\d{2}\\/\\d{2})\\s+(\\d+)\\s+${pound}\\s*([0-9,]+\\.\\d{2})$`);
  const paymentLines = [];
  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;
    paymentLines.push({
      lineNumber: Number(match[1]),
      rawNameTokenCount: match[2].split(/\s+/).length,
      periodStart: match[3],
      periodEnd: match[4],
      days: Number(match[5]),
      payableAmount: Number(match[6].replace(/,/g, "")),
    });
  }
  const totalFromLines = paymentLines.reduce((sum, line) => sum + line.payableAmount, 0);
  const declaredTotal = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : null;
  const confidence = propertyLabel && periodMatch && paymentLines.length && declaredTotal !== null && Math.abs(totalFromLines - declaredTotal) < 0.01 ? "high" : "low";
  return {
    source: path.basename(pdfPath),
    purpose: "Remittance/payment example only. Not Cycle 100 proof.",
    extractionConfidence: confidence,
    propertyLabel,
    periodCovered: periodMatch ? { start: periodMatch[1], end: periodMatch[2] } : null,
    dailyAmount: dailyMatch ? Number(dailyMatch[1].replace(/,/g, "")) : null,
    paymentLineCount: paymentLines.length,
    paymentLinesRedacted: paymentLines,
    totalPayableFromLines: Number(totalFromLines.toFixed(2)),
    totalPayableDeclared: declaredTotal,
    recommendations: {
      remittance_batches: "One batch per uploaded remittance file, scoped by agency_id, housing_association_id, cycle_list_number and period.",
      remittance_line_items: "One row per parsed payable line, with raw tenant/name text stored only in DB, matched by normalized address, tenant/claim, occupancy period and cycle.",
      landlord_payment_rates: "Store property-specific landlord rates such as monthly or per-cycle rates as configurable data.",
      landlord_payment_obligations: "Create obligations from confirmed matched remittance lines and active landlord rates; do not mark as paid without payment evidence.",
      cycle100_warning: "Cycle 98 should not be imported as Cycle 100 received/payment proof.",
    },
  };
}

let text = runPythonExtractor(pdfPath);
let fallbackUsed = false;
if (!text) {
  fallbackUsed = true;
  const buffer = await fs.readFile(pdfPath);
  text = buffer.toString("latin1");
}

const analysis = parseText(text);
if (fallbackUsed) {
  analysis.extractionConfidence = "low";
  analysis.warning = "Python/pypdf extraction was unavailable. Raw PDF fallback is not reliable; do not use financial values without manual confirmation.";
}
if (analysis.extractionConfidence !== "high") {
  analysis.warning = analysis.warning || "Extraction confidence is low. Do not guess or import financial values.";
}

console.log(JSON.stringify(analysis, null, 2));
