import { join, relative, resolve, sep } from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { first } from "@/lib/db";
import { getAgencyId } from "@/lib/erp-repository";
import { genericPlatformDefaults } from "@/lib/platform-config";

export const defaultStorageRoot = genericPlatformDefaults.storageRoot;

export function cleanStorageSegment(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "document";
}

export async function getStorageRoot() {
  const agencyId = await getAgencyId();
  if (!agencyId) return process.env.DOCUMENT_STORAGE_ROOT || defaultStorageRoot;
  const agency = await first<{ shared_file_root?: string | null }>("select shared_file_root from agencies where id = $1", [agencyId]);
  return agency?.shared_file_root?.trim() || process.env.DOCUMENT_STORAGE_ROOT || defaultStorageRoot;
}

export function assertInsideRoot(root: string, relativePath = "") {
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, relativePath);
  const distance = relative(resolvedRoot, target);
  if (distance.startsWith("..") || distance === ".." || distance.includes(`..${sep}`) || resolve(distance) === distance) {
    throw new Error("Invalid storage path.");
  }
  return { resolvedRoot, target };
}

export async function ensureStorageRoot() {
  const root = await getStorageRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export async function storageFileExists(root: string, relativePath: string) {
  const { target } = assertInsideRoot(root, relativePath);
  const details = await stat(target);
  return { target, details };
}

export function storageKeyFor(parts: string[]) {
  return parts.map(cleanStorageSegment).filter(Boolean).join("/");
}

export function storagePath(root: string, key: string) {
  const { target } = assertInsideRoot(root, key);
  return join(target);
}
