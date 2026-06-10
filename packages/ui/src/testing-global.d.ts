/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';

import type { Mock, MockInstance as VitestMockInstance } from 'vitest';

// Provide global type aliases for Jest-to-Vitest migration compatibility
declare global {
  // SpyInstance is available via vitest/globals but may need explicit typing in some contexts
  type SpyInstance<T extends (...args: any) => any = (...args: any) => any> = VitestMockInstance<
    Parameters<T>,
    ReturnType<T>
  >;

  // MockInstance is a Jest type - map to Vitest's MockInstance
  type MockInstance<T extends (...args: any) => any = (...args: any) => any> = VitestMockInstance<
    Parameters<T>,
    ReturnType<T>
  >;

  // MockedFunction is a Jest type - map to Vitest's Mock
  type MockedFunction<T extends (...args: any) => any> = Mock<Parameters<T>, ReturnType<T>>;

  // Mocked is a Jest utility type - provide a simplified version for Vitest
  type Mocked<T> = T & {
    [K in keyof T]: T[K] extends (...args: any) => any ? Mock<Parameters<T[K]>, ReturnType<T[K]>> : T[K];
  };

  // fail is a Jest global function - add it for test compatibility
  function fail(message?: string): never;
}
