# House Hunting Checklist App - V1 Design

A password-protected web app for tracking properties during house hunting.

## Core Functionality

- Add properties quickly (just URL + address to start)
- View all properties in a filterable/sortable table
- Edit full property details on a dedicated page
- Track status: Saved → Shortlisted → Inspected → Offered → Purchased (or Rejected at any point)
- Store multiple inspection times per property

## Data Model

### Property Table

**Core fields:**
- `id` - Unique identifier
- `status` - Enum: `saved`, `rejected`, `shortlisted`, `inspected`, `offered`, `purchased`
- `websiteUrl` - REA/Domain listing URL
- `address` - Full address string
- `createdAt` / `updatedAt` - Timestamps

**Pre-inspection fields:**
- `propertyType` - Enum: `apartment`, `unit`, `townhouse`, `house`
- `price` - Estimated purchase price (dollars)
- `bedrooms` / `bathrooms` - Integers, default 1
- `squareMetres` - Integer
- `ageYears` - Integer (approximate)
- `previousPrice` - Last sold/rent price (dollars)
- `carParkIncluded` - Boolean
- `carParkCost` - Additional cost if not included (dollars)
- `bodyCorpFees` - Annual cost (dollars)
- `councilRates` - Annual cost (dollars)
- `estimatedRent` - Weekly rent estimate (dollars)
- `petsAllowed` - Boolean
- `storageIncluded` - Boolean
- `aspect` - Enum: `north`, `south`, `east`, `west`, `other`
- `agentName` / `agentContact` - Strings
- `dateListed` - Date
- `notes` - Free text

**Post-inspection fields:**
- `desksFit` - Integer (how many desks)
- `hasLaundrySpace` - Boolean
- `floorLevel` - Integer
- `goodLighting` - Boolean
- `hasDishwasher` - Boolean
- `stoveType` - Enum: `gas`, `electric`, `induction`, `unknown`
- `isQuiet` - Boolean
- `hasAircon` - Boolean
- `overallImpression` - Integer 1-5 (nullable until inspected)
- `visibleIssues` - Free text
- `postInspectionNotes` - Free text

### Inspection Times Table

Separate table, many-to-one with Property:
- `id` - Unique identifier
- `propertyId` - Foreign key to Property
- `dateTime` - Timestamp of the inspection slot
- `attended` - Boolean (did you go to this one?)

## Pages & Navigation

### Pages

1. **Login page** (`/`) - Password input, stores auth in cookie/session
2. **Property list** (`/properties`) - Main table view with all properties
3. **Property detail** (`/properties/[id]`) - View and edit a single property, manage inspection times

### Table View Columns

Condensed for scanning:
- Status (colored badge)
- Address (truncated, links to detail)
- Price
- Beds/Baths
- sqm
- Body corp
- Date listed
- Actions (edit, delete)

Users can click a row to go to the detail page where all fields are editable.

### Property Detail Page Sections

- Header: Address, status dropdown, quick actions (delete, change status)
- Pre-inspection fields: Grouped form
- Post-inspection fields: Collapsed by default, expand when ready
- Inspection times: List with add/remove, mark as attended

## Authentication

**Password protection:**
- Env variable: `APP_PASSWORD`
- Login page shows a single password field
- On correct password, set a secure HTTP-only cookie (signed value)
- Middleware checks the cookie on all routes except `/` (login page)
- Invalid/missing cookie redirects to login

**API protection:**
- All oRPC endpoints check for valid auth cookie
- Return 401 if not authenticated

## Technical Stack

- Next.js 16 with existing template
- Drizzle ORM + Postgres
- oRPC for API
- Simple password auth via env variable
- React Hook Form + Zod for forms
- shadcn/ui components

## Out of Scope for V1

Future features to be built later:
- OpenRouter AI auto-fill from listing URLs
- Google Maps distance calculations
- Custom filtering rules with TypeScript-like syntax (e.g., `price < 350000 && hasCarPark == true`)
- Head-to-head property comparison
- Inspection day planner/optimizer
