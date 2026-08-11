# NDIS Invoice Management System

A simplified NDIS invoicing platform developed for the Witty Data technical assessment.

The application manages NDIS participants, providers, rate sets, NDIS Support Catalogue Excel imports, and invoice processing.

The implementation focuses primarily on the assessment's Primary Requirements, with emphasis on:

- Correct business logic
- Server-side validation
- Data consistency
- Maintainable application structure
- Functional and usable frontend components

---

## Implemented Features

### Participant Management

The system supports:

- Create participants
- Edit participants
- View participant details
- List active participants
- Soft delete participants
- Participant validation
- NDIS pricing region selection

Participant validation includes:

- First name required and cannot contain only whitespace
- Last name required and cannot contain only whitespace
- Gender required
- Date of birth required
- NDIS number required
- NDIS number digits only
- NDIS number maximum 16 digits
- Valid email address required
- Phone number optional
- Phone number must contain 3 to 16 digits when provided
- Address required and cannot contain only whitespace
- Unit / Building optional but cannot contain only whitespace when provided
- Pricing region required

---

### Provider Management

The system supports:

- Create providers
- Edit providers
- View provider details
- List active providers
- Soft delete providers

Provider validation includes:

- ABN required
- ABN digits only
- ABN maximum 11 digits
- Provider name required and cannot contain only whitespace
- Valid email address required
- Phone number optional
- Phone number must contain 3 to 16 digits when provided
- Address required and cannot contain only whitespace
- Unit / Building optional but cannot contain only whitespace when provided

---

### Rate Set Management

The system supports:

- Create rate sets
- Edit rate sets
- View rate set details
- List active rate sets
- Soft delete rate sets
- Validate start and end dates
- Import NDIS Support Catalogue Excel files

Rate set validation includes:

- Name required
- Start date required
- End date must be on or after the start date
- End date may be open-ended

---

### NDIS Excel Import

The application imports NDIS Support Catalogue Excel files into the PostgreSQL database.

The importer supports:

- Processing all worksheets
- Category import
- Support item import
- Support item attribute import
- Pricing region mapping
- Price import
- Multiple pricing regions
- Null pricing values where applicable

The importer is designed to be idempotent.

Re-importing the same catalogue does not create duplicate business records.

Import behaviour includes:

- Business-key based matching
- Field-level change detection
- New record insertion
- Existing record updates
- Missing record deactivation or soft deletion where applicable
- Reappearance of previously deactivated records
- Database transaction protection

The import process is performed inside a database transaction so that a failed import does not leave the catalogue partially updated.

---

## Invoice Management

The system supports:

- Create invoices
- Create invoice items
- Edit invoices and invoice items
- View invoice details
- List active invoices
- Soft delete invoices
- Draft invoices
- Completed invoices
- Server-side invoice calculations
- NDIS rate validation

---

## Invoice Status

Two invoice statuses are supported.

### Draft

Draft invoices allow incomplete or invalid invoice item information to be stored.

A draft must still contain:

- Invoice number
- Invoice date
- Expected amount

Valid values entered by the user are preserved when saving a draft.

Full invoice validation is not enforced until the invoice is completed.

### Completed

A completed invoice must pass all invoice and invoice-item validation rules.

The system prevents completion when required data is missing or invalid.

---

## Invoice Validation

Completed invoices require:

- Participant
- Provider
- Invoice number
- Invoice date
- Expected amount
- At least one invoice item

Invoice numbers are unique per provider.

The backend is the source of truth for invoice validation.

Frontend validation is used to improve usability, but the API independently validates all important business rules.

---

## Invoice Item Validation

Each completed invoice item requires:

- Rate Set
- Category
- Support Item
- Start Date
- End Date
- Quantity / Units
- Input Rate
- Derived Maximum Rate

The system validates that:

- The selected rate set overlaps the invoice item's service date range
- Exactly one applicable rate set matches the service dates
- The selected support item belongs to the selected category and rate set
- Start date is valid
- End date is valid
- End date is not before start date
- Quantity is valid
- Input rate is valid
- An applicable NDIS price can be found

---

## NDIS Rate Matching

For completed invoices, the backend derives the maximum NDIS rate using:

- Rate Set
- Support Item
- Invoice item Start Date
- Invoice item End Date
- Participant Pricing Region

When multiple matching price records exist, the application ranks them by:

1. Latest price start date
2. Latest finite price end date
3. Highest price record ID

If no matching price can be found, the invoice cannot be completed and the user is shown an invoice-item validation error.

The Maximum Rate is derived by the server and is not manually entered by the user.

---

## Amount Calculation

Invoice item amount is calculated as:

```text
Amount = Quantity / Units × Input Rate
```

Invoice totals are calculated by the backend.

```text
Invoice Amount = Sum of Invoice Item Amounts
```

