/**
 * P365 Access Add-in — Database Plug-in
 *
 * Provides a Microsoft Access database back-end for storing job histories,
 * pipe inventories, well data, and customer records that feed into the
 * Excel P365 calculations.
 *
 * Planned Features:
 *   - Jobs database: project ID, client, location, date, assigned engineer
 *   - Pipe inventory: NPS, material, schedule, stock quantity, supplier
 *   - Well data repository: well name, UWI, formation, depth, completion
 *   - Customer / operator record: contact info, active jobs, audit trail
 *   - P365 calculation snapshot storage: save/recall named calculation sets
 *   - Reports: job history by date/engineer, inventory low-stock alerts
 *
 * Implementation Plan:
 *   1. Access VSTO/COM add-in (C# .NET Framework 4.8) — primary
 *      OR Access Web App (SharePoint + Power Apps) — cloud-friendly alternative
 *   2. Table schema design (see schema definitions below)
 *   3. Forms: Job Entry, Pipe Inventory, Well Data Entry
 *   4. Reports: Job History, Inventory Status, Well Performance Summary
 *   5. Integration bridge: VBA/COM automation to push data into Excel
 *      for P365 calculations, or via Power Automate flow
 *   6. Optional: REST API via Azure Functions to serve data to the web calculator
 *
 * Database Schema (Microsoft Access .accdb):
 *   See TABLE_SCHEMAS below.
 *
 * Architecture:
 *   src/addins/access/
 *     schema.ts          — Table schema definitions (for documentation)
 *     queries.ts         — Standard query definitions
 *     reports.ts         — Report layout definitions
 *     integration.ts     — Excel ↔ Access data bridge (COM automation)
 */

// ─── Database Table Schemas ───────────────────────────────────────────────────

/** Access database table field type. */
export type AccessFieldType =
  | "AutoNumber"
  | "Text"
  | "Number"
  | "Currency"
  | "Date/Time"
  | "Yes/No"
  | "Memo"
  | "OLE Object"
  | "Lookup"
  | "Attachment";

/** Represents one field in an Access table. */
export interface AccessField {
  name:       string;
  type:       AccessFieldType;
  required:   boolean;
  primaryKey?: boolean;
  foreignKey?: string;   // "TableName.FieldName"
  maxLength?:  number;
  defaultVal?: string;
  description: string;
}

/** Represents an Access table schema. */
export interface AccessTable {
  name:        string;
  description: string;
  fields:      AccessField[];
}

/** P365 Access database table schemas. */
export const TABLE_SCHEMAS: AccessTable[] = [
  {
    name:        "tblJobs",
    description: "Engineering jobs / projects",
    fields: [
      { name: "JobID",       type: "AutoNumber", required: true,  primaryKey: true, description: "Unique job identifier" },
      { name: "JobNumber",   type: "Text",       required: true,  maxLength: 20,     description: "Human-readable job number (e.g., J-2025-001)" },
      { name: "ProjectName", type: "Text",       required: true,  maxLength: 100,    description: "Project or job description" },
      { name: "ClientID",    type: "Number",     required: true,  foreignKey: "tblClients.ClientID", description: "FK to client" },
      { name: "Engineer",    type: "Text",       required: true,  maxLength: 50,     description: "Responsible engineer" },
      { name: "DateCreated", type: "Date/Time",  required: true,  defaultVal: "Now()", description: "Job creation date" },
      { name: "DateDue",     type: "Date/Time",  required: false, description: "Project due date" },
      { name: "Status",      type: "Text",       required: true,  maxLength: 20,     defaultVal: "Active",  description: "Active/Complete/On Hold/Cancelled" },
      { name: "Notes",       type: "Memo",       required: false, description: "Free-text notes" },
    ],
  },
  {
    name:        "tblClients",
    description: "Operators and client organizations",
    fields: [
      { name: "ClientID",    type: "AutoNumber", required: true,  primaryKey: true, description: "Unique client ID" },
      { name: "CompanyName", type: "Text",       required: true,  maxLength: 100,   description: "Company or operator name" },
      { name: "ContactName", type: "Text",       required: false, maxLength: 80,    description: "Primary contact person" },
      { name: "Phone",       type: "Text",       required: false, maxLength: 20,    description: "Contact phone" },
      { name: "Email",       type: "Text",       required: false, maxLength: 80,    description: "Contact email" },
      { name: "Address",     type: "Memo",       required: false, description: "Mailing address" },
      { name: "State",       type: "Text",       required: false, maxLength: 2,     description: "State / Province abbreviation" },
      { name: "Active",      type: "Yes/No",     required: true,  defaultVal: "Yes", description: "Is this client currently active?" },
    ],
  },
  {
    name:        "tblWells",
    description: "Well / location master data",
    fields: [
      { name: "WellID",      type: "AutoNumber", required: true,  primaryKey: true, description: "Unique well ID" },
      { name: "WellName",    type: "Text",       required: true,  maxLength: 60,    description: "Well name or API number" },
      { name: "UWI",         type: "Text",       required: false, maxLength: 30,    description: "Unique well identifier (UWI / API number)" },
      { name: "OperatorID",  type: "Number",     required: false, foreignKey: "tblClients.ClientID", description: "FK to operator" },
      { name: "Formation",   type: "Text",       required: false, maxLength: 60,    description: "Producing formation name" },
      { name: "TVD_ft",      type: "Number",     required: false, description: "True vertical depth (ft)" },
      { name: "Lat",         type: "Number",     required: false, description: "Latitude (decimal degrees)" },
      { name: "Lon",         type: "Number",     required: false, description: "Longitude (decimal degrees)" },
      { name: "State",       type: "Text",       required: false, maxLength: 2,     description: "State / Province" },
      { name: "Status",      type: "Text",       required: true,  maxLength: 20, defaultVal: "Active", description: "Active/Inactive/P&A/Injector" },
    ],
  },
  {
    name:        "tblPipeInventory",
    description: "Pipe stock inventory",
    fields: [
      { name: "ItemID",      type: "AutoNumber", required: true,  primaryKey: true, description: "Inventory item ID" },
      { name: "NPS_in",      type: "Text",       required: true,  maxLength: 6,     description: "Nominal pipe size (in): 0.5, 0.75, 1, ... 6" },
      { name: "Material",    type: "Text",       required: true,  maxLength: 20,    description: "bare-steel / coated-steel / PE" },
      { name: "Schedule",    type: "Text",       required: false, maxLength: 10,    description: "Pipe schedule (e.g., 40, 80, SDR-11)" },
      { name: "OD_in",       type: "Number",     required: false, description: "Outside diameter (in)" },
      { name: "ID_in",       type: "Number",     required: false, description: "Inside diameter (in)" },
      { name: "WallThk_in",  type: "Number",     required: false, description: "Wall thickness (in)" },
      { name: "Supplier",    type: "Text",       required: false, maxLength: 80,    description: "Supplier name" },
      { name: "PartNumber",  type: "Text",       required: false, maxLength: 40,    description: "Supplier part number" },
      { name: "StockFt",     type: "Number",     required: true,  defaultVal: "0",  description: "Stock on hand (linear feet)" },
      { name: "MinStock_ft", type: "Number",     required: false, defaultVal: "50", description: "Minimum stock level (linear feet) before reorder alert" },
      { name: "CostPerFt",   type: "Currency",   required: false, description: "Cost per linear foot (USD)" },
    ],
  },
  {
    name:        "tblCalcSnapshots",
    description: "Saved P365 calculation sets",
    fields: [
      { name: "SnapID",      type: "AutoNumber", required: true,  primaryKey: true, description: "Snapshot ID" },
      { name: "JobID",       type: "Number",     required: false, foreignKey: "tblJobs.JobID", description: "Associated job" },
      { name: "CalcType",    type: "Text",       required: true,  maxLength: 30,    description: "pipe-sizing / nodal / dca / pvt / pta ..." },
      { name: "Name",        type: "Text",       required: true,  maxLength: 80,    description: "Descriptive name for this calculation" },
      { name: "DateSaved",   type: "Date/Time",  required: true,  defaultVal: "Now()", description: "Timestamp when saved" },
      { name: "Engineer",    type: "Text",       required: false, maxLength: 50,    description: "Engineer who saved this snapshot" },
      { name: "InputsJSON",  type: "Memo",       required: false, description: "JSON blob of input parameters" },
      { name: "ResultsJSON", type: "Memo",       required: false, description: "JSON blob of calculation results" },
      { name: "Notes",       type: "Memo",       required: false, description: "Engineer notes for this calculation" },
    ],
  },
];

