# Post-V1 Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement five post-v1 features: Custom Filtering Rules, Head-to-Head Comparison, Google Maps Distance Calculations, AI Auto-fill, and Inspection Day Planner.

**Architecture:** Follows existing patterns - Drizzle ORM for database, oRPC for API endpoints, service classes for business logic, React Hook Form + Zod for forms, TanStack Query for data fetching.

**Tech Stack:** Next.js 16, Drizzle ORM, oRPC, React Hook Form, Zod, shadcn/ui, Tailwind CSS, OpenRouter API, Google Maps API

---

# Feature 1: Custom Filtering Rules

Save named filter rules using TypeScript-like expressions to filter the property table.

---

## Task 1.1: Add Filter Rule Database Schema

**Files:**
- Create: `src/definitions/filterRule.ts`
- Modify: `src/server/database/schema.ts`

**Step 1: Create filter rule Zod schemas**

```typescript
// src/definitions/filterRule.ts
import { z } from "zod";

export const CreateFilterRuleInput = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expression: z.string().min(1, "Expression is required"),
});
export type CreateFilterRuleInput = z.infer<typeof CreateFilterRuleInput>;

export const UpdateFilterRuleInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  expression: z.string().min(1).optional(),
});
export type UpdateFilterRuleInput = z.infer<typeof UpdateFilterRuleInput>;

export const FilterRuleDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  expression: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FilterRuleDto = z.infer<typeof FilterRuleDto>;
```

**Step 2: Add filter_rules table to database schema**

```typescript
// In src/server/database/schema.ts
// Add after inspectionTimes table:

export const filterRules = pgTable("filter_rules", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  expression: text().notNull(),
  ...timestampFields,
});

// Update schema export to include filterRules
```

**Step 3: Run database migration**

Run: `pnpm db:push`
Expected: Schema pushed successfully

**Step 4: Commit**

```bash
git add src/definitions/filterRule.ts src/server/database/schema.ts
git commit -m "feat: add filter rules database schema"
```

---

## Task 1.2: Create Filter Rule Service

**Files:**
- Create: `src/server/services/FilterRuleService.ts`
- Modify: `src/server/initialization.ts`

**Step 1: Create FilterRuleService**

```typescript
// src/server/services/FilterRuleService.ts
import { eq } from "drizzle-orm";
import type { Cradle } from "@/server/initialization";
import { filterRules } from "@/server/database/schema";
import type { CreateFilterRuleInput, UpdateFilterRuleInput } from "@/definitions/filterRule";

export class FilterRuleService {
  constructor(private deps: Cradle) {}

  async list() {
    return this.deps.database.query.filterRules.findMany({
      orderBy: (filterRules, { asc }) => [asc(filterRules.name)],
    });
  }

  async getById(id: string) {
    return this.deps.database.query.filterRules.findFirst({
      where: eq(filterRules.id, id),
    });
  }

  async create(input: CreateFilterRuleInput) {
    const [rule] = await this.deps.database
      .insert(filterRules)
      .values({
        name: input.name,
        expression: input.expression,
      })
      .returning();
    return rule;
  }

  async update(input: UpdateFilterRuleInput) {
    const { id, ...data } = input;
    const [rule] = await this.deps.database
      .update(filterRules)
      .set(data)
      .where(eq(filterRules.id, id))
      .returning();
    return rule;
  }

  async delete(id: string) {
    await this.deps.database.delete(filterRules).where(eq(filterRules.id, id));
  }
}
```

**Step 2: Register service in container**

```typescript
// In src/server/initialization.ts
// Add import:
import { FilterRuleService } from "@/server/services/FilterRuleService";

// Add to Cradle type:
filterRuleService: FilterRuleService;

// Add to container.register():
filterRuleService: asClass(FilterRuleService).singleton(),
```

**Step 3: Commit**

```bash
git add src/server/services/FilterRuleService.ts src/server/initialization.ts
git commit -m "feat: add FilterRuleService"
```

---

## Task 1.3: Create Filter Rule API Router

**Files:**
- Create: `src/server/endpoints/filterRuleRouter.ts`
- Modify: `src/server/endpoints/router.ts`

**Step 1: Create filter rule router**

```typescript
// src/server/endpoints/filterRuleRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";
import {
  CreateFilterRuleInput,
  UpdateFilterRuleInput,
  FilterRuleDto,
} from "@/definitions/filterRule";

export const filterRuleRouter = {
  list: commonProcedure
    .output(z.array(FilterRuleDto))
    .handler(async ({ context }) => {
      return context.cradle.filterRuleService.list();
    }),

  getById: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(FilterRuleDto.nullable())
    .handler(async ({ input, context }) => {
      const rule = await context.cradle.filterRuleService.getById(input.id);
      return rule ?? null;
    }),

  create: commonProcedure
    .input(CreateFilterRuleInput)
    .output(FilterRuleDto)
    .handler(async ({ input, context }) => {
      return context.cradle.filterRuleService.create(input);
    }),

  update: commonProcedure
    .input(UpdateFilterRuleInput)
    .output(FilterRuleDto.nullable())
    .handler(async ({ input, context }) => {
      const rule = await context.cradle.filterRuleService.update(input);
      return rule ?? null;
    }),

  delete: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      await context.cradle.filterRuleService.delete(input.id);
      return { success: true };
    }),
};
```

**Step 2: Add to main router**

```typescript
// In src/server/endpoints/router.ts
// Add import:
import { filterRuleRouter } from "@/server/endpoints/filterRuleRouter";

// Add to appRouter:
filterRule: filterRuleRouter,
```

**Step 3: Commit**

```bash
git add src/server/endpoints/filterRuleRouter.ts src/server/endpoints/router.ts
git commit -m "feat: add filter rule API router"
```

---

## Task 1.4: Create Expression Parser and Validator

