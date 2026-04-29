import { NextResponse } from "next/server";
import { requireOwnerAdmin, requireStaffSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import {
  createDocument,
  createIncident,
  createAutomationTask,
  createContract,
  createCommunicationLog,
  createCrmPartner,
  createLandlord,
  createLandlordPayment,
  createLedgerEntry,
  createExpenseEntry,
  createMaintenanceJob,
  createProperty,
  createReferral,
  createStaffUser,
  createRiskAssessment,
  createSupportPlan,
  createSupportNote,
  createTenant,
  deleteAdminCollection,
  updateAdminCollection,
} from "@/lib/erp-repository";
import type { StaffRole } from "@/lib/erp-repository";

const creators = {
  staff: createStaffUser,
  properties: createProperty,
  landlords: createLandlord,
  tenants: createTenant,
  contracts: createContract,
  ledger: createLedgerEntry,
  supportNotes: createSupportNote,
  documents: createDocument,
  incidents: createIncident,
  crmPartners: createCrmPartner,
  referrals: createReferral,
  communicationLogs: createCommunicationLog,
  supportPlans: createSupportPlan,
  riskAssessments: createRiskAssessment,
  automationTasks: createAutomationTask,
  maintenanceJobs: createMaintenanceJob,
  expenses: createExpenseEntry,
  landlordPayments: createLandlordPayment,
};

type Collection = keyof typeof creators;
type WritableCollection = Collection | "agency" | "rooms" | "website";
type MethodName = "POST" | "PATCH" | "DELETE";

const writeRoles: Record<WritableCollection, Partial<Record<MethodName, StaffRole[]>>> = {
  agency: {
    PATCH: ["admin"],
  },
  website: {
    PATCH: ["admin"],
  },
  staff: {
    POST: ["admin"],
    PATCH: ["admin"],
    DELETE: ["admin"],
  },
  properties: {
    POST: ["admin", "manager", "housing_officer"],
    PATCH: ["admin", "manager", "housing_officer"],
    DELETE: ["admin"],
  },
  rooms: {
    PATCH: ["admin", "manager", "housing_officer"],
  },
  landlords: {
    POST: ["admin", "manager", "finance"],
    PATCH: ["admin", "manager", "finance"],
    DELETE: ["admin"],
  },
  tenants: {
    POST: ["admin", "manager", "support_worker", "housing_officer"],
    PATCH: ["admin", "manager", "support_worker", "housing_officer"],
    DELETE: ["admin"],
  },
  contracts: {
    POST: ["admin", "manager", "housing_officer", "finance"],
    PATCH: ["admin", "manager", "housing_officer", "finance"],
    DELETE: ["admin"],
  },
  ledger: {
    POST: ["admin", "manager", "finance"],
    PATCH: ["admin", "manager", "finance"],
    DELETE: ["admin"],
  },
  supportNotes: {
    POST: ["admin", "manager", "support_worker", "housing_officer"],
    PATCH: ["admin", "manager", "support_worker", "housing_officer"],
    DELETE: ["admin"],
  },
  documents: {
    POST: ["admin", "manager", "support_worker", "housing_officer", "finance"],
    PATCH: ["admin", "manager", "support_worker", "housing_officer", "finance"],
    DELETE: ["admin"],
  },
  incidents: {
    POST: ["admin", "manager", "support_worker", "housing_officer"],
    PATCH: ["admin", "manager", "support_worker", "housing_officer"],
    DELETE: ["admin"],
  },
  crmPartners: {
    POST: ["admin", "manager", "housing_officer"],
    PATCH: ["admin", "manager", "housing_officer"],
    DELETE: ["admin"],
  },
  referrals: {
    POST: ["admin", "manager", "housing_officer", "support_worker"],
    PATCH: ["admin", "manager", "housing_officer", "support_worker"],
    DELETE: ["admin"],
  },
  communicationLogs: {
    POST: ["admin", "manager", "housing_officer", "support_worker"],
    PATCH: ["admin", "manager", "housing_officer", "support_worker"],
    DELETE: ["admin"],
  },
  supportPlans: {
    POST: ["admin", "manager", "housing_officer", "support_worker"],
    PATCH: ["admin", "manager", "housing_officer", "support_worker"],
    DELETE: ["admin"],
  },
  riskAssessments: {
    POST: ["admin", "manager", "housing_officer", "support_worker"],
    PATCH: ["admin", "manager", "housing_officer", "support_worker"],
    DELETE: ["admin"],
  },
  automationTasks: {
    POST: ["admin", "manager", "housing_officer", "support_worker", "finance"],
    PATCH: ["admin", "manager", "housing_officer", "support_worker", "finance"],
    DELETE: ["admin"],
  },
  maintenanceJobs: {
    POST: ["admin", "manager", "housing_officer", "support_worker"],
    PATCH: ["admin", "manager", "housing_officer", "support_worker"],
    DELETE: ["admin"],
  },
  expenses: {
    POST: ["admin", "manager", "finance"],
    PATCH: ["admin", "manager", "finance"],
    DELETE: ["admin"],
  },
  landlordPayments: {
    POST: ["admin", "manager", "finance"],
    PATCH: ["admin", "manager", "finance"],
    DELETE: ["admin"],
  },
};

function collectionFrom(value: string): Collection | null {
  return value in creators ? (value as Collection) : null;
}

export async function POST(request: Request, context: { params: Promise<{ collection: string }> }) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const params = await context.params;
  const collection = collectionFrom(params.collection);

  if (!collection) {
    return NextResponse.json({ error: "Unsupported ERP collection." }, { status: 404 });
  }

  const auth = collection === "staff" ? await requireOwnerAdmin() : await requireStaffSession(writeRoles[collection].POST);
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const record = await creators[collection](body);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save record." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ collection: string }> }) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const params = await context.params;
  const body = await request.json();
  const collection = params.collection as WritableCollection;

  if (!(collection in writeRoles)) {
    return NextResponse.json({ error: "Unsupported ERP collection." }, { status: 404 });
  }

  const auth = collection === "staff" || collection === "agency" || collection === "website" ? await requireOwnerAdmin() : await requireStaffSession(writeRoles[collection]?.PATCH);

  if (auth.response) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const record = await updateAdminCollection(params.collection, url.searchParams.get("id") ?? (typeof body.id === "string" ? body.id : null), body);
    if (!record) {
      return NextResponse.json({ error: "Record not found or unsupported collection." }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update record." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ collection: string }> }) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const params = await context.params;
  const collection = params.collection as WritableCollection;

  if (!(collection in writeRoles)) {
    return NextResponse.json({ error: "Unsupported ERP collection." }, { status: 404 });
  }

  const auth = collection === "staff" ? await requireOwnerAdmin() : await requireStaffSession(writeRoles[collection]?.DELETE);

  if (auth.response) {
    return auth.response;
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  }

  try {
    const record = await deleteAdminCollection(params.collection, id);
    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete record." }, { status: 400 });
  }
}
