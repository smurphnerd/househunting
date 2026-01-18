// src/lib/filterExpression.ts
// Filter expression parser and validator for property filtering

import type { PropertyDto } from "@/definitions/property";

// ============================================================================
// Type Definitions
// ============================================================================

export type FieldType = "number" | "boolean" | "string";

export interface FieldDefinition {
  name: string;
  type: FieldType;
}

// Define all filterable fields with their types
const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Number fields
  { name: "price", type: "number" },
  { name: "bedrooms", type: "number" },
  { name: "bathrooms", type: "number" },
  { name: "squareMetres", type: "number" },
  { name: "ageYears", type: "number" },
  { name: "previousPrice", type: "number" },
  { name: "carParkCost", type: "number" },
  { name: "bodyCorpFees", type: "number" },
  { name: "councilRates", type: "number" },
  { name: "estimatedRent", type: "number" },
  { name: "desksFit", type: "number" },
  { name: "floorLevel", type: "number" },
  { name: "overallImpression", type: "number" },

  // Boolean fields
  { name: "carParkIncluded", type: "boolean" },
  { name: "petsAllowed", type: "boolean" },
  { name: "storageIncluded", type: "boolean" },
  { name: "hasLaundrySpace", type: "boolean" },
  { name: "goodLighting", type: "boolean" },
  { name: "hasDishwasher", type: "boolean" },
  { name: "isQuiet", type: "boolean" },
  { name: "hasAircon", type: "boolean" },

  // String fields
  { name: "address", type: "string" },
  { name: "status", type: "string" },
  { name: "propertyType", type: "string" },
  { name: "aspect", type: "string" },
  { name: "stoveType", type: "string" },
  { name: "agentName", type: "string" },
  { name: "websiteUrl", type: "string" },
  { name: "notes", type: "string" },
  { name: "visibleIssues", type: "string" },
  { name: "postInspectionNotes", type: "string" },
];

// Build lookup map for field types
const FIELD_TYPE_MAP = new Map<string, FieldType>(
  FIELD_DEFINITIONS.map((f) => [f.name, f.type])
);

// ============================================================================
// Token Types
// ============================================================================

type TokenType =
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "OPERATOR"
  | "LOGICAL_AND"
  | "LOGICAL_OR"
  | "LOGICAL_NOT"
  | "LPAREN"
  | "RPAREN"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ============================================================================
// AST Node Types
// ============================================================================

export type ASTNode =
  | BinaryOpNode
  | UnaryOpNode
  | ComparisonNode
  | FieldNode
  | LiteralNode;

export interface BinaryOpNode {
  type: "BinaryOp";
  operator: "&&" | "||";
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  type: "UnaryOp";
  operator: "!";
  operand: ASTNode;
}

export interface ComparisonNode {
  type: "Comparison";
  operator: "==" | "!=" | "<" | ">" | "<=" | ">=";
  left: ASTNode;
  right: ASTNode;
}

export interface FieldNode {
  type: "Field";
  name: string;
}

export interface LiteralNode {
  type: "Literal";
  value: number | boolean | string;
  literalType: FieldType;
}

// ============================================================================
// Tokenizer
// ============================================================================

class Tokenizer {
  private input: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const char = this.input[this.position];

      // Two-character operators
      if (this.position + 1 < this.input.length) {
        const twoChar = this.input.slice(this.position, this.position + 2);
        if (twoChar === "&&") {
          this.tokens.push({
            type: "LOGICAL_AND",
            value: "&&",
            position: this.position,
          });
          this.position += 2;
          continue;
        }
        if (twoChar === "||") {
          this.tokens.push({
            type: "LOGICAL_OR",
            value: "||",
            position: this.position,
          });
          this.position += 2;
          continue;
        }
        if (twoChar === "==" || twoChar === "!=" || twoChar === "<=" || twoChar === ">=") {
          this.tokens.push({
            type: "OPERATOR",
            value: twoChar,
            position: this.position,
          });
          this.position += 2;
          continue;
        }
      }

      // Single character operators
      if (char === "<" || char === ">") {
        this.tokens.push({
          type: "OPERATOR",
          value: char,
          position: this.position,
        });
        this.position++;
        continue;
      }

      if (char === "!") {
        this.tokens.push({
          type: "LOGICAL_NOT",
          value: "!",
          position: this.position,
        });
        this.position++;
        continue;
      }

      if (char === "(") {
        this.tokens.push({
          type: "LPAREN",
          value: "(",
          position: this.position,
        });
        this.position++;
        continue;
      }

      if (char === ")") {
        this.tokens.push({
          type: "RPAREN",
          value: ")",
          position: this.position,
        });
        this.position++;
        continue;
      }

