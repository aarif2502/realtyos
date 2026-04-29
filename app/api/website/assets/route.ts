import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/auth";
import { cleanStorageSegment } from "@/lib/storage";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(request: Request) {
  const auth = await requireOwnerAdmin();
  if (auth.response) return auth.response;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG, WEBP or SVG images can be uploaded." }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 4 MB or smaller." }, { status: 400 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "img";
  const safeName = cleanStorageSegment(file.name.replace(/\.[^.]+$/, ""));
  const publicDir = join(process.cwd(), "public", "uploads");
  await mkdir(publicDir, { recursive: true });
  const filename = `${Date.now()}-${safeName}.${extension}`;
  const absolutePath = join(publicDir, filename);
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ path: `/uploads/${filename}` }, { status: 201 });
}
