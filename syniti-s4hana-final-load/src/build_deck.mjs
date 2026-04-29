import fs from "node:fs";
import path from "node:path";
import {
  Presentation,
  PresentationFile,
  column,
  row,
  grid,
  layers,
  panel,
  text,
  shape,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  fr,
} from "@oai/artifact-tool";

const W = 1920;
const H = 1080;
const OUT = path.resolve("output");
const SCRATCH = path.resolve("scratch");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SCRATCH, { recursive: true });

const C = {
  ink: "#17212B",
  slate: "#364454",
  quiet: "#6B7886",
  line: "#CED7DF",
  mist: "#EEF4F7",
  cloud: "#F7FAFC",
  white: "#FFFFFF",
  teal: "#0B7C86",
  tealDark: "#075C64",
  lime: "#79B943",
  amber: "#D89922",
  red: "#B84A4A",
  navy: "#102A43",
  sap: "#0A6ED1",
  hana: "#20A4F3",
};

const font = "Aptos";
const src = "Sources: Syniti Help docs: LTMC/SAP S/4HANA Migration Cockpit; SAP HANA; SAP HANA as Target; S/4HANA Cloud Public Edition; Client and Server Security Options.";

function addSlide(p, node, name) {
  const s = p.slides.add();
  s.compose(node, { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 });
  return s;
}

function bg(children, color = C.cloud) {
  if (children.length === 1) {
    return panel({ name: "bg-panel", width: fill, height: fill, fill: color, stroke: "transparent", padding: { x: 80, y: 50 } }, children[0]);
  }
  return layers({ name: "bg", width: fill, height: fill }, [
    shape({ name: "background", shape: "rect", width: fill, height: fill, fill: color, stroke: "transparent" }),
    ...children,
  ]);
}

function titleBlock(title, subtitle, accent = C.teal) {
  return column({ name: "title-stack", width: fill, height: hug, gap: 14 }, [
    text(title, { name: "slide-title", width: fill, height: hug, style: { font, fontSize: 44, bold: true, color: C.ink } }),
    rule({ name: "title-rule", width: fixed(170), stroke: accent, weight: 5 }),
    subtitle ? text(subtitle, { name: "slide-subtitle", width: wrap(1240), height: hug, style: { font, fontSize: 23, color: C.slate } }) : null,
  ].filter(Boolean));
}

function footer(label = src) {
  return text(label, { name: "source-rail", width: fill, height: hug, style: { font, fontSize: 11, color: "#7C8792" } });
}

function pill(label, color = C.teal, dark = false) {
  return panel(
    { name: `pill-${label}`, width: hug, height: fixed(44), padding: { x: 18, y: 8 }, borderRadius: 22, fill: dark ? color : "#E7F4F5", stroke: dark ? color : "#B9DADD" },
    text(label, { name: `pill-text-${label}`, width: hug, height: hug, style: { font, fontSize: 18, bold: true, color: dark ? C.white : color } }),
  );
}

function box(label, sub, color = C.white, stroke = C.line) {
  return panel(
    { name: `box-${label}`, width: fill, height: fill, padding: { x: 26, y: 22 }, borderRadius: 8, fill: color, stroke },
    column({ width: fill, height: hug, gap: 8 }, [
      text(label, { name: `box-title-${label}`, width: fill, height: hug, style: { font, fontSize: 27, bold: true, color: C.ink } }),
      sub ? text(sub, { name: `box-sub-${label}`, width: fill, height: hug, style: { font, fontSize: 18, color: C.slate } }) : null,
    ].filter(Boolean)),
  );
}

function step(n, title, copy, color = C.teal) {
  return row({ name: `step-${n}`, width: fill, height: hug, gap: 18, align: "start" }, [
    panel({ width: fixed(50), height: fixed(50), borderRadius: 25, fill: color, stroke: color, padding: 0 },
      text(String(n), { width: fill, height: hug, style: { font, fontSize: 23, bold: true, color: C.white, alignment: "center" } })),
    column({ width: fill, height: hug, gap: 5 }, [
      text(title, { width: fill, height: hug, style: { font, fontSize: 27, bold: true, color: C.ink } }),
      text(copy, { width: wrap(690), height: hug, style: { font, fontSize: 19, color: C.slate } }),
    ]),
  ]);
}