      // Numbers (including negative)
      if (this.isDigit(char) || (char === "-" && this.isDigit(this.peek(1)))) {
        this.readNumber();
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        this.readString(char);
        continue;
      }

      // Identifiers and boolean literals
      if (this.isAlpha(char)) {
        this.readIdentifier();
        continue;
      }

      throw new Error(`Unexpected character '${char}' at position ${this.position}`);
    }

    this.tokens.push({ type: "EOF", value: "", position: this.position });
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  private peek(offset: number = 0): string {
    return this.input[this.position + offset] || "";
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  private readNumber(): void {
    const startPos = this.position;
    let value = "";

    if (this.input[this.position] === "-") {
      value += "-";
      this.position++;
    }

    while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
    }

    // Handle decimals
    if (this.input[this.position] === "." && this.isDigit(this.peek(1))) {
      value += ".";
      this.position++;
      while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
        value += this.input[this.position];
        this.position++;
      }
    }

    this.tokens.push({ type: "NUMBER", value, position: startPos });
  }

  private readString(quote: string): void {
    const startPos = this.position;
    this.position++; // Skip opening quote
    let value = "";

    while (this.position < this.input.length && this.input[this.position] !== quote) {
      if (this.input[this.position] === "\\") {
        this.position++;
        if (this.position < this.input.length) {
          value += this.input[this.position];
          this.position++;
        }
      } else {
        value += this.input[this.position];
        this.position++;
      }
    }

    if (this.position >= this.input.length) {
      throw new Error(`Unterminated string starting at position ${startPos}`);
    }

    this.position++; // Skip closing quote
    this.tokens.push({ type: "STRING", value, position: startPos });
  }

  private readIdentifier(): void {
    const startPos = this.position;
    let value = "";

    while (this.position < this.input.length && this.isAlphaNumeric(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
    }

    // Check for boolean literals
    if (value === "true" || value === "false") {
      this.tokens.push({ type: "BOOLEAN", value, position: startPos });
    } else {
      this.tokens.push({ type: "IDENTIFIER", value, position: startPos });
    }
  }
}

// ============================================================================
// Parser (Recursive Descent)
// ============================================================================

