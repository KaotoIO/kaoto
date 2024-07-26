import { promiseTimeout } from './promise-timeout';

describe('promiseTimeout', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should resolve the promise if it resolves before the timeout', async () => {
    const promise = Promise.resolve('foo');
    const result = await promiseTimeout(promise, 1_000);

    expect(result).toBe('foo');
  });

  it('should reject the promise if it rejects before the timeout', async () => {
    const promise = Promise.reject(new Error('bar'));

    await expect(promiseTimeout(promise, 1_000)).rejects.toThrow('bar');
  });

  it('should resolve the promise with the defaultValue when provided, if it takes longer than the timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve('baz');
      }, 1_000);
    });

    const promiseTimeoutResult = promiseTimeout(promise, 500, 'Lighting fast');

    jest.advanceTimersByTime(500);

    const result = await promiseTimeoutResult;

    expect(result).toBe('Lighting fast');
  });

  it('should reject the promise if it takes longer than the timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve('baz');
      }, 1_000);
    });

    const promiseTimeoutResult = promiseTimeout(promise, 500);

    jest.advanceTimersByTime(500);

    await expect(promiseTimeoutResult).rejects.toThrow('Promise timed out');
  });
});