function arrowRight(color = C.teal) {
  return text("->", { name: "arrow", width: fixed(48), height: hug, style: { font, fontSize: 35, bold: true, color, alignment: "center" } });
}

function runbookCard(n, title, copy, color) {
  return panel({ width: fill, height: fill, borderRadius: 8, fill: C.white, stroke: "#D4DEE6", padding: { x: 22, y: 24 } },
    column({ width: fill, height: fill, gap: 16 }, [
      panel({ width: fixed(52), height: fixed(52), borderRadius: 26, fill: color, stroke: color, padding: 0 },
        text(String(n), { width: fill, height: hug, style: { font, fontSize: 23, bold: true, color: C.white, alignment: "center" } })),
      text(title, { width: fill, height: hug, style: { font, fontSize: 25, bold: true, color: C.ink } }),
      text(copy, { width: fill, height: hug, style: { font, fontSize: 18, color: C.slate } }),
    ]));
}

const p = Presentation.create({ slideSize: { width: W, height: H } });

// 1 Cover
addSlide(p,
  grid({ name: "cover-root", width: fill, height: fill, columns: [fixed(610), fr(1)], columnGap: 0 }, [
    panel({ width: fill, height: fill, fill: C.navy, stroke: "transparent", padding: { x: 82, y: 92 } },
      column({ width: fill, height: fill, gap: 22 }, [
        text("SYNITI -> SAP S/4HANA", { name: "cover-kicker", width: fill, height: hug, style: { font, fontSize: 19, bold: true, color: "#BDE8E9" } }),
        text("Final load architecture", { name: "cover-title", width: fill, height: hug, style: { font, fontSize: 64, bold: true, color: C.white } }),
        text("Why a SAP HANA ODBC connection matters, and how to secure it.", { name: "cover-subtitle", width: fill, height: hug, style: { font, fontSize: 25, color: "#DCE7EF" } }),
        rule({ width: fixed(210), stroke: C.lime, weight: 6 }),
        text("Prepared from Syniti product documentation\n27 April 2026", { name: "cover-date", width: fill, height: hug, style: { font, fontSize: 16, color: "#B5C6D4" } }),
      ])),
    panel({ width: fill, height: fill, fill: C.cloud, stroke: "transparent", padding: { x: 72, y: 112 } },
      column({ name: "cover-diagram", width: fill, height: fill, gap: 28 }, [
        row({ width: fill, height: fixed(150), gap: 20 }, [
          box("Legacy sources", "ERP, files, databases, extracts", "#FFFFFF", "#DDE5EA"),
          arrowRight(C.quiet),
          box("Syniti Migrate", "Cleanse, map, validate, govern", "#FFFFFF", "#DDE5EA"),
          arrowRight(C.quiet),
          box("Working DB", "SQL Server, PostgreSQL, or HANA", "#FFFFFF", "#DDE5EA"),
        ]),
        row({ width: fill, height: fixed(150), gap: 20 }, [
          box("SAP Data Services / Replicate", "Generated jobs and target load execution", "#EAF7F7", "#9FD1D4"),
          arrowRight(C.teal),
          box("SAP HANA staging", "Migration Cockpit tables", "#E7F2FE", "#99C6EE"),
          arrowRight(C.sap),
          box("S/4HANA", "Business-object load through Migration Cockpit", "#E7F2FE", "#99C6EE"),
        ]),
        panel({ width: fill, height: fixed(136), borderRadius: 8, fill: "#FFF8EA", stroke: "#F1D493", padding: { x: 28, y: 20 } },
          text("The HANA connection is the controlled data bridge into staging, not a shortcut around SAP application validation.", { width: fill, height: hug, style: { font, fontSize: 30, bold: true, color: C.ink } })),
      ])),
  ]), "cover");