// ─── Standard Queries ─────────────────────────────────────────────────────────

/** Standard Access query definitions (SQL strings for .accdb). */
export const STANDARD_QUERIES: Record<string, string> = {
  "qryActiveJobs": `
    SELECT J.JobNumber, J.ProjectName, C.CompanyName, J.Engineer, J.DateCreated, J.DateDue
    FROM tblJobs J
    LEFT JOIN tblClients C ON J.ClientID = C.ClientID
    WHERE J.Status = 'Active'
    ORDER BY J.DateDue;
  `.trim(),

  "qryLowPipeStock": `
    SELECT NPS_in, Material, Schedule, StockFt, MinStock_ft, Supplier
    FROM tblPipeInventory
    WHERE StockFt < MinStock_ft
    ORDER BY NPS_in, Material;
  `.trim(),

  "qryWellsByClient": `
    SELECT W.WellName, W.UWI, W.Formation, W.TVD_ft, W.Status, C.CompanyName
    FROM tblWells W
    LEFT JOIN tblClients C ON W.OperatorID = C.ClientID
    ORDER BY C.CompanyName, W.WellName;
  `.trim(),

  "qryCalcSnapshotsByJob": `
    SELECT S.Name, S.CalcType, S.DateSaved, S.Engineer, J.JobNumber
    FROM tblCalcSnapshots S
    LEFT JOIN tblJobs J ON S.JobID = J.JobID
    ORDER BY S.DateSaved DESC;
  `.trim(),
};

// ─── Integration Bridge (Excel ↔ Access) ─────────────────────────────────────

/**
 * Describes the data bridge between P365 Excel calculations and the
 * Access database (for documentation / planning purposes).
 *
 * Actual integration uses one of:
 *   a) VBA macro in Excel: ADODB connection to .accdb
 *   b) Power Automate flow: Excel → Dataverse (Access replacement in cloud)
 *   c) REST API: Azure Functions → Azure SQL (Access data migrated to cloud)
 */
export const INTEGRATION_OPTIONS = [
  {
    method:      "VBA ADODB",
    description: "Excel VBA connects to Access via ADODB, reads/writes tblCalcSnapshots",
    pros:        ["No internet required", "Works fully offline", "Fast"],
    cons:        ["Windows only", "Requires .accdb on shared drive"],
  },
  {
    method:      "Power Automate",
    description: "Save button in Excel triggers a Power Automate flow that writes to Dataverse",
    pros:        ["Cloud storage", "Cross-platform", "Teams integration"],
    cons:        ["Requires M365 license", "Internet required"],
  },
  {
    method:      "Azure Functions REST API",
    description: "P365 web calculator POSTs to an Azure Function that writes to Azure SQL",
    pros:        ["Fully cloud-native", "Teams and web both work", "Scalable"],
    cons:        ["Requires Azure subscription", "Development effort"],
  },
] as const;
