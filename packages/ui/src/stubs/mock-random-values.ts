import { subtle } from 'node:crypto';

export const mockRandomValues = (ids = [12345678]) => {
  vi.spyOn(globalThis, 'crypto', 'get').mockImplementation(
    () => ({ getRandomValues: () => ids, subtle }) as unknown as Crypto,
  );
};