// 2 Executive answer
addSlide(p, bg([
  column({ x: 88, y: 70, width: fixed(1700), height: fixed(930), gap: 42 }, [
    titleBlock("Executive answer", "The ODBC discussion is about throughput, staging ownership, and risk control.", C.teal),
    grid({ width: fill, height: fixed(555), columns: [fr(1), fr(1), fr(1)], columnGap: 30 }, [
      box("Why it is needed", "Syniti must write the final converted rows into the HANA staging database used by SAP Migration Cockpit. ODBC is one supported HANA provider and unlocks Replicate bulk insert modes such as ArrayBinding and, on-premises only, FTP.", "#FFFFFF", "#D4DEE6"),
      box("What it does not do", "It does not load directly into S/4HANA application tables. The final business-object transfer remains SAP-controlled through LTMC / Migrate Your Data.", "#FFFFFF", "#D4DEE6"),
      box("How to secure it", "Use TLS/SSL, a dedicated technical user with schema-scoped privileges, private network paths, certificate hygiene, credential controls, and cutover audit evidence.", "#FFFFFF", "#D4DEE6"),
    ]),
    panel({ width: fill, height: fixed(130), borderRadius: 8, fill: C.navy, stroke: C.navy, padding: { x: 34, y: 24 } },
      text("Recommendation: approve HANA ODBC for final-load staging only when it is limited to the Migration Cockpit schema and protected as a production data path.", { width: fill, height: hug, style: { font, fontSize: 32, bold: true, color: C.white } })),
    footer(),
  ]),
]));

// 3 Process overview
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 34 }, [
    titleBlock("Final-load process into SAP S/4HANA", "Syniti prepares the data; HANA staging receives it; SAP Migration Cockpit performs the business load.", C.sap),
    row({ width: fill, height: fixed(210), gap: 18 }, [
      box("1. Extract & scope", "Metadata and in-scope records from one or many legacy systems", C.white),
      arrowRight(),
      box("2. Transform & validate", "Rules, mappings, value mapping, readiness reports in Syniti Migrate", C.white),
      arrowRight(),
      box("3. Generate jobs", "Dataset XML creates Data Services flows and LTMC staging export steps", C.white),
    ]),
    row({ width: fill, height: fixed(210), gap: 18 }, [
      box("4. Load HANA staging", "Rows move from conversion database to Migration Cockpit HANA tables", "#EAF7F7", "#9FD1D4"),
      arrowRight(C.sap),
      box("5. Transfer in SAP", "Migration Cockpit validates and posts to S/4HANA business objects", "#E7F2FE", "#99C6EE"),
      arrowRight(C.sap),
      box("6. Reconcile", "Stage Ready, Target Ready, postload and delta reporting close the loop", C.white),
    ]),
    panel({ width: fill, height: fixed(112), borderRadius: 8, fill: "#EEF4F7", stroke: "#D9E3EA", padding: { x: 28, y: 18 } },
      text("Syniti documentation: Migration Cockpit creates staging tables per object; Syniti/Data Services fills those tables; SAP completes the transfer into S/4HANA.", { width: fill, height: hug, style: { font, fontSize: 25, bold: true, color: C.ink } })),
    footer(),
  ]),
]));

// 4 Mechanics
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 28 }, [
    titleBlock("What actually happens during final load", "The handoff is table-based until SAP takes over.", C.teal),
    grid({ width: fill, height: fixed(675), columns: [fr(0.9), fr(1.1)], columnGap: 58 }, [
      column({ width: fill, height: fill, gap: 22 }, [
        step(1, "Project chooses S/4HANA target", "The dataset uses LTMC Staging so generated XML includes staging export steps."),
        step(2, "xAppLTMC is available", "A Data Services datastore points to the HANA DB/schema where Migration Cockpit staging tables exist."),
        step(3, "Export job writes template tables", "Data Services transfers target rows from the conversion database into HANA staging/template tables."),
        step(4, "SAP Migration Cockpit transfers", "SAP runs Transfer Data, validates, and posts records into S/4HANA."),
      ]),
      panel({ width: fill, height: fill, borderRadius: 8, fill: C.white, stroke: "#D4DEE6", padding: { x: 34, y: 34 } },
        column({ width: fill, height: fill, gap: 24 }, [
          text("Load control points", { width: fill, height: hug, style: { font, fontSize: 34, bold: true, color: C.ink } }),
          grid({ width: fill, height: fixed(430), columns: [fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 18, rowGap: 18 }, [
            box("Cutover freeze", "Source extract/version aligned to load wave", "#F7FAFC"),
            box("Data Ready", "Critical errors resolved before HANA staging", "#F7FAFC"),
            box("SAP validation", "Cockpit checks object rules and dependencies", "#F7FAFC"),
            box("Postload proof", "Counts, rejects, deltas and target readiness", "#F7FAFC"),
          ]),
          text("The HANA connection carries already-mapped target data into a SAP-owned staging interface.", { width: fill, height: hug, style: { font, fontSize: 28, bold: true, color: C.tealDark } }),
        ])),
    ]),
    footer(),
  ]),
]));