The Expected Amount must equal the server-calculated Invoice Amount before an invoice can be completed.

All monetary amounts are stored and calculated using decimal arithmetic and rounded to two decimal places.

`bignumber.js` is used for monetary calculation instead of JavaScript floating-point arithmetic.

---

## Date Handling

Invoice service dates represent calendar dates rather than local-time timestamps.

The backend stores:

- Start Date at the start of the selected UTC day
- End Date at the end of the selected UTC day

The frontend displays only the calendar-date portion of stored service dates to prevent timezone conversion from changing the displayed date.

---

## Soft Delete Strategy

Application records are not permanently removed through normal delete operations.

Soft deletion is used so historical relationships remain intact.

Deleted records are excluded from normal application queries.

Soft deletion is implemented for relevant entities including:

- Participants
- Providers
- Rate Sets
- Invoices
- Invoice Items
- Imported pricing records where applicable

This allows historical invoices and imported catalogue relationships to remain traceable.

---

# Technology Stack

The application uses:

- Node.js 24.18.0
- Next.js 16.2.10
- React
- TypeScript
- PostgreSQL 17
- Kysely
- Ant Design
- Tailwind CSS
- BigNumber.js
- SheetJS / xlsx
- Docker
- Docker Compose
- MinIO

MinIO is configured as part of the project infrastructure for the assessment's extended document-processing requirements.

AI-based PDF invoice extraction is considered an extended requirement and is not required for the completed primary invoice workflow described above.

---

# Application Architecture

The application uses the Next.js App Router.

The frontend and API are contained within the same Next.js application.

A simplified request flow is:

```text
Browser
   |
   v
Next.js UI
   |
   v
Next.js API Routes
   |
   v
Business Validation / Import Logic
   |
   v
Kysely
   |
   v
PostgreSQL
```

The API layer is responsible for enforcing business rules.

This is intentional because frontend validation can be bypassed by clients calling the API directly.

Important business rules such as invoice calculations, NDIS price lookup, catalogue imports, and completion validation therefore remain server-side.

---

# Database

PostgreSQL is used as the relational database.

Core tables include:

```text
client
provider
invoice
invoice_item

rate_set
rate_set_category
rate_set_support_item
rate_set_support_item_attribute
rate_set_support_item_price

gender
pricing_region
```

The supplied database schema was used as the basis for the application's database implementation.

Additional migrations are used where required without modifying previously applied migrations.

---

# Data Consistency

Several strategies are used to protect data consistency.

### Database Transactions

Multi-table operations such as:

- NDIS catalogue import
- Invoice creation
- Invoice update

use database transactions.

If one part of the operation fails, the entire transaction is rolled back.

### Server-Derived Values

The frontend does not control authoritative values such as:

- Invoice total
- Invoice item amount
- Maximum NDIS rate

These values are calculated or validated by the backend.

### Database Constraints

Database constraints and indexes are used together with application validation for data such as:

- Invoice number uniqueness per provider
- Foreign-key relationships
- Rate-set relationships
- Imported catalogue business keys

---

# Validation Error Handling

Backend validation errors are returned to the frontend and displayed next to the corresponding form fields.

Nested invoice item errors such as:

```text
items.0.rate_set_id
items.0.category_id
items.0.support_item_id
items.0.start_date
items.0.end_date
items.0.unit
items.0.input_rate
```

are mapped to the corresponding invoice item form controls.

Errors relating to server-derived values such as:

```text
items.0.max_rate
```

are displayed as invoice-item alerts because Maximum Rate is not an editable form field.

General validation failures display:

```text
Please correct the highlighted fields below.
```

Specific server errors, such as duplicate invoice numbers, retain their specific error message.

---

# Getting Started

## Prerequisites

Install the following before running the project:

- Node.js 24.18.0
- npm
- Docker Desktop
- Docker Compose

---

## 1. Install Dependencies

From the project directory:

```bash
npm install
```

---

## 2. Configure Environment Variables

Create:

```text
.env.local
```

in the project root.

Example configuration:

```env
DATABASE_URL=postgresql://ndis:ndis_password@localhost:5432/ndis

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=documents
MINIO_USE_SSL=false

OPENAI_API_KEY=your_openai_key_here
```

Do not commit real API keys or credentials to source control.

The `.env.local` file is excluded from Git through the project's environment-file ignore rules.

---

## 3. Start PostgreSQL and MinIO

Start the Docker services:

```bash
docker compose up -d
```

Local services are available at:

```text
PostgreSQL
localhost:5432

MinIO API
localhost:9000

MinIO Console
localhost:9001
```

---

## 4. Verify Docker Services

You can verify the containers with:

```bash
docker compose ps
```

The PostgreSQL and MinIO containers should be running.

---

## 5. Run Database Migrations

After PostgreSQL is running, apply the database migrations:

