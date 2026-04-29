import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { FileBlob, PresentationFile, drawSlideToCtx } from "@oai/artifact-tool";

const require = createRequire(import.meta.url);
const { Canvas } = require("C:/Users/AArif/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/node_modules/skia-canvas");

const pptxPath = path.resolve("output", "syniti-s4hana-final-load.pptx");
const outDir = path.resolve("scratch", "previews");
fs.mkdirSync(outDir, { recursive: true });

const blob = await FileBlob.load(pptxPath);
const presentation = await PresentationFile.importPptx(blob);

for (const [i, slide] of presentation.slides.items.entries()) {
  const canvas = new Canvas(1920, 1080);
  const ctx = canvas.getContext("2d");
  await drawSlideToCtx(slide, presentation, ctx, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
    clearBeforeDraw: true,
  });
  const png = await canvas.toBuffer("png");
  fs.writeFileSync(path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`), png);
}

console.log(JSON.stringify({ ok: true, slides: presentation.slides.items.length, previews: outDir }, null, 2));
