import { mkdir, readdir, rename, rmdir, stat, statfs, unlink } from "node:fs/promises";
import { relative } from "node:path";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { databaseConfigured, first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { assertInsideRoot, ensureStorageRoot } from "@/lib/storage";

export const runtime = "nodejs";

type StorageEntry = {
  name: string;
  path: string;
  type: "file" | "folder";
  size: number;
  modifiedAt: string;
};

function storageUsage(stats: Awaited<ReturnType<typeof statfs>>) {
  const total = Number(stats.blocks) * Number(stats.bsize);
  const free = Number(stats.bavail) * Number(stats.bsize);
  const used = total - free;
  return {
    total,
    used,
    free,
    usedPercent: total ? Math.round((used / total) * 100) : 0,
  };
}

async function walk(root: string, base: string, query: string, output: StorageEntry[], depth = 0) {
  if (depth > 4 || output.length >= 200) return;
  const { target } = assertInsideRoot(root, base);
  const entries = await readdir(target, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (output.length >= 200) break;
    const childPath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = assertInsideRoot(root, childPath).target;
    const details = await stat(fullPath).catch(() => null);
    if (!details) continue;

    const matches = !query || childPath.toLowerCase().includes(query);
    if (matches) {
      output.push({
        name: entry.name,
        path: relative(root, fullPath).replace(/\\/g, "/"),
        type: entry.isDirectory() ? "folder" : "file",
        size: details.size,
        modifiedAt: details.mtime.toISOString(),
      });
    }

    if (entry.isDirectory()) {
      await walk(root, childPath, query, output, depth + 1);
    }
  }
}

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const base = url.searchParams.get("path") || "";
  const root = await ensureStorageRoot();
  const entries: StorageEntry[] = [];
  await walk(root, base, q, entries);
  const usage = storageUsage(await statfs(root));

  return NextResponse.json({ root, path: base, usage, entries });
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireStaffSession(["admin", "manager", "housing_officer", "finance"]);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "mkdir");
  const root = await ensureStorageRoot();

  if (action === "mkdir") {
    const folder = String(body.path || "").trim();
    if (!folder) return NextResponse.json({ error: "Folder path is required." }, { status: 400 });
    const { target } = assertInsideRoot(root, folder);
    await mkdir(target, { recursive: true });
    return NextResponse.json({ created: true, path: folder });
  }

  if (action === "rename") {
    const from = String(body.from || "");
    const to = String(body.to || "");
    if (!from || !to) return NextResponse.json({ error: "Source and destination are required." }, { status: 400 });
    const source = assertInsideRoot(root, from).target;
    const destination = assertInsideRoot(root, to).target;
    await rename(source, destination);
    return NextResponse.json({ renamed: true, from, to });
  }

  return NextResponse.json({ error: "Unsupported storage action." }, { status: 400 });
}

export async function DELETE(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance"]);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const filePath = url.searchParams.get("path") || "";
  if (!filePath) {
    return NextResponse.json({ error: "File path is required." }, { status: 400 });
  }

  const agencyId = await getAgencyId();
  const document = agencyId
    ? await first<{ id: string; delete_roles?: string[] }>(
        "select id, delete_roles from documents where agency_id = $1 and (storage_key = $2 or file_path like $3) limit 1",
        [agencyId, filePath, `%${filePath}`],
      )
    : null;

  const allowedDeleteRoles = document?.delete_roles?.length ? document.delete_roles : ["admin"];
  if (!allowedDeleteRoles.includes(auth.session!.role)) {
    return NextResponse.json({ error: "You do not have permission to delete this document." }, { status: 403 });
  }

  const root = await ensureStorageRoot();
  const { target } = assertInsideRoot(root, filePath);
  const targetStats = await stat(target);
  if (targetStats.isDirectory()) {
    await rmdir(target);
  } else {
    await unlink(target);
  }

  if (agencyId && document?.id) {
    await first("delete from documents where agency_id = $1 and id = $2 returning id", [agencyId, document.id]);
  }

  return NextResponse.json({ deleted: true });
}