**Files:**
- Create: `src/lib/filterExpression.ts`
- Create: `src/lib/filterExpression.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/filterExpression.test.ts
import { describe, it, expect } from "vitest";
import { parseFilterExpression, validateFilterExpression, evaluateFilter } from "./filterExpression";
import type { PropertyDto } from "@/definitions/property";

describe("filterExpression", () => {
  describe("validateFilterExpression", () => {
    it("validates simple comparison", () => {
      const result = validateFilterExpression("price < 350000");
      expect(result.valid).toBe(true);
    });

    it("validates boolean field comparison", () => {
      const result = validateFilterExpression("carParkIncluded == true");
      expect(result.valid).toBe(true);
    });

    it("validates compound expression with &&", () => {
      const result = validateFilterExpression("price < 350000 && bedrooms >= 2");
      expect(result.valid).toBe(true);
    });

    it("validates compound expression with ||", () => {
      const result = validateFilterExpression("bedrooms >= 2 || squareMetres > 50");
      expect(result.valid).toBe(true);
    });

    it("rejects type mismatch - number field with boolean", () => {
      const result = validateFilterExpression("price == true");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("type");
    });

    it("rejects unknown field", () => {
      const result = validateFilterExpression("unknownField == 5");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("unknown");
    });

    it("rejects invalid syntax", () => {
      const result = validateFilterExpression("price < ");
      expect(result.valid).toBe(false);
    });
  });

  describe("evaluateFilter", () => {
    const mockProperty: Partial<PropertyDto> = {
      id: "test-id",
      address: "123 Test St",
      status: "saved",
      price: 300000,
      bedrooms: 2,
      bathrooms: 1,
      squareMetres: 60,
      carParkIncluded: true,
      bodyCorpFees: 4000,
    };

    it("evaluates price < 350000 to true", () => {
      const result = evaluateFilter("price < 350000", mockProperty as PropertyDto);
      expect(result).toBe(true);
    });

    it("evaluates price > 350000 to false", () => {
      const result = evaluateFilter("price > 350000", mockProperty as PropertyDto);
      expect(result).toBe(false);
    });

    it("evaluates carParkIncluded == true to true", () => {
      const result = evaluateFilter("carParkIncluded == true", mockProperty as PropertyDto);
      expect(result).toBe(true);
    });

    it("evaluates compound && expression", () => {
      const result = evaluateFilter("price < 350000 && bedrooms >= 2", mockProperty as PropertyDto);
      expect(result).toBe(true);
    });

    it("evaluates compound || expression", () => {
      const result = evaluateFilter("bedrooms >= 3 || squareMetres > 50", mockProperty as PropertyDto);
      expect(result).toBe(true);
    });

    it("handles null values gracefully", () => {
      const propertyWithNull = { ...mockProperty, price: null } as PropertyDto;
      const result = evaluateFilter("price < 350000", propertyWithNull);
      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/filterExpression.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/lib/filterExpression.ts

import type { PropertyDto } from "@/definitions/property";

// Define field types for type checking
const FIELD_TYPES: Record<string, "number" | "boolean" | "string"> = {
  // Number fields
  price: "number",
  bedrooms: "number",
  bathrooms: "number",
  squareMetres: "number",
  ageYears: "number",
  previousPrice: "number",
  carParkCost: "number",
  bodyCorpFees: "number",
  councilRates: "number",
  estimatedRent: "number",
  desksFit: "number",
  floorLevel: "number",
  overallImpression: "number",
  // Boolean fields
  carParkIncluded: "boolean",
  petsAllowed: "boolean",
  storageIncluded: "boolean",
  hasLaundrySpace: "boolean",
  goodLighting: "boolean",
  hasDishwasher: "boolean",
  isQuiet: "boolean",
  hasAircon: "boolean",
  // String fields
  address: "string",
  status: "string",
  propertyType: "string",
  aspect: "string",
  stoveType: "string",
  agentName: "string",
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

// Token types for lexer
type TokenType =
  | "FIELD" | "NUMBER" | "BOOLEAN" | "STRING"
  | "EQ" | "NEQ" | "LT" | "GT" | "LTE" | "GTE"
  | "AND" | "OR" | "NOT" | "LPAREN" | "RPAREN" | "EOF";

interface Token {
  type: TokenType;
  value: string | number | boolean;
}

// Simple tokenizer
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    // Skip whitespace
    if (/\s/.test(expression[i])) {
      i++;
      continue;
    }

    // Check for operators
    if (expression.slice(i, i + 2) === "==") {
      tokens.push({ type: "EQ", value: "==" });
      i += 2;
      continue;
    }
    if (expression.slice(i, i + 2) === "!=") {
      tokens.push({ type: "NEQ", value: "!=" });
      i += 2;
      continue;
    }
    if (expression.slice(i, i + 2) === "<=") {
      tokens.push({ type: "LTE", value: "<=" });
      i += 2;
      continue;
    }
    if (expression.slice(i, i + 2) === ">=") {
      tokens.push({ type: "GTE", value: ">=" });
      i += 2;
      continue;
    }
    if (expression.slice(i, i + 2) === "&&") {
      tokens.push({ type: "AND", value: "&&" });
      i += 2;
      continue;
    }
    if (expression.slice(i, i + 2) === "||") {
      tokens.push({ type: "OR", value: "||" });
      i += 2;
      continue;
    }
    if (expression[i] === "<") {
      tokens.push({ type: "LT", value: "<" });
      i++;
      continue;
    }
    if (expression[i] === ">") {
      tokens.push({ type: "GT", value: ">" });
      i++;
      continue;
    }
    if (expression[i] === "!") {
      tokens.push({ type: "NOT", value: "!" });
      i++;
      continue;
    }
    if (expression[i] === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (expression[i] === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    // Check for numbers
    if (/\d/.test(expression[i])) {
      let numStr = "";
      while (i < expression.length && /[\d.]/.test(expression[i])) {
        numStr += expression[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: parseFloat(numStr) });
      continue;
    }

    // Check for identifiers (fields and boolean literals)
    if (/[a-zA-Z_]/.test(expression[i])) {
      let ident = "";
      while (i < expression.length && /[a-zA-Z_0-9]/.test(expression[i])) {
        ident += expression[i];
        i++;
      }
      if (ident === "true") {
        tokens.push({ type: "BOOLEAN", value: true });
      } else if (ident === "false") {
        tokens.push({ type: "BOOLEAN", value: false });
      } else {
        tokens.push({ type: "FIELD", value: ident });
      }
      continue;
    }

    // Check for string literals
    if (expression[i] === '"' || expression[i] === "'") {
      const quote = expression[i];
      i++;
      let str = "";
      while (i < expression.length && expression[i] !== quote) {
        str += expression[i];
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    throw new Error(`Unexpected character: ${expression[i]}`);
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

// AST node types
type ASTNode =
  | { type: "comparison"; field: string; operator: string; value: number | boolean | string }
  | { type: "and"; left: ASTNode; right: ASTNode }
  | { type: "or"; left: ASTNode; right: ASTNode }
  | { type: "not"; operand: ASTNode };

// Simple recursive descent parser
class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    return this.advance();
  }

  parse(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.current().type === "OR") {
      this.advance();
      const right = this.parseAnd();
      left = { type: "or", left, right };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseNot();
    while (this.current().type === "AND") {
      this.advance();
      const right = this.parseNot();
      left = { type: "and", left, right };
    }
    return left;
  }

  private parseNot(): ASTNode {
    if (this.current().type === "NOT") {
      this.advance();
      const operand = this.parseNot();
      return { type: "not", operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.current().type === "LPAREN") {
      this.advance();
      const node = this.parseOr();
      this.expect("RPAREN");
      return node;
    }
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    const fieldToken = this.expect("FIELD");
    const field = fieldToken.value as string;

    const opToken = this.current();
    if (!["EQ", "NEQ", "LT", "GT", "LTE", "GTE"].includes(opToken.type)) {
      throw new Error(`Expected comparison operator, got ${opToken.type}`);
    }
    const operator = this.advance().value as string;

    const valueToken = this.current();
    if (!["NUMBER", "BOOLEAN", "STRING"].includes(valueToken.type)) {
      throw new Error(`Expected value, got ${valueToken.type}`);
    }
    const value = this.advance().value;

    return { type: "comparison", field, operator, value };
  }
}

// Type checking
function typeCheckAST(node: ASTNode): ValidationResult {
  if (node.type === "comparison") {
    const fieldType = FIELD_TYPES[node.field];
    if (!fieldType) {
      return { valid: false, error: `Unknown field: ${node.field}` };
    }

    const valueType = typeof node.value;
    if (fieldType !== valueType) {
      return { valid: false, error: `Type mismatch: ${node.field} is ${fieldType}, but got ${valueType}` };
    }

    // Check that comparison operators are valid for the type
    if (fieldType === "boolean" && !["==", "!="].includes(node.operator)) {
      return { valid: false, error: `Invalid operator ${node.operator} for boolean field` };
    }

    return { valid: true };
  }

  if (node.type === "and" || node.type === "or") {
    const leftResult = typeCheckAST(node.left);
    if (!leftResult.valid) return leftResult;
    return typeCheckAST(node.right);
  }

  if (node.type === "not") {
    return typeCheckAST(node.operand);
  }

  return { valid: true };
}

export function parseFilterExpression(expression: string): ASTNode {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  return parser.parse();
}

export function validateFilterExpression(expression: string): ValidationResult {
  try {
    const ast = parseFilterExpression(expression);
    return typeCheckAST(ast);
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Parse error" };
  }
}

// Evaluate AST against a property
function evaluateAST(node: ASTNode, property: PropertyDto): boolean {
  if (node.type === "comparison") {
    const fieldValue = property[node.field as keyof PropertyDto];

    // Handle null values
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    switch (node.operator) {
      case "==": return fieldValue === node.value;
      case "!=": return fieldValue !== node.value;
      case "<": return (fieldValue as number) < (node.value as number);
      case ">": return (fieldValue as number) > (node.value as number);
      case "<=": return (fieldValue as number) <= (node.value as number);
      case ">=": return (fieldValue as number) >= (node.value as number);
      default: return false;
    }
  }

  if (node.type === "and") {
    return evaluateAST(node.left, property) && evaluateAST(node.right, property);
  }

  if (node.type === "or") {
    return evaluateAST(node.left, property) || evaluateAST(node.right, property);
  }

  if (node.type === "not") {
    return !evaluateAST(node.operand, property);
  }

  return false;
}

export function evaluateFilter(expression: string, property: PropertyDto): boolean {
  try {
    const ast = parseFilterExpression(expression);
    return evaluateAST(ast, property);
  } catch {
    return false;
  }
}

// Get all available fields for autocomplete
export function getFilterableFields(): { name: string; type: string }[] {
  return Object.entries(FIELD_TYPES).map(([name, type]) => ({ name, type }));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/filterExpression.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/filterExpression.ts src/lib/filterExpression.test.ts
git commit -m "feat: add filter expression parser and validator"
```

