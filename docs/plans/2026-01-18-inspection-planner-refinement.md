# Inspection Planner Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the journey planner to use configurable pre-buffer, post-buffer, and inspection duration times, and add inspection start/end times to the schema.

**Architecture:** Update the inspection schema to include start/end times. Modify the planner service to calculate arrival and departure times based on configurable pre-buffer (parking + walk to property), inspection duration, and post-buffer (walk back to car). Verify Google Maps API integration is working correctly.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, tRPC, React, Zod

---

## Task 1: Diagnose Google Maps API Issue

**Files:**
- Check: `.env` or `.env.local` for `GOOGLE_MAPS_API_KEY`
- Check: `src/server/services/InspectionPlannerService.ts:90-132`

**Step 1: Verify Google Maps API key is configured**

Run: `grep -l "GOOGLE_MAPS_API_KEY" .env* 2>/dev/null || echo "No .env files with GOOGLE_MAPS_API_KEY found"`

Check if the environment variable is set. If the key is missing or empty, the service falls back to 15-minute default times between all addresses (see `InspectionPlannerService.ts:93-97`).

**Step 2: Check env configuration**

Review: `src/server/env.ts` to see how `GOOGLE_MAPS_API_KEY` is loaded.

**Step 3: Add logging to identify API issues**

If the API key exists but travel times are still wrong, add temporary logging to `getDrivingTimeMatrix` to see the actual API response.

**Step 4: Report findings**

Document whether:
- API key is missing (user needs to add it)
- API key is present but API is returning errors
- API is working but results differ from Google Maps web

---

## Task 2: Update Database Schema with Inspection End Time

**Files:**
- Modify: `src/server/database/schema.ts:108-118`
- Create: Migration file via Drizzle

**Step 1: Add endDateTime to inspectionTimes table**

```typescript
// In src/server/database/schema.ts, update inspectionTimes table
export const inspectionTimes = pgTable("inspection_times", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  propertyId: text()
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  dateTime: timestamp().notNull(), // This is the start time of the inspection window
  endDateTime: timestamp(), // NEW: End time of the inspection window (nullable for backwards compatibility)
  attended: boolean().notNull().default(false),
  ...timestampFields,
});
```

**Step 2: Generate Drizzle migration**

Run: `npm run db:generate` (or `npx drizzle-kit generate`)

Expected: New migration file created in `drizzle/` or `migrations/` directory

**Step 3: Apply migration**

Run: `npm run db:migrate` (or `npx drizzle-kit migrate`)

Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add src/server/database/schema.ts drizzle/
git commit -m "feat: add endDateTime field to inspectionTimes schema"
```

---

## Task 3: Update Zod Schemas for Inspection Times

**Files:**
- Modify: `src/definitions/inspectionTime.ts`

**Step 1: Update CreateInspectionTimeInput**

```typescript
export const CreateInspectionTimeInput = z.object({
  propertyId: z.string().uuid(),
  dateTime: z.coerce.date(),
  endDateTime: z.coerce.date().optional(), // NEW: Optional end time
});
```

**Step 2: Update UpdateInspectionTimeInput**

```typescript
export const UpdateInspectionTimeInput = z.object({
  id: z.string().uuid(),
  dateTime: z.coerce.date().optional(),
  endDateTime: z.coerce.date().optional().nullable(), // NEW: Can update or clear end time
  attended: z.boolean().optional(),
});
```

**Step 3: Update InspectionTimeDto**

```typescript
export const InspectionTimeDto = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  dateTime: z.date(),
  endDateTime: z.date().nullable(), // NEW: Include end time in DTO
  attended: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

**Step 4: Run type checks**

Run: `npm run typecheck` (or `npx tsc --noEmit`)

Expected: No type errors

**Step 5: Commit**

```bash
git add src/definitions/inspectionTime.ts
git commit -m "feat: add endDateTime to inspection time Zod schemas"
```

---

## Task 4: Add Planner Configuration Schema

