export const promiseTimeout: <T>(promise: Promise<T>, timeout: number, defaultValue?: T) => Promise<T> = <T>(
  promise: Promise<T>,
  timeout: number,
  defaultValue?: T,
) => {
  let timer: number;

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (defaultValue !== undefined) resolve(defaultValue);

      reject(new Error('Promise timed out'));
    }, timeout) as unknown as number;
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};