---

## Task 1.5: Add Expression Validation to Filter Rule API

**Files:**
- Modify: `src/server/endpoints/filterRuleRouter.ts`

**Step 1: Add validation to create and update handlers**

```typescript
// In src/server/endpoints/filterRuleRouter.ts
// Add import:
import { validateFilterExpression } from "@/lib/filterExpression";

// Modify create handler:
create: commonProcedure
  .input(CreateFilterRuleInput)
  .output(FilterRuleDto)
  .handler(async ({ input, context }) => {
    const validation = validateFilterExpression(input.expression);
    if (!validation.valid) {
      throw new Error(`Invalid expression: ${validation.error}`);
    }
    return context.cradle.filterRuleService.create(input);
  }),

// Modify update handler:
update: commonProcedure
  .input(UpdateFilterRuleInput)
  .output(FilterRuleDto.nullable())
  .handler(async ({ input, context }) => {
    if (input.expression) {
      const validation = validateFilterExpression(input.expression);
      if (!validation.valid) {
        throw new Error(`Invalid expression: ${validation.error}`);
      }
    }
    const rule = await context.cradle.filterRuleService.update(input);
    return rule ?? null;
  }),
```

**Step 2: Commit**

```bash
git add src/server/endpoints/filterRuleRouter.ts
git commit -m "feat: add expression validation to filter rule API"
```

---

## Task 1.6: Create Filter Rules Management Dialog

**Files:**
- Create: `src/components/FilterRulesManager.tsx`

**Step 1: Create the FilterRulesManager component**

```typescript
// src/components/FilterRulesManager.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { validateFilterExpression, getFilterableFields } from "@/lib/filterExpression";

export function FilterRulesManager() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [expression, setExpression] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const orpc = useORPC();
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery(
    orpc.filterRule.list.queryOptions({ input: undefined })
  );

  const createMutation = useMutation({
    mutationFn: (input: { name: string; expression: string }) =>
      orpc.filterRule.create.call({ input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filterRule"] });
      resetForm();
      toast.success("Filter rule created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name?: string; expression?: string }) =>
      orpc.filterRule.update.call({ input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filterRule"] });
      resetForm();
      toast.success("Filter rule updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      orpc.filterRule.delete.call({ input: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filterRule"] });
      toast.success("Filter rule deleted");
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setExpression("");
    setValidationError(null);
  }

  function handleExpressionChange(value: string) {
    setExpression(value);
    if (value.trim()) {
      const result = validateFilterExpression(value);
      setValidationError(result.valid ? null : result.error || "Invalid expression");
    } else {
      setValidationError(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, name, expression });
    } else {
      createMutation.mutate({ name, expression });
    }
  }

  function handleEdit(rule: { id: string; name: string; expression: string }) {
    setEditingId(rule.id);
    setName(rule.name);
    setExpression(rule.expression);
    setValidationError(null);
  }

  const fields = getFilterableFields();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage Filters</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Rules</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Rule name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Expression (e.g., price < 350000 && bedrooms >= 2)"
              value={expression}
              onChange={(e) => handleExpressionChange(e.target.value)}
              rows={2}
              required
            />
            {validationError && (
              <p className="text-sm text-destructive mt-1">{validationError}</p>
            )}
          </div>

          {/* Field picker */}
          <div className="flex flex-wrap gap-1">
            <span className="text-sm text-muted-foreground mr-2">Fields:</span>
            {fields.slice(0, 10).map((field) => (
              <button
                key={field.name}
                type="button"
                className="text-xs bg-secondary px-2 py-0.5 rounded hover:bg-secondary/80"
                onClick={() => setExpression((prev) => prev + field.name)}
              >
                {field.name}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">...</span>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!!validationError || createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Update" : "Create"} Rule
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 space-y-2">
          <h3 className="font-medium">Saved Rules</h3>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No filter rules saved.</p>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-3 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <code className="text-xs text-muted-foreground">{rule.expression}</code>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this rule?")) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/FilterRulesManager.tsx
git commit -m "feat: add filter rules management dialog"
```

---

## Task 1.7: Add Filter Dropdown to Properties Page

**Files:**
- Modify: `src/app/properties/page.tsx`

**Step 1: Add filter state and dropdown to properties page**

```typescript
// In src/app/properties/page.tsx
// Add imports:
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterRulesManager } from "@/components/FilterRulesManager";
import { evaluateFilter } from "@/lib/filterExpression";

// Inside PropertiesTable component, add:
const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

const { data: filterRules = [] } = useQuery(
  orpc.filterRule.list.queryOptions({ input: undefined })
);

const activeRule = filterRules.find((r) => r.id === activeFilterId);

// Filter properties based on active rule
const filteredProperties = activeRule
  ? properties.filter((p) => evaluateFilter(activeRule.expression, p))
  : properties;

// In the JSX header section, add the filter dropdown:
<div className="flex gap-2">
  <Select
    value={activeFilterId ?? "all"}
    onValueChange={(v) => setActiveFilterId(v === "all" ? null : v)}
  >
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Filter properties" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Properties</SelectItem>
      {filterRules.map((rule) => (
        <SelectItem key={rule.id} value={rule.id}>
          {rule.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <FilterRulesManager />
</div>

// Use filteredProperties instead of properties in the table rendering
```

**Step 2: Commit**

```bash
git add src/app/properties/page.tsx
git commit -m "feat: add filter dropdown to properties page"
```

---

# Feature 2: Head-to-Head Comparison

Compare two properties side by side.

---

## Task 2.1: Create Comparison Page

**Files:**
- Create: `src/app/compare/page.tsx`

**Step 1: Create the comparison page**

