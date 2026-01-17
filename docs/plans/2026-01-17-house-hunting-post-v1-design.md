# House Hunting App - Post-V1 Features Design

Future features to be built after v1 is complete.

## 1. AI Auto-fill via OpenRouter

Automatically extract property details from REA/Domain listing URLs.

**Behavior:**
- On-demand "Auto-fill from URL" button on property detail page
- Server-side fetch of the listing page
- AI extracts relevant fields from page content
- Shows diff preview: AI-extracted values vs existing values
- User selects which fields to update

**Configuration:**
- `OPENROUTER_API_KEY` - API key for OpenRouter
- `OPENROUTER_MODEL` - Model to use (e.g., `anthropic/claude-3-haiku`)

**Fallback:**
- If direct fetch is blocked by REA/Domain, revisit with browser extension or proxy solution

## 2. Google Maps Distance Calculations

Calculate distances from property to key locations.

**Behavior:**
- On-demand "Calculate distances" button on property detail page
- Calculates distance to fixed destination (Monash University)
- Finds nearest: train station, Coles/Woolworths, Anytime Fitness
- Stores for each: distance, name, and address

**Configuration:**
- `GOOGLE_MAPS_API_KEY` - API key for Google Maps
- `DESTINATION_WORK` - Fixed work address (e.g., `Monash University Clayton VIC`)

**Data model additions to Property:**
- `distanceToWork` - Distance in km
- `nearestStation` - JSON: `{ distance, name, address }`
- `nearestSupermarket` - JSON: `{ distance, name, address }`
- `nearestGym` - JSON: `{ distance, name, address }`

## 3. Custom Filtering Rules

Save named filter rules using TypeScript-like expressions.

**Behavior:**
- Manage saved rules (create, edit, delete)
- Apply rules from dropdown to filter property table
- No ad-hoc filter text box

**Expression language:**
- Operators: `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`
- Field references by name (e.g., `price`, `hasCarPark`, `bedrooms`)
- Examples:
  - `price < 350000`
  - `hasCarPark == true && bodyCorpFees < 5000`
  - `bedrooms >= 2 || squareMetres > 50`

**Expression editor:**
- Click-to-insert field picker (like n8n variable selector)
- Autocomplete as you type
- Real-time type checking with error messages
- Invalid rules blocked from saving (e.g., `price == true` errors because price is number)

**Data model - Filter Rules table:**
- `id` - Unique identifier
- `name` - Display name (e.g., "Transport friendly")
- `expression` - The filter expression string
- `createdAt` / `updatedAt` - Timestamps

## 4. Head-to-Head Comparison

Compare two properties side by side.

**Layout:**
- Two-column view
- Property A on left, Property B on right
- Fields aligned row by row for easy comparison

**Entry points:**
- "Compare with..." button on property detail page → select second property
- Dedicated comparison page (`/compare`) → select both properties from dropdowns

## 5. Inspection Day Planner

Plan optimal inspection routes for a given day.

**Input:**
- Select a single date
- Automatically uses shortlisted properties with inspection times on that date
- Global buffer time setting (default 15 minutes) - configurable before running

**Algorithm:**
- Uses Google Maps Directions API with traffic predictions
- Considers inspection slot times (must arrive before slot starts)
- Accounts for buffer time between inspections

**Output:**
- 2-3 route options with different trade-offs
- Each option shows:
  - Number of inspections
  - Total driving time
  - Schedule: arrival time, inspection slot, departure time for each property
  - Trade-off description (e.g., "4 inspections, tight timing" vs "3 inspections, relaxed pace")

**Data model additions:**
- `buffer_minutes` - App setting for buffer time between inspections

## Implementation Order (Suggested)

1. **Custom Filtering Rules** - Most immediately useful for narrowing down options
2. **Head-to-Head Comparison** - Simple to build, useful for decision making
3. **Google Maps Distance Calculations** - Adds valuable data, needed for planner
4. **AI Auto-fill** - Quality of life improvement for data entry
5. **Inspection Day Planner** - Most complex, needs distance calculations first