**Files:**
- Create: `src/definitions/plannerConfig.ts`

**Step 1: Create planner configuration schema**

```typescript
// src/definitions/plannerConfig.ts
import { z } from "zod";

export const PlannerConfigInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preBufferMinutes: z.number().min(0).max(30).default(5), // Time to park and walk to property
  postBufferMinutes: z.number().min(0).max(30).default(5), // Time to walk back to car
  inspectionDurationMinutes: z.number().min(5).max(60).default(10), // Time spent inspecting
});

export type PlannerConfig = z.infer<typeof PlannerConfigInput>;

// Calculated times for a single inspection slot
export const InspectionSlotTimesSchema = z.object({
  // The official inspection window from the listing
  inspectionWindowStart: z.date(),
  inspectionWindowEnd: z.date().nullable(),

  // When we need to arrive at the property (accounting for pre-buffer and inspection duration)
  arrivalTime: z.date(),

  // When we start our inspection
  inspectionStartTime: z.date(),

  // When we finish our inspection
  inspectionEndTime: z.date(),

  // When we're back at the car (after post-buffer)
  departureTime: z.date(),
});

export type InspectionSlotTimes = z.infer<typeof InspectionSlotTimesSchema>;
```

**Step 2: Run type checks**

Run: `npm run typecheck`

Expected: No type errors

**Step 3: Commit**

```bash
git add src/definitions/plannerConfig.ts
git commit -m "feat: add planner configuration schema with buffer times"
```

---

## Task 5: Update InspectionSlot Type and RouteOption Schema

**Files:**
- Modify: `src/server/services/InspectionPlannerService.ts` (types section)
- Modify: `src/server/endpoints/inspectionPlannerRouter.ts` (RouteOptionSchema)

**Step 1: Update InspectionSlot type**

Find the InspectionSlot type definition and update it:

```typescript
interface InspectionSlot {
  propertyId: string;
  address: string;
  // Inspection window from listing
  inspectionWindowStart: Date;
  inspectionWindowEnd: Date | null;
  // Calculated times
  arrivalTime: Date; // When we arrive at property
  inspectionStartTime: Date; // When we start inspecting
  inspectionEndTime: Date; // When we finish inspecting
  departureTime: Date; // When we're back at the car
  drivingTimeFromPrevious: number; // Minutes
}
```

**Step 2: Update RouteOptionSchema in router**

```typescript
const InspectionSlotSchema = z.object({
  propertyId: z.string(),
  address: z.string(),
  inspectionWindowStart: z.date(),
  inspectionWindowEnd: z.date().nullable(),
  arrivalTime: z.date(),
  inspectionStartTime: z.date(),
  inspectionEndTime: z.date(),
  departureTime: z.date(),
  drivingTimeFromPrevious: z.number(),
});

const RouteOptionSchema = z.object({
  name: z.string(),
  description: z.string(),
  slots: z.array(InspectionSlotSchema),
  totalDrivingTime: z.number(),
  totalInspections: z.number(),
});
```

**Step 3: Run type checks**

Run: `npm run typecheck`

Expected: Errors expected - we'll fix them in next task

**Step 4: Commit**

```bash
git add src/server/services/InspectionPlannerService.ts src/server/endpoints/inspectionPlannerRouter.ts
git commit -m "feat: update InspectionSlot type with new timing fields"
```

---

## Task 6: Update Planner API Endpoint

**Files:**
- Modify: `src/server/endpoints/inspectionPlannerRouter.ts:22-34`

**Step 1: Update planDay input schema**

```typescript
planDay: commonProcedure
  .input(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    preBufferMinutes: z.number().min(0).max(30).default(5),
    postBufferMinutes: z.number().min(0).max(30).default(5),
    inspectionDurationMinutes: z.number().min(5).max(60).default(10),
  }))
  .output(z.array(RouteOptionSchema))
  .handler(async ({ input, context }) => {
    return context.cradle.inspectionPlannerService.planInspections(
      input.date,
      {
        preBufferMinutes: input.preBufferMinutes,
        postBufferMinutes: input.postBufferMinutes,
        inspectionDurationMinutes: input.inspectionDurationMinutes,
      }
    );
  }),
```