```typescript
// src/app/compare/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import type { PropertyDto } from "@/definitions/property";

type ComparisonField = {
  key: keyof PropertyDto;
  label: string;
  format?: (value: unknown) => string;
};

const COMPARISON_FIELDS: ComparisonField[] = [
  { key: "status", label: "Status" },
  { key: "propertyType", label: "Type" },
  { key: "price", label: "Price", format: (v) => v ? `$${(v as number).toLocaleString()}` : "-" },
  { key: "bedrooms", label: "Bedrooms", format: (v) => v?.toString() ?? "-" },
  { key: "bathrooms", label: "Bathrooms", format: (v) => v?.toString() ?? "-" },
  { key: "squareMetres", label: "Square Metres", format: (v) => v ? `${v} sqm` : "-" },
  { key: "ageYears", label: "Age", format: (v) => v ? `${v} years` : "-" },
  { key: "bodyCorpFees", label: "Body Corp", format: (v) => v ? `$${(v as number).toLocaleString()}/yr` : "-" },
  { key: "councilRates", label: "Council Rates", format: (v) => v ? `$${(v as number).toLocaleString()}/yr` : "-" },
  { key: "estimatedRent", label: "Est. Rent", format: (v) => v ? `$${v}/wk` : "-" },
  { key: "carParkIncluded", label: "Car Park", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "petsAllowed", label: "Pets Allowed", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "storageIncluded", label: "Storage", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "aspect", label: "Aspect", format: (v) => v?.toString() ?? "-" },
  { key: "floorLevel", label: "Floor Level", format: (v) => v?.toString() ?? "-" },
  { key: "overallImpression", label: "Impression", format: (v) => v ? `${v}/5` : "-" },
  { key: "hasAircon", label: "Air Conditioning", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "hasDishwasher", label: "Dishwasher", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "isQuiet", label: "Quiet", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "goodLighting", label: "Good Lighting", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
];

function formatValue(field: ComparisonField, value: unknown): string {
  if (field.format) {
    return field.format(value);
  }
  if (value === null || value === undefined) return "-";
  return String(value);
}

function ComparisonContent() {
  const orpc = useORPC();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialA = searchParams.get("a");
  const initialB = searchParams.get("b");

  const [propertyAId, setPropertyAId] = useState<string | null>(initialA);
  const [propertyBId, setPropertyBId] = useState<string | null>(initialB);

  const { data: properties = [] } = useQuery(
    orpc.property.list.queryOptions({ input: undefined })
  );

  const propertyA = properties.find((p) => p.id === propertyAId);
  const propertyB = properties.find((p) => p.id === propertyBId);

  function updateUrl(aId: string | null, bId: string | null) {
    const params = new URLSearchParams();
    if (aId) params.set("a", aId);
    if (bId) params.set("b", bId);
    router.replace(`/compare?${params.toString()}`);
  }

  function handleSelectA(id: string) {
    setPropertyAId(id === "none" ? null : id);
    updateUrl(id === "none" ? null : id, propertyBId);
  }

  function handleSelectB(id: string) {
    setPropertyBId(id === "none" ? null : id);
    updateUrl(propertyAId, id === "none" ? null : id);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Compare Properties</h1>
        <Button variant="outline" onClick={() => router.push("/properties")}>
          Back to Properties
        </Button>
      </div>

      {/* Property selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Select value={propertyAId ?? "none"} onValueChange={handleSelectA}>
          <SelectTrigger>
            <SelectValue placeholder="Select Property A" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select Property A</SelectItem>
            {properties
              .filter((p) => p.id !== propertyBId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.address}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={propertyBId ?? "none"} onValueChange={handleSelectB}>
          <SelectTrigger>
            <SelectValue placeholder="Select Property B" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select Property B</SelectItem>
            {properties
              .filter((p) => p.id !== propertyAId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.address}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comparison table */}
      {propertyA && propertyB ? (
        <Card>
          <CardHeader>
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">Field</div>
              <div className="font-medium truncate">{propertyA.address}</div>
              <div className="font-medium truncate">{propertyB.address}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {COMPARISON_FIELDS.map((field) => {
                const valueA = propertyA[field.key];
                const valueB = propertyB[field.key];
                const formattedA = formatValue(field, valueA);
                const formattedB = formatValue(field, valueB);

                // Highlight differences
                const isDifferent = formattedA !== formattedB;

                return (
                  <div
                    key={field.key}
                    className={`grid grid-cols-3 gap-4 py-2 border-b ${isDifferent ? "bg-muted/50" : ""}`}
                  >
                    <div className="text-muted-foreground">{field.label}</div>
                    <div>{field.key === "status" ? <StatusBadge status={propertyA.status} /> : formattedA}</div>
                    <div>{field.key === "status" ? <StatusBadge status={propertyB.status} /> : formattedB}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select two properties above to compare them side by side.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ComparisonContent />
    </Suspense>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/compare/page.tsx
git commit -m "feat: add head-to-head property comparison page"
```

---

## Task 2.2: Add "Compare with..." Button to Property Detail Page

**Files:**
- Modify: `src/app/properties/[id]/page.tsx`

**Step 1: Add compare button to property detail header**

```typescript
// In src/app/properties/[id]/page.tsx
// Add to the header buttons section:

<Button
  type="button"
  variant="outline"
  onClick={() => router.push(`/compare?a=${id}`)}
>
  Compare with...
</Button>
```

**Step 2: Commit**

```bash
git add src/app/properties/[id]/page.tsx
git commit -m "feat: add compare button to property detail page"
```

---

# Feature 3: Google Maps Distance Calculations

Calculate distances from property to key locations.

---

## Task 3.1: Add Environment Variables for Google Maps

**Files:**
- Modify: `src/env-utils.ts`

**Step 1: Add Google Maps env variables**

```typescript
// In src/env-utils.ts, add to envSchema:
GOOGLE_MAPS_API_KEY: z.string().optional(),
DESTINATION_WORK: z.string().optional().default("Monash University Clayton VIC"),
```

**Step 2: Commit**

```bash
git add src/env-utils.ts
git commit -m "feat: add Google Maps environment variables"
```

---

## Task 3.2: Add Distance Fields to Property Schema

**Files:**
- Modify: `src/definitions/property.ts`
- Modify: `src/server/database/schema.ts`

**Step 1: Add distance-related Zod schemas**

```typescript
// In src/definitions/property.ts
// Add new schema for nearby place:
export const NearbyPlace = z.object({
  distance: z.number(),
  name: z.string(),
  address: z.string(),
});
export type NearbyPlace = z.infer<typeof NearbyPlace>;

// Add to UpdatePropertyInput:
distanceToWork: z.number().optional().nullable(),
nearestStation: NearbyPlace.optional().nullable(),
nearestSupermarket: NearbyPlace.optional().nullable(),
nearestGym: NearbyPlace.optional().nullable(),

// Add to PropertyDto:
distanceToWork: z.number().nullable(),
nearestStation: NearbyPlace.nullable(),
nearestSupermarket: NearbyPlace.nullable(),
nearestGym: NearbyPlace.nullable(),
```

**Step 2: Add columns to database schema**

```typescript
// In src/server/database/schema.ts
// Add to properties table:
distanceToWork: real(),
nearestStation: jsonb().$type<{ distance: number; name: string; address: string }>(),
nearestSupermarket: jsonb().$type<{ distance: number; name: string; address: string }>(),
nearestGym: jsonb().$type<{ distance: number; name: string; address: string }>(),
```

**Step 3: Run database migration**

Run: `pnpm db:push`

**Step 4: Commit**

```bash
git add src/definitions/property.ts src/server/database/schema.ts
git commit -m "feat: add distance fields to property schema"
```

---

## Task 3.3: Create Google Maps Service

**Files:**
- Create: `src/server/services/GoogleMapsService.ts`
- Modify: `src/server/initialization.ts`

**Step 1: Create GoogleMapsService**