// 5 Why ODBC
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 30 }, [
    titleBlock("Why a SAP HANA ODBC connection is required in this pattern", "For the final-load bridge, it gives Syniti components a supported, high-throughput SQL route into HANA staging.", C.hana),
    grid({ width: fill, height: fixed(620), columns: [fr(1.1), fr(0.9)], columnGap: 44 }, [
      column({ width: fill, height: fill, gap: 18 }, [
        step(1, "Driver contract", "SAP HANA Client 2.22+ provides the SAP HANA ODBC driver used by Replicate or ETL components on the server."),
        step(2, "Bulk load path", "Syniti Replicate documents ODBC bulk insert modes: ArrayBinding for multi-row calls and FTP for on-premises HANA only."),
        step(3, "Staging database access", "Migration Cockpit’s database option expects third-party tools to write directly to the remote HANA staging database."),
        step(4, "Operational tuning", "ODBC connection properties support host/port, schema, pooling, timeout, and extended HANA properties."),
      ]),
      panel({ width: fill, height: fill, borderRadius: 8, fill: C.navy, stroke: C.navy, padding: { x: 36, y: 34 } },
        column({ width: fill, height: fill, gap: 18 }, [
          text("Important nuance", { width: fill, height: hug, style: { font, fontSize: 34, bold: true, color: C.white } }),
          text("Syniti also supports a HANA .NET provider, and the HANA page lists it as recommended. ODBC becomes the required design choice when the chosen final-load tooling, driver standard, or bulk-insert requirement is based on the SAP HANA ODBC Driver.", { width: fill, height: hug, style: { font, fontSize: 25, color: "#D8E8F2" } }),
          rule({ width: fill, stroke: "#496B84", weight: 2 }),
          text("Architectural principle: make the provider choice explicit in the cutover design, then secure and monitor it like any other production integration.", { width: fill, height: hug, style: { font, fontSize: 25, bold: true, color: "#BDE8E9" } }),
        ])),
    ]),
    footer(),
  ]),
]));