**Step 2: Run type checks**

Run: `npm run typecheck`

Expected: Errors in InspectionPlannerService (we'll fix next)

**Step 3: Commit**

```bash
git add src/server/endpoints/inspectionPlannerRouter.ts
git commit -m "feat: update planner API to accept buffer time configuration"
```

---

## Task 7: Update InspectionPlannerService Logic

**Files:**
- Modify: `src/server/services/InspectionPlannerService.ts`

**Step 1: Update planInspections method signature**

```typescript
interface PlannerConfig {
  preBufferMinutes: number;
  postBufferMinutes: number;
  inspectionDurationMinutes: number;
}

async planInspections(date: string, config: PlannerConfig): Promise<RouteOption[]> {
  // ... existing code to fetch inspections ...
}
```

**Step 2: Update buildRoute method with new timing logic**

The key calculation logic:

```typescript
/**
 * Time calculation example:
 * - Inspection window: 1:00pm - 1:30pm
 * - Our inspection duration: 10 minutes
 * - Pre-buffer (parking + walk): 5 minutes
 * - Post-buffer (walk back): 5 minutes
 *
 * Latest arrival at property: 1:15pm
 *   (window end 1:30pm - inspection duration 10min - pre-buffer 5min = 1:15pm)
 *   OR if no window end: window start 1:00pm - pre-buffer 5min = 12:55pm
 *
 * If we arrive at 1:15pm:
 * - Inspection start: 1:20pm (arrival + pre-buffer)
 * - Inspection end: 1:30pm (start + duration)
 * - Departure (back at car): 1:35pm (end + post-buffer)
 */
private buildRoute(
  inspections: { propertyId: string; address: string; dateTime: Date; endDateTime: Date | null }[],
  drivingTimes: number[][],
  config: PlannerConfig,
  maxInspections: number
): RouteOption | null {
  const { preBufferMinutes, postBufferMinutes, inspectionDurationMinutes } = config;
  const slots: InspectionSlot[] = [];
  let totalDrivingTime = 0;
  let currentDepartureTime: Date | null = null; // When we're back at the car

  for (let i = 0; i < inspections.length && slots.length < maxInspections; i++) {
    const inspection = inspections[i];
    const windowStart = inspection.dateTime;
    const windowEnd = inspection.endDateTime;

    // Calculate the latest we can arrive at the property
    // If there's an end time, we must finish our inspection by then
    let latestArrival: Date;
    if (windowEnd) {
      // Must arrive with enough time for pre-buffer + inspection before window ends
      latestArrival = new Date(
        windowEnd.getTime() - (preBufferMinutes + inspectionDurationMinutes) * 60000
      );
    } else {
      // No end time specified, arrive pre-buffer minutes before start
      latestArrival = new Date(windowStart.getTime() - preBufferMinutes * 60000);
    }

    if (currentDepartureTime) {
      const drivingTime = drivingTimes[slots.length - 1]?.[i] || 15;

      // Earliest we can arrive = when we leave previous + driving time
      const earliestArrival = new Date(
        currentDepartureTime.getTime() + drivingTime * 60000
      );

      // Can we make it in time?
      if (earliestArrival > latestArrival) {
        continue; // Skip this inspection, can't make it
      }

      // Use the earlier of: earliest possible arrival or latest allowed arrival
      // This gives us some flexibility - arrive as late as possible to allow for delays
      const arrivalTime = earliestArrival <= latestArrival ? earliestArrival : latestArrival;

      // Calculate subsequent times
      const inspectionStartTime = new Date(arrivalTime.getTime() + preBufferMinutes * 60000);
      const inspectionEndTime = new Date(inspectionStartTime.getTime() + inspectionDurationMinutes * 60000);
      const departureTime = new Date(inspectionEndTime.getTime() + postBufferMinutes * 60000);

      totalDrivingTime += drivingTime;

      slots.push({
        propertyId: inspection.propertyId,
        address: inspection.address,
        inspectionWindowStart: windowStart,
        inspectionWindowEnd: windowEnd,
        arrivalTime,
        inspectionStartTime,
        inspectionEndTime,
        departureTime,
        drivingTimeFromPrevious: drivingTime,
      });

      currentDepartureTime = departureTime;
    } else {
      // First inspection - arrive at latest arrival time
      const arrivalTime = latestArrival;
      const inspectionStartTime = new Date(arrivalTime.getTime() + preBufferMinutes * 60000);
      const inspectionEndTime = new Date(inspectionStartTime.getTime() + inspectionDurationMinutes * 60000);
      const departureTime = new Date(inspectionEndTime.getTime() + postBufferMinutes * 60000);

      slots.push({
        propertyId: inspection.propertyId,
        address: inspection.address,
        inspectionWindowStart: windowStart,
        inspectionWindowEnd: windowEnd,
        arrivalTime,
        inspectionStartTime,
        inspectionEndTime,
        departureTime,
        drivingTimeFromPrevious: 0,
      });

      currentDepartureTime = departureTime;
    }
  }

  if (slots.length === 0) {
    return null;
  }

  return {
    name: "Route",
    description: `${slots.length} inspections`,
    slots,
    totalDrivingTime,
    totalInspections: slots.length,
  };
}
```

**Step 3: Update route options generation**

Update the code that generates the 3 route options to pass the config properly.

**Step 4: Run type checks**

Run: `npm run typecheck`

Expected: Pass

**Step 5: Run tests**

Run: `npm test` (or relevant test command)

Expected: Some tests may fail due to changed logic - update as needed

**Step 6: Commit**

```bash
git add src/server/services/InspectionPlannerService.ts
git commit -m "feat: implement new timing calculation with pre/post buffer"
```

---

## Task 8: Update Frontend Planner UI

**Files:**
- Modify: `src/app/planner/page.tsx`

**Step 1: Replace single buffer input with three inputs**

Replace the current buffer time input with:

```tsx
{/* Pre-Buffer Time */}
<div className="flex items-center gap-2">
  <label htmlFor="preBuffer" className="text-sm font-medium whitespace-nowrap">
    Pre-buffer (parking + walk):
  </label>
  <input
    type="number"
    id="preBuffer"
    min={0}
    max={30}
    value={preBufferMinutes}
    onChange={(e) => setPreBufferMinutes(Number(e.target.value))}
    className="w-16 rounded border px-2 py-1 text-sm"
  />
  <span className="text-sm text-gray-500">min</span>
</div>

{/* Inspection Duration */}
<div className="flex items-center gap-2">
  <label htmlFor="inspectionDuration" className="text-sm font-medium whitespace-nowrap">
    Inspection time:
  </label>
  <input
    type="number"
    id="inspectionDuration"
    min={5}
    max={60}
    value={inspectionDurationMinutes}
    onChange={(e) => setInspectionDurationMinutes(Number(e.target.value))}
    className="w-16 rounded border px-2 py-1 text-sm"
  />
  <span className="text-sm text-gray-500">min</span>
</div>

{/* Post-Buffer Time */}
<div className="flex items-center gap-2">
  <label htmlFor="postBuffer" className="text-sm font-medium whitespace-nowrap">
    Post-buffer (walk back):
  </label>
  <input
    type="number"
    id="postBuffer"
    min={0}
    max={30}
    value={postBufferMinutes}
    onChange={(e) => setPostBufferMinutes(Number(e.target.value))}
    className="w-16 rounded border px-2 py-1 text-sm"
  />
  <span className="text-sm text-gray-500">min</span>
</div>
```

**Step 2: Add state for new inputs**

```tsx
const [preBufferMinutes, setPreBufferMinutes] = useState(5);
const [postBufferMinutes, setPostBufferMinutes] = useState(5);
const [inspectionDurationMinutes, setInspectionDurationMinutes] = useState(10);
```

**Step 3: Update API call**

```tsx
const { data: routeOptions } = trpc.inspectionPlanner.planDay.useQuery({
  date: selectedDate,
  preBufferMinutes,
  postBufferMinutes,
  inspectionDurationMinutes,
});
```

**Step 4: Update timeline display**

Update the timeline visualization to show:
- Arrival time
- Inspection start time (after pre-buffer)
- Inspection end time
- Departure time (after post-buffer)

**Step 5: Run dev server and verify UI**

Run: `npm run dev`

Verify: UI shows new inputs and timeline displays correctly

**Step 6: Commit**

```bash
git add src/app/planner/page.tsx
git commit -m "feat: update planner UI with pre-buffer, post-buffer, and inspection duration inputs"
```

---

## Task 9: Update Inspection Time Form to Include End Time

**Files:**
- Locate and modify: Inspection time creation/edit form component

**Step 1: Find the inspection time form**

Search for forms that create/edit inspection times and add an optional end time field.

**Step 2: Add end time input**

Add a datetime input for the end time, which should be optional.

**Step 3: Update form submission**

Ensure the form sends `endDateTime` to the API when provided.

**Step 4: Commit**

```bash
git add <form-files>
git commit -m "feat: add end time field to inspection time form"
```

---

## Task 10: Add Tests for New Timing Logic

**Files:**
- Create: `src/server/services/__tests__/InspectionPlannerService.test.ts`

**Step 1: Write test for basic timing calculation**

```typescript
describe('InspectionPlannerService', () => {
  describe('timing calculations', () => {
    it('calculates arrival time correctly for inspection with end time', () => {
      // Inspection window: 1:00pm - 1:30pm
      // Pre-buffer: 5 min, Inspection duration: 10 min
      // Expected arrival: 1:15pm (1:30pm - 10min - 5min)
      const windowStart = new Date('2026-01-18T13:00:00');
      const windowEnd = new Date('2026-01-18T13:30:00');
      const config = {
        preBufferMinutes: 5,
        postBufferMinutes: 5,
        inspectionDurationMinutes: 10,
      };

      // ... test implementation
    });

    it('calculates departure time correctly including post-buffer', () => {
      // If inspection ends at 1:30pm and post-buffer is 5 min
      // Departure should be 1:35pm
    });
  });
});
```

**Step 2: Run tests**

Run: `npm test`

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/server/services/__tests__/
git commit -m "test: add tests for inspection planner timing calculations"
```

---

## Task 11: Final Integration Testing

**Step 1: Run full test suite**

Run: `npm test`

Expected: All tests pass

**Step 2: Run type checks**

Run: `npm run typecheck`

Expected: No errors

**Step 3: Run linter**

Run: `npm run lint`

Expected: No errors (fix any that appear)

**Step 4: Manual testing**

1. Start dev server: `npm run dev`
2. Navigate to `/planner`
3. Add test inspections with various time windows
4. Verify:
   - Pre-buffer, post-buffer, and inspection duration inputs work
   - Timeline shows correct arrival/inspection/departure times
   - Route feasibility is calculated correctly

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete inspection planner refinement with configurable timing"
```

---

## Summary

This plan adds:
1. **Google Maps API diagnosis** - Identify why travel times show 15 minutes
2. **Schema changes** - Add `endDateTime` to inspection times
3. **Configurable timing** - Pre-buffer, post-buffer, and inspection duration
4. **New calculation logic** - Properly calculate arrival/departure times
5. **Updated UI** - New inputs and timeline display
6. **Tests** - Verify timing calculations

The key timing formula:
- **Latest arrival** = inspection window end - pre-buffer - inspection duration
- **Inspection start** = arrival + pre-buffer
- **Inspection end** = inspection start + inspection duration
- **Departure** = inspection end + post-buffer