```typescript
// src/server/services/GoogleMapsService.ts
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";

export type NearbyPlace = {
  distance: number;
  name: string;
  address: string;
};

export type DistanceCalculationResult = {
  distanceToWork: number | null;
  nearestStation: NearbyPlace | null;
  nearestSupermarket: NearbyPlace | null;
  nearestGym: NearbyPlace | null;
};

export class GoogleMapsService {
  constructor(private deps: Cradle) {}

  private get apiKey() {
    return env.GOOGLE_MAPS_API_KEY;
  }

  private get workAddress() {
    return env.DESTINATION_WORK;
  }

  async calculateDistances(propertyAddress: string): Promise<DistanceCalculationResult> {
    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured");
    }

    const [distanceToWork, nearestStation, nearestSupermarket, nearestGym] = await Promise.all([
      this.getDistanceToDestination(propertyAddress, this.workAddress),
      this.findNearestPlace(propertyAddress, "train_station"),
      this.findNearestPlace(propertyAddress, "supermarket"),
      this.findNearestPlace(propertyAddress, "gym"),
    ]);

    return {
      distanceToWork,
      nearestStation,
      nearestSupermarket,
      nearestGym,
    };
  }

  private async getDistanceToDestination(origin: string, destination: string): Promise<number | null> {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", origin);
      url.searchParams.set("destinations", destination);
      url.searchParams.set("mode", "driving");
      url.searchParams.set("key", this.apiKey!);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
        // Distance in meters, convert to km
        return data.rows[0].elements[0].distance.value / 1000;
      }
      return null;
    } catch (error) {
      this.deps.logger.error({ error }, "Failed to get distance to destination");
      return null;
    }
  }

  private async findNearestPlace(origin: string, type: string): Promise<NearbyPlace | null> {
    try {
      // First, geocode the origin address
      const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      geocodeUrl.searchParams.set("address", origin);
      geocodeUrl.searchParams.set("key", this.apiKey!);

      const geocodeResponse = await fetch(geocodeUrl.toString());
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.results?.[0]?.geometry?.location) {
        const { lat, lng } = geocodeData.results[0].geometry.location;

        // Search for nearby places
        const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        placesUrl.searchParams.set("location", `${lat},${lng}`);
        placesUrl.searchParams.set("rankby", "distance");
        placesUrl.searchParams.set("type", type);
        placesUrl.searchParams.set("key", this.apiKey!);

        const placesResponse = await fetch(placesUrl.toString());
        const placesData = await placesResponse.json();

        if (placesData.results?.[0]) {
          const place = placesData.results[0];
          const placeLocation = place.geometry.location;

          // Get actual driving distance
          const distanceUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
          distanceUrl.searchParams.set("origins", `${lat},${lng}`);
          distanceUrl.searchParams.set("destinations", `${placeLocation.lat},${placeLocation.lng}`);
          distanceUrl.searchParams.set("mode", "driving");
          distanceUrl.searchParams.set("key", this.apiKey!);

          const distanceResponse = await fetch(distanceUrl.toString());
          const distanceData = await distanceResponse.json();

          if (distanceData.rows?.[0]?.elements?.[0]?.status === "OK") {
            return {
              distance: distanceData.rows[0].elements[0].distance.value / 1000,
              name: place.name,
              address: place.vicinity || place.formatted_address || "",
            };
          }
        }
      }
      return null;
    } catch (error) {
      this.deps.logger.error({ error, type }, "Failed to find nearest place");
      return null;
    }
  }
}
```

**Step 2: Register service**

```typescript
// In src/server/initialization.ts
import { GoogleMapsService } from "@/server/services/GoogleMapsService";

// Add to Cradle type:
googleMapsService: GoogleMapsService;

// Add to container.register():
googleMapsService: asClass(GoogleMapsService).singleton(),
```

**Step 3: Commit**

```bash
git add src/server/services/GoogleMapsService.ts src/server/initialization.ts
git commit -m "feat: add Google Maps service for distance calculations"
```

---

## Task 3.4: Add Distance Calculation API Endpoint

**Files:**
- Modify: `src/server/endpoints/propertyRouter.ts`

**Step 1: Add calculateDistances endpoint**

```typescript
// In src/server/endpoints/propertyRouter.ts
// Add new endpoint:

calculateDistances: commonProcedure
  .input(z.object({ id: z.string().uuid() }))
  .output(z.object({
    distanceToWork: z.number().nullable(),
    nearestStation: NearbyPlace.nullable(),
    nearestSupermarket: NearbyPlace.nullable(),
    nearestGym: NearbyPlace.nullable(),
  }))
  .handler(async ({ input, context }) => {
    const property = await context.cradle.propertyService.getById(input.id);
    if (!property) {
      throw new Error("Property not found");
    }

    const distances = await context.cradle.googleMapsService.calculateDistances(
      property.address
    );

    // Update property with calculated distances
    await context.cradle.propertyService.update({
      id: input.id,
      ...distances,
    });

    return distances;
  }),
```

**Step 2: Commit**

```bash
git add src/server/endpoints/propertyRouter.ts
git commit -m "feat: add distance calculation API endpoint"
```

---

## Task 3.5: Add Calculate Distances Button to Property Detail

**Files:**
- Modify: `src/app/properties/[id]/page.tsx`

**Step 1: Add distances display and calculate button**

```typescript
// In src/app/properties/[id]/page.tsx
// Add after the post-inspection collapsible:

{/* Distance Information */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle>Distances</CardTitle>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => calculateDistancesMutation.mutate()}
      disabled={calculateDistancesMutation.isPending}
    >
      {calculateDistancesMutation.isPending ? "Calculating..." : "Calculate Distances"}
    </Button>
  </CardHeader>
  <CardContent className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-sm text-muted-foreground">Distance to Work</p>
      <p className="font-medium">
        {property.distanceToWork ? `${property.distanceToWork.toFixed(1)} km` : "-"}
      </p>
    </div>
    <div>
      <p className="text-sm text-muted-foreground">Nearest Station</p>
      {property.nearestStation ? (
        <div>
          <p className="font-medium">{property.nearestStation.name}</p>
          <p className="text-xs text-muted-foreground">
            {property.nearestStation.distance.toFixed(1)} km
          </p>
        </div>
      ) : (
        <p>-</p>
      )}
    </div>
    <div>
      <p className="text-sm text-muted-foreground">Nearest Supermarket</p>
      {property.nearestSupermarket ? (
        <div>
          <p className="font-medium">{property.nearestSupermarket.name}</p>
          <p className="text-xs text-muted-foreground">
            {property.nearestSupermarket.distance.toFixed(1)} km
          </p>
        </div>
      ) : (
        <p>-</p>
      )}
    </div>
    <div>
      <p className="text-sm text-muted-foreground">Nearest Gym</p>
      {property.nearestGym ? (
        <div>
          <p className="font-medium">{property.nearestGym.name}</p>
          <p className="text-xs text-muted-foreground">
            {property.nearestGym.distance.toFixed(1)} km
          </p>
        </div>
      ) : (
        <p>-</p>
      )}
    </div>
  </CardContent>
</Card>

// Add mutation:
const calculateDistancesMutation = useMutation({
  mutationFn: () => orpc.property.calculateDistances.call({ input: { id } }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["property"] });
    toast.success("Distances calculated");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

**Step 2: Commit**

```bash
git add src/app/properties/[id]/page.tsx
git commit -m "feat: add calculate distances button to property detail"
```

---

# Feature 4: AI Auto-fill via OpenRouter

Automatically extract property details from REA/Domain listing URLs.

---

## Task 4.1: Add OpenRouter Environment Variables

**Files:**
- Modify: `src/env-utils.ts`

**Step 1: Add OpenRouter env variables**

```typescript
// In src/env-utils.ts, add to envSchema:
OPENROUTER_API_KEY: z.string().optional(),
OPENROUTER_MODEL: z.string().optional().default("anthropic/claude-3-haiku"),
```

**Step 2: Commit**

```bash
git add src/env-utils.ts
git commit -m "feat: add OpenRouter environment variables"
```

---

## Task 4.2: Create OpenRouter Service

**Files:**
- Create: `src/server/services/OpenRouterService.ts`
- Modify: `src/server/initialization.ts`

**Step 1: Create OpenRouterService**

```typescript
// src/server/services/OpenRouterService.ts
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";

export type ExtractedPropertyData = {
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareMetres?: number;
  propertyType?: string;
  carParkIncluded?: boolean;
  bodyCorpFees?: number;
  agentName?: string;
  agentContact?: string;
};

export class OpenRouterService {
  constructor(private deps: Cradle) {}

  private get apiKey() {
    return env.OPENROUTER_API_KEY;
  }

  private get model() {
    return env.OPENROUTER_MODEL;
  }

