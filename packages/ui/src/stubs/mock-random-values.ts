import { subtle } from 'node:crypto';

import { vi } from 'vitest';

export const mockRandomValues = (ids = [12345678]) => {
  vi.spyOn(globalThis, 'crypto', 'get').mockImplementation(
    () => ({ getRandomValues: () => ids, subtle }) as unknown as Crypto,
  );
};
