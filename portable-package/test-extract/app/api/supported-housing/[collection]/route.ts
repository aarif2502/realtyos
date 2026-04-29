import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import {
  createSupportedHousingRecord,
  getSupportedHousingState,
  updateSupportedHousingRecord,
  type SupportedHousingState,
} from "@/lib/supported-housing-store";

const collections = new Set<keyof SupportedHousingState>([
  "residents",
  "referrals",
  "properties",
  "incidents",
  "tasks",
  "claims",
  "compliance",
]);

function collectionFrom(params: { collection: string }) {
  return collections.has(params.collection as keyof SupportedHousingState)
    ? (params.collection as keyof SupportedHousingState)
    : null;
}

export async function GET(_request: Request, context: { params: Promise<{ collection: string }> }) {
  const auth = await requireStaffSession(["admin", "manager", "support_worker", "housing_officer", "finance", "readonly"]);
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const collection = collectionFrom(params);

  if (!collection) {
    return NextResponse.json({ error: "Unsupported collection" }, { status: 404 });
  }

  return NextResponse.json(getSupportedHousingState()[collection]);
}

export async function POST(request: Request, context: { params: Promise<{ collection: string }> }) {
  const auth = await requireStaffSession(["admin", "manager"]);
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const collection = collectionFrom(params);

  if (!collection) {
    return NextResponse.json({ error: "Unsupported collection" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const record = createSupportedHousingRecord(collection, body);

  return NextResponse.json(record, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ collection: string }> }) {
  const auth = await requireStaffSession(["admin", "manager"]);
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const collection = collectionFrom(params);

  if (!collection) {
    return NextResponse.json({ error: "Unsupported collection" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Record id is required" }, { status: 400 });
  }

  const record = updateSupportedHousingRecord(collection, id, body);

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}