// 6 ODBC vs .NET
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 30 }, [
    titleBlock("ODBC and .NET are provider choices; the final-load contract is HANA staging", "Use the connection type that matches the Syniti component and performance/security requirement.", C.teal),
    grid({ width: fill, height: fixed(610), columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
      panel({ width: fill, height: fill, borderRadius: 8, fill: C.white, stroke: "#D4DEE6", padding: { x: 28, y: 28 } },
        column({ width: fill, height: fill, gap: 18 }, [
          pill("SAP HANA ODBC", C.hana, true),
          text("Best fit", { width: fill, height: hug, style: { font, fontSize: 25, bold: true, color: C.ink } }),
          text("High-volume refresh / target inserts where the Replicate HANA target uses ODBC bulk insert or where enterprise standards require ODBC DSNs/drivers.", { width: fill, height: hug, style: { font, fontSize: 22, color: C.slate } }),
          text("Security focus: TLS, DSN hardening, technical-user privilege scope, block-size governance.", { width: fill, height: hug, style: { font, fontSize: 21, bold: true, color: C.tealDark } }),
        ])),
      panel({ width: fill, height: fill, borderRadius: 8, fill: C.white, stroke: "#D4DEE6", padding: { x: 28, y: 28 } },
        column({ width: fill, height: fill, gap: 18 }, [
          pill("SAP HANA .NET", C.sap, true),
          text("Best fit", { width: fill, height: hug, style: { font, fontSize: 25, bold: true, color: C.ink } }),
          text("Replicate configurations where the .NET provider is selected and native provider behavior is sufficient for refresh loads.", { width: fill, height: hug, style: { font, fontSize: 22, color: C.slate } }),
          text("Security focus: same TLS and privilege controls; avoid password persistence in connection objects.", { width: fill, height: hug, style: { font, fontSize: 21, bold: true, color: C.sap } }),
        ])),
      panel({ width: fill, height: fill, borderRadius: 8, fill: "#FFF8EA", stroke: "#F1D493", padding: { x: 28, y: 28 } },
        column({ width: fill, height: fill, gap: 18 }, [
          pill("Decision rule", C.amber, true),
          text("Do not debate the driver in isolation.", { width: fill, height: hug, style: { font, fontSize: 28, bold: true, color: C.ink } }),
          text("Confirm the load channel, supported component version, SAP HANA target type, expected row volume, network path, and Basis security requirements. Then document the accepted provider and controls in the runbook.", { width: fill, height: hug, style: { font, fontSize: 22, color: C.slate } }),
        ])),
    ]),
    footer(),
  ]),
]));

// 7 Security architecture diagram
addSlide(p, bg([
  column({ width: fixed(1760), height: fixed(960), gap: 24 }, [
    titleBlock("Security architecture for the HANA staging bridge", "Separate data movement, control plane, and SAP application load responsibilities.", C.red),
    row({ width: fill, height: fixed(520), gap: 22 }, [
      box("Migration build zone", "Syniti Migrate\nWorking DB\nData Services / Replicate", "#FFFFFF", "#D4DEE6"),
      arrowRight(C.red),
      box("SAP HANA staging zone", "ODBC/.NET over TLS\nSchema-scoped technical user\nMigration Cockpit staging tables", "#F1FAFA", "#9FD1D4"),
      arrowRight(C.red),
      box("SAP application zone", "Migration Cockpit\nTransfer Data\nS/4HANA business objects", "#EFF7FF", "#99C6EE"),
    ]),
    panel({ width: fill, height: fixed(128), borderRadius: 8, fill: "#FFF4F4", stroke: "#E9C4C4", padding: { x: 28, y: 22 } },
      column({ width: fill, height: hug, gap: 8 }, [
        text("Controls: private route / firewall allowlist / certificate trust / no broad schema grants", { width: fill, height: hug, style: { font, fontSize: 26, bold: true, color: C.ink } }),
        text("Data-path risk is credentials and data in transit. Application-path risk is bypassing SAP posting logic, so final transfer stays in Migration Cockpit.", { width: fill, height: hug, style: { font, fontSize: 20, color: C.slate } }),
      ])),
    footer("Security basis: Syniti HANA SSL guidance; Replicate client/server authentication guidance; SAP SNC for RFC paths when applicable."),
  ]),
]));

// 8 Controls
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 30 }, [
    titleBlock("Security issues and mitigations", "The ODBC connection can be approved when every major risk has an owner and a compensating control.", C.red),
    grid({ width: fill, height: fixed(650), columns: [fr(1), fr(1)], rows: [fr(1), fr(1), fr(1)], columnGap: 24, rowGap: 18 }, [
      box("Credential exposure", "Dedicated technical user, password rotation/vaulting, no shared personal accounts, Persist Security Info = false.", C.white),
      box("Unencrypted transit", "Enable SAP HANA SSL/TLS; use CA-signed certificates for production; maintain HANA PSE/trust chain.", C.white),
      box("Excessive database privilege", "CONNECT plus only required schema/table operations for staging. Avoid catalog-wide or application-table privileges.", C.white),
      box("Network overexposure", "Private connectivity, VPN/peering, firewall allowlist to HANA host/port, no public inbound administration route.", C.white),
      box("Bulk-load side effects", "Approve block size, batch commit behavior, and restart strategy; avoid FTP unless on-premises and explicitly secured.", C.white),
      box("Weak auditability", "Log connection use, job runs, row counts, rejects, SAP transfer outcomes, and sign-offs for each cutover wave.", C.white),
    ]),
    footer(),
  ]),
]));