```bash
npm run db:migrate
```

This creates and updates the required database schema and applies the project seed data and reference data through the migration system.

## 6. Start the Application

Run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Production Build

To verify that the application successfully compiles for production:

```bash
npm run build
```

The application has been developed with production builds checked throughout implementation to detect TypeScript, Next.js, and prerendering issues.

---

# Main Application Pages

The application provides the following pages:

```text
/
```

Application dashboard.

```text
/participants
```

Participant management.

```text
/providers
```

Provider management.

```text
/rate-sets
```

Rate Set management and NDIS Excel import.

```text
/invoices
```

Invoice and invoice-item management.

---

# API Overview

Primary API routes include:

```text
GET    /api/participants
POST   /api/participants

GET    /api/participants/:id
PUT    /api/participants/:id
DELETE /api/participants/:id

GET    /api/providers
POST   /api/providers

GET    /api/providers/:id
PUT    /api/providers/:id
DELETE /api/providers/:id

GET    /api/rate-sets
POST   /api/rate-sets

GET    /api/rate-sets/:id
PUT    /api/rate-sets/:id
DELETE /api/rate-sets/:id

POST   /api/rate-sets/:id/import

GET    /api/invoices
POST   /api/invoices

GET    /api/invoices/:id
PUT    /api/invoices/:id
DELETE /api/invoices/:id
```

Lookup API routes are also used by the frontend for:

- Gender values
- Pricing regions
- Rate sets
- Categories
- Support items

---

# NDIS Catalogue Import Behaviour

The NDIS Excel importer intentionally does not rely on row position.

Records are matched using business identifiers from the NDIS catalogue.

This allows the importer to correctly handle:

- Reordered rows
- New rows
- Changed values
- Removed rows
- Re-imported files

The importer therefore behaves consistently even when the physical ordering of Excel rows changes.

---

# Design Decisions and Trade-offs

## Primary Requirements First

The assessment intentionally contains more functionality than most candidates are expected to complete.

Development therefore prioritised the primary requirements before optional and extended features.

Priority was given to:

1. Database correctness
2. Participant and Provider management
3. NDIS catalogue import
4. Invoice business logic
5. Server-side validation
6. Frontend usability
7. Error handling

---

## Server-Side Business Logic

Important invoice calculations and NDIS price matching are implemented on the server rather than trusting frontend calculations.

This increases backend complexity slightly but prevents manipulated frontend requests from bypassing invoice rules.

---

## Full Replacement of Invoice Items on Edit

When an invoice is edited, the submitted invoice-item collection represents the current invoice state.

Existing active invoice items are soft deleted and the updated item collection is inserted within the same transaction.

This simplifies consistency between the submitted invoice and the database while preserving historical rows through soft deletion.

---

## Decimal Calculations

JavaScript floating-point arithmetic can introduce errors for financial values.

`BigNumber.js` is therefore used for monetary calculations before values are stored as PostgreSQL decimal values.

---

## Excel Import Transactions

Catalogue parsing occurs before or outside the critical database write transaction where possible.

Database mutations are then executed transactionally.

This reduces the amount of time database locks are held while maintaining atomic import behaviour.

---

## Frontend Validation vs Backend Validation

Frontend validation is provided for usability.

The backend independently validates required business rules and remains authoritative.

This means API consumers cannot bypass business rules by avoiding the frontend.

---

# Known Limitations and Future Work

The current implementation prioritises the assessment's primary requirements.

Potential future improvements include:

- Authentication
- System user management
- Role Based Access Control
- Audit logging
- AI-assisted PDF invoice extraction
- PDF invoice upload workflow
- MinIO document management UI
- Pagination
- Search and filtering
- Automated integration testing
- Additional reusable service and repository abstractions
- More detailed import reporting
- Improved user notifications for all CRUD operations

These features should be implemented after the primary business workflows are stable.

---

# Testing and Verification

During development, the application was manually tested for:

- Participant Create / View / Edit / Delete
- Provider Create / View / Edit / Delete
- Rate Set Create / View / Edit / Delete
- NDIS Excel catalogue import
- Re-import idempotency
- Import rollback
- Invoice creation
- Invoice editing
- Invoice viewing
- Invoice deletion
- Draft invoice saving
- Completed invoice validation
- Duplicate invoice number validation
- Invoice item validation
- Rate-set date-overlap validation
- Maximum NDIS rate lookup
- Missing NDIS price validation
- Expected amount validation
- Server-derived invoice totals
- Soft deletion behaviour
- Production builds

Browser console warnings and errors encountered during development were also corrected before continuing to subsequent functionality.

---

# Submission Focus

The implementation focuses on delivering a functional, maintainable solution to the assessment's Primary Requirements.

Where optional or extended functionality has not been implemented, this is documented rather than replaced with incomplete placeholder behaviour.