class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const ast = this.parseOrExpression();
    if (!this.isAtEnd()) {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().position}`);
    }
    return ast;
  }

  // Grammar:
  // orExpr     -> andExpr ( "||" andExpr )*
  // andExpr    -> unaryExpr ( "&&" unaryExpr )*
  // unaryExpr  -> "!" unaryExpr | comparison
  // comparison -> primary ( ("==" | "!=" | "<" | ">" | "<=" | ">=") primary )?
  // primary    -> IDENTIFIER | NUMBER | BOOLEAN | STRING | "(" orExpr ")"

  private parseOrExpression(): ASTNode {
    let left = this.parseAndExpression();

    while (this.match("LOGICAL_OR")) {
      const right = this.parseAndExpression();
      left = { type: "BinaryOp", operator: "||", left, right };
    }

    return left;
  }

  private parseAndExpression(): ASTNode {
    let left = this.parseUnaryExpression();

    while (this.match("LOGICAL_AND")) {
      const right = this.parseUnaryExpression();
      left = { type: "BinaryOp", operator: "&&", left, right };
    }

    return left;
  }

  private parseUnaryExpression(): ASTNode {
    if (this.match("LOGICAL_NOT")) {
      const operand = this.parseUnaryExpression();
      return { type: "UnaryOp", operator: "!", operand };
    }

    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    const left = this.parsePrimary();

    if (this.check("OPERATOR")) {
      const operator = this.advance().value as ComparisonNode["operator"];
      const right = this.parsePrimary();
      return { type: "Comparison", operator, left, right };
    }

    return left;
  }

  private parsePrimary(): ASTNode {
    if (this.match("LPAREN")) {
      const expr = this.parseOrExpression();
      this.consume("RPAREN", "Expected ')' after expression");
      return expr;
    }

    if (this.check("NUMBER")) {
      const token = this.advance();
      return {
        type: "Literal",
        value: parseFloat(token.value),
        literalType: "number",
      };
    }

    if (this.check("BOOLEAN")) {
      const token = this.advance();
      return {
        type: "Literal",
        value: token.value === "true",
        literalType: "boolean",
      };
    }

    if (this.check("STRING")) {
      const token = this.advance();
      return {
        type: "Literal",
        value: token.value,
        literalType: "string",
      };
    }

    if (this.check("IDENTIFIER")) {
      const token = this.advance();
      return { type: "Field", name: token.value };
    }

    throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().position}`);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at position ${this.peek().position}`);
  }
}

// ============================================================================
// Type Checker
// ============================================================================

interface TypeCheckResult {
  valid: boolean;
  error?: string;
}

function typeCheckAST(node: ASTNode): TypeCheckResult {
  switch (node.type) {
    case "BinaryOp": {
      const leftResult = typeCheckAST(node.left);
      if (!leftResult.valid) return leftResult;
      const rightResult = typeCheckAST(node.right);
      if (!rightResult.valid) return rightResult;
      return { valid: true };
    }

    case "UnaryOp": {
      return typeCheckAST(node.operand);
    }

    case "Comparison": {
      // Check that both sides have compatible types
      const leftType = getNodeType(node.left);
      const rightType = getNodeType(node.right);

      if (leftType.error) return { valid: false, error: leftType.error };
      if (rightType.error) return { valid: false, error: rightType.error };

      // Type compatibility check
      if (leftType.type !== rightType.type) {
        return {
          valid: false,
          error: `type mismatch: cannot compare ${leftType.type} with ${rightType.type}`,
        };
      }

      // For boolean types, only == and != are valid
      if (leftType.type === "boolean" && !["==", "!="].includes(node.operator)) {
        return {
          valid: false,
          error: `Invalid operator '${node.operator}' for boolean comparison`,
        };
      }

      return { valid: true };
    }

    case "Field": {
      if (!FIELD_TYPE_MAP.has(node.name)) {
        return { valid: false, error: `Unknown field: '${node.name}'` };
      }
      return { valid: true };
    }

    case "Literal": {
      return { valid: true };
    }

    default:
      return { valid: false, error: "Unknown AST node type" };
  }
}

interface NodeTypeResult {
  type?: FieldType;
  error?: string;
}

function getNodeType(node: ASTNode): NodeTypeResult {
  switch (node.type) {
    case "Field": {
      const fieldType = FIELD_TYPE_MAP.get(node.name);
      if (!fieldType) {
        return { error: `Unknown field: '${node.name}'` };
      }
      return { type: fieldType };
    }

    case "Literal": {
      return { type: node.literalType };
    }

    case "Comparison":
    case "BinaryOp":
    case "UnaryOp":
      return { type: "boolean" };

    default:
      return { error: "Unknown node type" };
  }
}

// ============================================================================
// Evaluator
// ============================================================================

function evaluateAST(node: ASTNode, property: PropertyDto): boolean | number | string | null {
  switch (node.type) {
    case "BinaryOp": {
      const left = evaluateAST(node.left, property);
      // Short-circuit evaluation
      if (node.operator === "&&") {
        if (!left) return false;
        return Boolean(evaluateAST(node.right, property));
      }
      if (node.operator === "||") {
        if (left) return true;
        return Boolean(evaluateAST(node.right, property));
      }
      return false;
    }

    case "UnaryOp": {
      const operand = evaluateAST(node.operand, property);
      return !operand;
    }

    case "Comparison": {
      const left = evaluateAST(node.left, property);
      const right = evaluateAST(node.right, property);

      // Handle null values - comparisons with null return false
      if (left === null || right === null) {
        return false;
      }

      switch (node.operator) {
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case "<":
          return (left as number) < (right as number);
        case ">":
          return (left as number) > (right as number);
        case "<=":
          return (left as number) <= (right as number);
        case ">=":
          return (left as number) >= (right as number);
        default:
          return false;
      }
    }

    case "Field": {
      const value = property[node.name as keyof PropertyDto];
      // Convert dates and other types to null for now
      if (value instanceof Date) {
        return null;
      }
      return value as boolean | number | string | null;
    }

    case "Literal": {
      return node.value;
    }

    default:
      return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a filter expression string into an AST
 */
export function parseFilterExpression(expression: string): ASTNode {
  const tokenizer = new Tokenizer(expression);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Validate a filter expression for syntax and type correctness
 */
export function validateFilterExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const ast = parseFilterExpression(expression);
    return typeCheckAST(ast);
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
}

/**
 * Evaluate a filter expression against a property
 * Returns true if the property matches the filter, false otherwise
 */
export function evaluateFilter(expression: string, property: PropertyDto): boolean {
  try {
    const ast = parseFilterExpression(expression);
    const result = evaluateAST(ast, property);
    return Boolean(result);
  } catch {
    // If parsing fails, return false (property doesn't match)
    return false;
  }
}

/**
 * Get all filterable fields with their types
 */
export function getFilterableFields(): { name: string; type: string }[] {
  return FIELD_DEFINITIONS.map((f) => ({ name: f.name, type: f.type }));
}