  async extractPropertyData(url: string): Promise<ExtractedPropertyData> {
    if (!this.apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    // First, fetch the listing page content
    const pageContent = await this.fetchPageContent(url);

    // Then use AI to extract structured data
    const extractedData = await this.extractWithAI(pageContent);

    return extractedData;
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HouseHuntingBot/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();

      // Simple HTML to text conversion - remove scripts, styles, and tags
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 15000); // Limit content size

      return text;
    } catch (error) {
      this.deps.logger.error({ error, url }, "Failed to fetch page content");
      throw new Error("Failed to fetch listing page. The site may be blocking automated access.");
    }
  }

  private async extractWithAI(pageContent: string): Promise<ExtractedPropertyData> {
    const systemPrompt = `You are a property data extraction assistant. Extract property details from the provided listing text.
Return a JSON object with these fields (use null if not found):
- price: number (just the number, no currency symbols)
- bedrooms: number
- bathrooms: number
- squareMetres: number (internal floor area)
- propertyType: string (apartment, unit, townhouse, or house)
- carParkIncluded: boolean
- bodyCorpFees: number (annual, convert quarterly to annual if needed)
- agentName: string
- agentContact: string (phone or email)

Only return valid JSON, no explanation.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://house-hunting.app",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract property data from this listing:\n\n${pageContent}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.deps.logger.error({ error }, "OpenRouter API error");
      throw new Error("AI extraction failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      // Parse the JSON response
      const parsed = JSON.parse(content);
      return {
        price: parsed.price ?? undefined,
        bedrooms: parsed.bedrooms ?? undefined,
        bathrooms: parsed.bathrooms ?? undefined,
        squareMetres: parsed.squareMetres ?? undefined,
        propertyType: parsed.propertyType ?? undefined,
        carParkIncluded: parsed.carParkIncluded ?? undefined,
        bodyCorpFees: parsed.bodyCorpFees ?? undefined,
        agentName: parsed.agentName ?? undefined,
        agentContact: parsed.agentContact ?? undefined,
      };
    } catch {
      this.deps.logger.error({ content }, "Failed to parse AI response");
      throw new Error("Failed to parse extracted data");
    }
  }
}
```

**Step 2: Register service**

```typescript
// In src/server/initialization.ts
import { OpenRouterService } from "@/server/services/OpenRouterService";

// Add to Cradle type:
openRouterService: OpenRouterService;

// Add to container.register():
openRouterService: asClass(OpenRouterService).singleton(),
```

**Step 3: Commit**

```bash
git add src/server/services/OpenRouterService.ts src/server/initialization.ts
git commit -m "feat: add OpenRouter service for AI property extraction"
```

---

## Task 4.3: Add Auto-fill API Endpoint

**Files:**
- Modify: `src/server/endpoints/propertyRouter.ts`

**Step 1: Add autoFill endpoint**

```typescript
// In src/server/endpoints/propertyRouter.ts
// Add new endpoint:

autoFill: commonProcedure
  .input(z.object({ id: z.string().uuid() }))
  .output(z.object({
    price: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    squareMetres: z.number().optional(),
    propertyType: z.string().optional(),
    carParkIncluded: z.boolean().optional(),
    bodyCorpFees: z.number().optional(),
    agentName: z.string().optional(),
    agentContact: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const property = await context.cradle.propertyService.getById(input.id);
    if (!property) {
      throw new Error("Property not found");
    }

    if (!property.websiteUrl) {
      throw new Error("Property has no website URL");
    }

    const extractedData = await context.cradle.openRouterService.extractPropertyData(
      property.websiteUrl
    );

    return extractedData;
  }),
```

**Step 2: Commit**

```bash
git add src/server/endpoints/propertyRouter.ts
git commit -m "feat: add auto-fill API endpoint"
```

---

## Task 4.4: Create Auto-fill Preview Dialog

**Files:**
- Create: `src/components/AutoFillDialog.tsx`

**Step 1: Create AutoFillDialog component**

```typescript
// src/components/AutoFillDialog.tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PropertyDto } from "@/definitions/property";

type ExtractedData = {
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareMetres?: number;
  propertyType?: string;
  carParkIncluded?: boolean;
  bodyCorpFees?: number;
  agentName?: string;
  agentContact?: string;
};

type FieldDiff = {
  key: keyof ExtractedData;
  label: string;
  current: string;
  extracted: string;
  selected: boolean;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

export function AutoFillDialog({
  property,
  onApply,
}: {
  property: PropertyDto;
  onApply: (data: Partial<ExtractedData>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);

  const orpc = useORPC();

  const extractMutation = useMutation({
    mutationFn: () => orpc.property.autoFill.call({ input: { id: property.id } }),
    onSuccess: (data) => {
      setExtractedData(data);

      // Build diffs
      const fields: { key: keyof ExtractedData; label: string }[] = [
        { key: "price", label: "Price" },
        { key: "bedrooms", label: "Bedrooms" },
        { key: "bathrooms", label: "Bathrooms" },
        { key: "squareMetres", label: "Square Metres" },
        { key: "propertyType", label: "Property Type" },
        { key: "carParkIncluded", label: "Car Park" },
        { key: "bodyCorpFees", label: "Body Corp Fees" },
        { key: "agentName", label: "Agent Name" },
        { key: "agentContact", label: "Agent Contact" },
      ];

      const newDiffs: FieldDiff[] = [];
      for (const field of fields) {
        const extracted = data[field.key];
        if (extracted !== undefined) {
          const current = property[field.key as keyof PropertyDto];
          newDiffs.push({
            key: field.key,
            label: field.label,
            current: formatValue(current),
            extracted: formatValue(extracted),
            selected: current === null || current === undefined,
          });
        }
      }
      setDiffs(newDiffs);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleOpen() {
    setOpen(true);
    setExtractedData(null);
    setDiffs([]);
    extractMutation.mutate();
  }

  function toggleField(key: keyof ExtractedData) {
    setDiffs((prev) =>
      prev.map((d) => (d.key === key ? { ...d, selected: !d.selected } : d))
    );
  }

  function handleApply() {
    if (!extractedData) return;

    const selectedData: Partial<ExtractedData> = {};
    for (const diff of diffs) {
      if (diff.selected) {
        selectedData[diff.key] = extractedData[diff.key];
      }
    }

    onApply(selectedData);
    setOpen(false);
    toast.success("Data applied to form");
  }

  const hasUrl = !!property.websiteUrl;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={!hasUrl}
        title={hasUrl ? "Auto-fill from listing URL" : "Add a website URL first"}
      >
        Auto-fill from URL
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto-fill from Listing</DialogTitle>
          </DialogHeader>

          {extractMutation.isPending ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Extracting property data...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few seconds.</p>
            </div>
          ) : extractMutation.isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">Failed to extract data</p>
              <p className="text-sm text-muted-foreground mt-2">
                The listing site may be blocking automated access.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => extractMutation.mutate()}
              >
                Retry
              </Button>
            </div>
          ) : diffs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No data could be extracted from the listing.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select which fields to update:
                </p>
                {diffs.map((diff) => (
                  <div
                    key={diff.key}
                    className="flex items-center gap-3 p-2 border rounded"
                  >
                    <Checkbox
                      checked={diff.selected}
                      onCheckedChange={() => toggleField(diff.key)}
                    />
                    <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium">{diff.label}</span>
                      <span className="text-muted-foreground">{diff.current}</span>
                      <span className="text-primary">{diff.extracted}</span>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!diffs.some((d) => d.selected)}
                >
                  Apply Selected
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/AutoFillDialog.tsx
git commit -m "feat: add auto-fill preview dialog"
```

---

## Task 4.5: Add Auto-fill Button to Property Detail

**Files:**
- Modify: `src/app/properties/[id]/page.tsx`

**Step 1: Add AutoFillDialog to property detail**

```typescript
// In src/app/properties/[id]/page.tsx
// Add import:
import { AutoFillDialog } from "@/components/AutoFillDialog";

// Add to header buttons, before Save button:
<AutoFillDialog
  property={property}
  onApply={(data) => {
    // Update form values with extracted data
    if (data.price !== undefined) form.setValue("price", data.price);
    if (data.bedrooms !== undefined) form.setValue("bedrooms", data.bedrooms);
    if (data.bathrooms !== undefined) form.setValue("bathrooms", data.bathrooms);
    if (data.squareMetres !== undefined) form.setValue("squareMetres", data.squareMetres);
    if (data.propertyType !== undefined) form.setValue("propertyType", data.propertyType as any);
    if (data.carParkIncluded !== undefined) form.setValue("carParkIncluded", data.carParkIncluded);
    if (data.bodyCorpFees !== undefined) form.setValue("bodyCorpFees", data.bodyCorpFees);
    if (data.agentName !== undefined) form.setValue("agentName", data.agentName);
    if (data.agentContact !== undefined) form.setValue("agentContact", data.agentContact);
  }}
/>
```

**Step 2: Commit**

```bash
git add src/app/properties/[id]/page.tsx
git commit -m "feat: add auto-fill button to property detail"
```

---

# Feature 5: Inspection Day Planner

Plan optimal inspection routes for a given day.

---

## Task 5.1: Create Inspection Planner Service

**Files:**
- Create: `src/server/services/InspectionPlannerService.ts`
- Modify: `src/server/initialization.ts`

**Step 1: Create InspectionPlannerService**

```typescript
// src/server/services/InspectionPlannerService.ts
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";
import { and, eq, gte, lt } from "drizzle-orm";
import { inspectionTimes, properties } from "@/server/database/schema";

export type InspectionSlot = {
  propertyId: string;
  address: string;
  inspectionTime: Date;
  arrivalTime: Date;
  departureTime: Date;
  drivingTimeFromPrevious: number; // minutes
};

export type RouteOption = {
  inspections: InspectionSlot[];
  totalDrivingTime: number; // minutes
  totalInspections: number;
  description: string;
};

export class InspectionPlannerService {
  constructor(private deps: Cradle) {}

  async planInspections(
    date: Date,
    bufferMinutes: number = 15
  ): Promise<RouteOption[]> {
    // Get all shortlisted properties with inspections on the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query inspection times for the date
    const inspections = await this.deps.database
      .select({
        inspectionId: inspectionTimes.id,
        propertyId: properties.id,
        address: properties.address,
        dateTime: inspectionTimes.dateTime,
      })
      .from(inspectionTimes)
      .innerJoin(properties, eq(inspectionTimes.propertyId, properties.id))
      .where(
        and(
          gte(inspectionTimes.dateTime, startOfDay),
          lt(inspectionTimes.dateTime, endOfDay),
          eq(properties.status, "shortlisted")
        )
      )
      .orderBy(inspectionTimes.dateTime);

    if (inspections.length === 0) {
      return [];
    }

    if (inspections.length === 1) {
      return [{
        inspections: [{
          propertyId: inspections[0].propertyId,
          address: inspections[0].address,
          inspectionTime: inspections[0].dateTime,
          arrivalTime: new Date(inspections[0].dateTime.getTime() - 5 * 60000),
          departureTime: new Date(inspections[0].dateTime.getTime() + 30 * 60000),
          drivingTimeFromPrevious: 0,
        }],
        totalDrivingTime: 0,
        totalInspections: 1,
        description: "Single inspection",
      }];
    }

    // Get driving times between all pairs of properties
    const drivingTimes = await this.getDrivingTimeMatrix(
      inspections.map((i) => i.address)
    );

    // Generate route options using a greedy approach
    const routes = this.generateRouteOptions(
      inspections,
      drivingTimes,
      bufferMinutes
    );

    return routes;
  }

  private async getDrivingTimeMatrix(addresses: string[]): Promise<number[][]> {
    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // Return estimated times if no API key
      const n = addresses.length;
      const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(15));
      for (let i = 0; i < n; i++) matrix[i][i] = 0;
      return matrix;
    }

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", addresses.join("|"));
      url.searchParams.set("destinations", addresses.join("|"));
      url.searchParams.set("mode", "driving");
      url.searchParams.set("departure_time", "now");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      const matrix: number[][] = [];
      for (const row of data.rows) {
        const times: number[] = [];
        for (const element of row.elements) {
          if (element.status === "OK") {
            times.push(Math.ceil(element.duration_in_traffic?.value || element.duration.value) / 60);
          } else {
            times.push(20); // Default 20 minutes if route not found
          }
        }
        matrix.push(times);
      }

      return matrix;
    } catch (error) {
      this.deps.logger.error({ error }, "Failed to get driving time matrix");
      // Return estimated times on error
      const n = addresses.length;
      const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(15));
      for (let i = 0; i < n; i++) matrix[i][i] = 0;
      return matrix;
    }
  }

  private generateRouteOptions(
    inspections: { propertyId: string; address: string; dateTime: Date }[],
    drivingTimes: number[][],
    bufferMinutes: number
  ): RouteOption[] {
    const options: RouteOption[] = [];
    const inspectionDuration = 20; // minutes per inspection

    // Option 1: Try to fit all inspections (greedy by time)
    const allOption = this.buildRoute(
      inspections,
      drivingTimes,
      bufferMinutes,
      inspectionDuration,
      inspections.length
    );
    if (allOption) {
      allOption.description = `All ${allOption.totalInspections} inspections`;
      options.push(allOption);
    }

    // Option 2: Relaxed pace (skip tight ones)
    if (inspections.length > 2) {
      const relaxedOption = this.buildRoute(
        inspections,
        drivingTimes,
        bufferMinutes + 10, // More buffer
        inspectionDuration,
        Math.ceil(inspections.length * 0.75)
      );
      if (relaxedOption && relaxedOption.totalInspections < (allOption?.totalInspections || Infinity)) {
        relaxedOption.description = `${relaxedOption.totalInspections} inspections, relaxed pace`;
        options.push(relaxedOption);
      }
    }

    // Option 3: Minimal (focus on most important/earliest)
    if (inspections.length > 3) {
      const minimalOption = this.buildRoute(
        inspections.slice(0, Math.ceil(inspections.length / 2)),
        drivingTimes,
        bufferMinutes,
        inspectionDuration,
        Math.ceil(inspections.length / 2)
      );
      if (minimalOption) {
        minimalOption.description = `${minimalOption.totalInspections} inspections, morning only`;
        options.push(minimalOption);
      }
    }

    return options;
  }

  private buildRoute(
    inspections: { propertyId: string; address: string; dateTime: Date }[],
    drivingTimes: number[][],
    bufferMinutes: number,
    inspectionDuration: number,
    maxInspections: number
  ): RouteOption | null {
    const slots: InspectionSlot[] = [];
    let totalDrivingTime = 0;
    let currentEndTime: Date | null = null;

    for (let i = 0; i < inspections.length && slots.length < maxInspections; i++) {
      const inspection = inspections[i];
      const inspectionTime = inspection.dateTime;

      // Calculate required arrival time
      const arrivalTime = new Date(inspectionTime.getTime() - 5 * 60000); // 5 min before

      if (currentEndTime) {
        const drivingTime = drivingTimes[slots.length - 1]?.[i] || 15;
        const requiredDepartureTime = new Date(arrivalTime.getTime() - (drivingTime + bufferMinutes) * 60000);

        // Check if we can make it
        if (requiredDepartureTime < currentEndTime) {
          continue; // Skip this inspection, can't make it in time
        }

        totalDrivingTime += drivingTime;

        slots.push({
          propertyId: inspection.propertyId,
          address: inspection.address,
          inspectionTime,
          arrivalTime,
          departureTime: new Date(inspectionTime.getTime() + inspectionDuration * 60000),
          drivingTimeFromPrevious: drivingTime,
        });
      } else {
        slots.push({
          propertyId: inspection.propertyId,
          address: inspection.address,
          inspectionTime,
          arrivalTime,
          departureTime: new Date(inspectionTime.getTime() + inspectionDuration * 60000),
          drivingTimeFromPrevious: 0,
        });
      }

      currentEndTime = new Date(inspectionTime.getTime() + inspectionDuration * 60000);
    }

    if (slots.length === 0) return null;

    return {
      inspections: slots,
      totalDrivingTime,
      totalInspections: slots.length,
      description: "",
    };
  }
}
```

**Step 2: Register service**

```typescript
// In src/server/initialization.ts
import { InspectionPlannerService } from "@/server/services/InspectionPlannerService";

// Add to Cradle type:
inspectionPlannerService: InspectionPlannerService;

// Add to container.register():
inspectionPlannerService: asClass(InspectionPlannerService).singleton(),
```

**Step 3: Commit**

```bash
git add src/server/services/InspectionPlannerService.ts src/server/initialization.ts
git commit -m "feat: add inspection planner service"
```

---

## Task 5.2: Add Inspection Planner API Endpoint

**Files:**
- Create: `src/server/endpoints/inspectionPlannerRouter.ts`
- Modify: `src/server/endpoints/router.ts`

**Step 1: Create inspection planner router**

```typescript
// src/server/endpoints/inspectionPlannerRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";

const InspectionSlotSchema = z.object({
  propertyId: z.string(),
  address: z.string(),
  inspectionTime: z.date(),
  arrivalTime: z.date(),
  departureTime: z.date(),
  drivingTimeFromPrevious: z.number(),
});

const RouteOptionSchema = z.object({
  inspections: z.array(InspectionSlotSchema),
  totalDrivingTime: z.number(),
  totalInspections: z.number(),
  description: z.string(),
});

export const inspectionPlannerRouter = {
  planDay: commonProcedure
    .input(z.object({
      date: z.coerce.date(),
      bufferMinutes: z.number().min(0).max(60).default(15),
    }))
    .output(z.array(RouteOptionSchema))
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionPlannerService.planInspections(
        input.date,
        input.bufferMinutes
      );
    }),
};
```

**Step 2: Add to main router**

```typescript
// In src/server/endpoints/router.ts
import { inspectionPlannerRouter } from "@/server/endpoints/inspectionPlannerRouter";

// Add to appRouter:
inspectionPlanner: inspectionPlannerRouter,
```

**Step 3: Commit**

```bash
git add src/server/endpoints/inspectionPlannerRouter.ts src/server/endpoints/router.ts
git commit -m "feat: add inspection planner API endpoint"
```

---

## Task 5.3: Create Inspection Day Planner Page

**Files:**
- Create: `src/app/planner/page.tsx`

**Step 1: Create the planner page**

```typescript
// src/app/planner/page.tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type InspectionSlot = {
  propertyId: string;
  address: string;
  inspectionTime: Date;
  arrivalTime: Date;
  departureTime: Date;
  drivingTimeFromPrevious: number;
};

type RouteOption = {
  inspections: InspectionSlot[];
  totalDrivingTime: number;
  totalInspections: number;
  description: string;
};

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PlannerPage() {
  const router = useRouter();
  const orpc = useORPC();

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [routes, setRoutes] = useState<RouteOption[]>([]);

  const planMutation = useMutation({
    mutationFn: () =>
      orpc.inspectionPlanner.planDay.call({
        input: { date: new Date(date), bufferMinutes },
      }),
    onSuccess: (data) => {
      setRoutes(data);
      if (data.length === 0) {
        toast.info("No shortlisted properties have inspections on this date");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inspection Day Planner</h1>
        <Button variant="outline" onClick={() => router.push("/properties")}>
          Back to Properties
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plan Settings</CardTitle>
          <CardDescription>
            Select a date to see optimal inspection routes for shortlisted properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Buffer (minutes)</label>
              <Input
                type="number"
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                min={0}
                max={60}
                className="w-24"
              />
            </div>
            <Button
              onClick={() => planMutation.mutate()}
              disabled={planMutation.isPending}
            >
              {planMutation.isPending ? "Planning..." : "Plan Route"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {routes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Route Options</h2>
          {routes.map((route, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">Option {index + 1}: {route.description}</CardTitle>
                <CardDescription>
                  {route.totalInspections} inspections • {route.totalDrivingTime} min driving
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {route.inspections.map((slot, slotIndex) => (
                    <div
                      key={slot.propertyId}
                      className="flex items-start gap-4 p-3 border rounded"
                    >
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        {slotIndex + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{slot.address}</p>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span>Arrive: {formatTime(slot.arrivalTime)}</span>
                          <span className="mx-2">•</span>
                          <span>Inspection: {formatTime(slot.inspectionTime)}</span>
                          <span className="mx-2">•</span>
                          <span>Depart: {formatTime(slot.departureTime)}</span>
                        </div>
                        {slot.drivingTimeFromPrevious > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {slot.drivingTimeFromPrevious} min drive from previous
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/properties/${slot.propertyId}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {planMutation.isSuccess && routes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No shortlisted properties have inspections scheduled for this date.</p>
            <p className="text-sm mt-2">
              Add inspection times to shortlisted properties to use the planner.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/planner/page.tsx
git commit -m "feat: add inspection day planner page"
```

---

## Task 5.4: Add Navigation Links

**Files:**
- Modify: `src/app/properties/page.tsx`

**Step 1: Add navigation links to properties page header**

```typescript
// In src/app/properties/page.tsx
// Add to the header section, after AddPropertyDialog:

<div className="flex gap-2">
  <Button variant="outline" onClick={() => router.push("/compare")}>
    Compare
  </Button>
  <Button variant="outline" onClick={() => router.push("/planner")}>
    Day Planner
  </Button>
  <AddPropertyDialog />
</div>
```

**Step 2: Commit**

```bash
git add src/app/properties/page.tsx
git commit -m "feat: add navigation links to properties page"
```

---

## Task 5.5: Final Testing and Cleanup

**Step 1: Run the test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run the build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Manual testing checklist**

1. Filter Rules:
   - [ ] Create a new filter rule with expression `price < 400000`
   - [ ] Apply filter to properties list
   - [ ] Edit and delete filter rules

2. Comparison:
   - [ ] Navigate to /compare
   - [ ] Select two properties
   - [ ] Verify side-by-side display

3. Distance Calculations:
   - [ ] Click "Calculate Distances" on property detail
   - [ ] Verify distances are saved

4. Auto-fill:
   - [ ] Add a REA/Domain URL to a property
   - [ ] Click "Auto-fill from URL"
   - [ ] Review and apply extracted data

5. Day Planner:
   - [ ] Add inspection times to shortlisted properties
   - [ ] Navigate to /planner
   - [ ] Select a date and plan routes

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```

---

## Summary

This plan implements five post-v1 features:

1. **Custom Filtering Rules** (Tasks 1.1-1.7)
   - Database schema for filter rules
   - Expression parser with type checking
   - Management dialog with field picker
   - Filter dropdown on properties page

2. **Head-to-Head Comparison** (Tasks 2.1-2.2)
   - Dedicated comparison page at /compare
   - Side-by-side field comparison with highlighting
   - "Compare with..." button on property detail

3. **Google Maps Distance Calculations** (Tasks 3.1-3.5)
   - Distance to work, nearest station/supermarket/gym
   - Google Maps API integration
   - "Calculate Distances" button on property detail

4. **AI Auto-fill via OpenRouter** (Tasks 4.1-4.5)
   - OpenRouter API integration
   - Page content extraction
   - Preview dialog with diff view
   - Selective field application

5. **Inspection Day Planner** (Tasks 5.1-5.4)
   - Route optimization for inspection days
   - Multiple route options with trade-offs
   - Dedicated planner page at /planner

Total tasks: 22
Estimated commits: ~25
