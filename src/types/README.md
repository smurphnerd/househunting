# Types

Type declaration files for third-party packages without TypeScript definitions.

## Overview

This directory is for `.d.ts` files that provide TypeScript definitions for packages that don't include them.

## When to Use

Create a `.d.ts` file here when:

1. A package doesn't have TypeScript types
2. `@types/package-name` doesn't exist on npm
3. You need to augment or fix existing types

## Example

```typescript
// node-custom-module.d.ts
declare module "node-custom-module" {
  export function doSomething(input: string): Promise<string>;

  export interface CustomOptions {
    timeout?: number;
    retries?: number;
  }

  export default function customModule(
    options?: CustomOptions
  ): void;
}
```

## Usage

Once defined, you can import the module with type safety:

```typescript
import customModule, { doSomething } from "node-custom-module";

const result = await doSomething("test"); // TypeScript knows the types
```

## Global Type Augmentation

To add global types or augment existing ones:

```typescript
// global.d.ts
declare global {
  interface Window {
    myCustomProperty: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      CUSTOM_VAR: string;
    }
  }
}

export {};
```

## Best Practices

- **Minimal Definitions**: Only define what you use
- **Accurate Types**: Match the actual runtime behavior
- **Documentation**: Add JSDoc comments for complex types
- **Official Types First**: Check npm for `@types/package` before creating your own