// 9 Runbook
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 30 }, [
    titleBlock("Cutover runbook for final data load", "A controlled load sequence keeps the HANA bridge useful without letting it become an uncontrolled back door.", C.teal),
    grid({ width: fill, height: fixed(650), columns: [fr(1), fr(1), fr(1), fr(1), fr(1)], columnGap: 18 }, [
      runbookCard(1, "Prepare", "Confirm object scope, dependencies, HANA schema, staging tables, certificates and credentials.", C.navy),
      runbookCard(2, "Freeze", "Take approved source snapshot; run validations; lock mapping changes except emergency defects.", C.navy),
      runbookCard(3, "Load staging", "Run export into HANA staging using the approved provider and batch settings.", C.teal),
      runbookCard(4, "Transfer", "Run Migration Cockpit Transfer Data, resolve rejects, and rerun agreed object slices.", C.sap),
      runbookCard(5, "Reconcile", "Compare source, staging, SAP counts; retain postload reports and security logs.", C.lime),
    ]),
    panel({ width: fill, height: fixed(130), borderRadius: 8, fill: "#EAF7F7", stroke: "#9FD1D4", padding: { x: 30, y: 22 } },
      text("Cutover success criteria: every loaded object has an approved source snapshot, a HANA staging load record, a SAP transfer outcome, and a reconciliation result.", { width: fill, height: hug, style: { font, fontSize: 30, bold: true, color: C.ink } })),
    footer(),
  ]),
]));

// 10 Decision checklist
addSlide(p, bg([
  column({ x: 80, y: 62, width: fixed(1760), height: fixed(960), gap: 30 }, [
    titleBlock("Decision checklist", "Approve the HANA ODBC connection when these conditions are demonstrably true.", C.teal),
    grid({ width: fill, height: fixed(690), columns: [fr(0.95), fr(1.05)], columnGap: 52 }, [
      column({ width: fill, height: fill, gap: 24 }, [
        step(1, "The load mechanism is explicit", "Migration Cockpit staging database/table load, not direct application-table manipulation."),
        step(2, "The provider choice is justified", "ODBC is required by the chosen component, bulk-insert mode, or enterprise driver standard."),
        step(3, "The account is constrained", "Schema-scoped technical user with only the operations required for staging load and cleanup."),
        step(4, "The path is encrypted and private", "TLS certificates are trusted and network access is restricted to the load servers."),
      ]),
      panel({ width: fill, height: fill, borderRadius: 8, fill: C.navy, stroke: C.navy, padding: { x: 38, y: 36 } },
        column({ width: fill, height: fill, gap: 22 }, [
          text("Bottom line", { width: fill, height: hug, style: { font, fontSize: 38, bold: true, color: C.white } }),
          text("A SAP HANA ODBC connection is defensible because it is a high-volume staging interface into the SAP migration process. It is not defensible if it becomes a broad, reusable database account outside the migration runbook.", { width: fill, height: hug, style: { font, fontSize: 30, color: "#D8E8F2" } }),
          rule({ width: fill, stroke: "#496B84", weight: 2 }),
          text("Control objective: least-privilege, encrypted, observable, temporary where possible, and owned jointly by Data Migration, SAP Basis, Security, and Infrastructure.", { width: fill, height: hug, style: { font, fontSize: 27, bold: true, color: "#BDE8E9" } }),
        ])),
    ]),
    footer(),
  ]),
]));

const pptx = await PresentationFile.exportPptx(p);
await pptx.save(path.join(OUT, "syniti-s4hana-final-load.pptx"));

console.log(JSON.stringify({
  ok: true,
  pptx: path.join(OUT, "syniti-s4hana-final-load.pptx"),
  slides: p.slides.items.length,
}, null, 2));
