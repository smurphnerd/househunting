# Property UX Improvements Design

## Overview

A set of UX improvements to streamline property management workflows.

## Features

### 1. Invalidate All Property Data on Edit

**Problem:** After editing a property, stale data appears in table/comparison views.

**Solution:** On successful property update, invalidate all queries that may contain property data:
- `["property"]` (single property)
- `["properties"]` (property list)
- Any other queries containing property data

### 2. Unsaved Changes Warning

**Problem:** Users can accidentally navigate away and lose edits.

**Solution:** Use `beforeunload` event to show browser's native confirm dialog when form is dirty.

### 3. Inspection Time Duration Dropdown

**Problem:** Entering start and end times separately is tedious.

**Solution:**
- Replace end time input with duration dropdown: 15 min, 30 min, 45 min, 1 hour
- Calculate end time from start time + duration
- Display as time range (e.g., "2:00 PM - 2:30 PM") throughout the app

### 4. Quick Status Update

**Problem:** Changing status requires opening the full property detail page.

**Solution:** Add inline status selector to:
- Property table rows
- Property cards (if card view exists)

Status changes save immediately via API call.

### 5. Auto-Calculate Distances on Creation

**Problem:** Users must manually click "Calculate Distances" for every property.

**Solution:**
- Trigger distance calculation automatically when a property is created
- Keep the "Recalculate" button for manual refresh
- Run calculation in background (don't block UI)

### 6. Make Address Read-Only After Creation

**Problem:** Changing address would invalidate distances, adding complexity.

**Solution:** Make address field read-only on the edit page. Address can only be set during property creation.

### 7. Fix Gym Filtering for Anytime Fitness

**Problem:** Non-Anytime Fitness gyms appearing in results despite keyword filter.

**Solution:** Investigate and fix the GoogleMapsService gym search to strictly return only Anytime Fitness locations.

## Implementation Order

1. Fix gym filtering (quick investigation/fix)
2. Make address read-only
3. Auto-calculate distances on creation
4. Inspection time duration dropdown
5. Quick status update in table/cards
6. Invalidate queries on edit
7. Unsaved changes warning
