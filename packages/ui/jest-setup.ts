import '@testing-library/jest-dom';
import { FilterDOMPropsKeys, filterDOMProps } from 'uniforms';
// import '@testing-library/jest-dom/extend-expect'

filterDOMProps.register('inputRef' as FilterDOMPropsKeys, 'placeholder' as FilterDOMPropsKeys);

jest
  .spyOn(global, 'crypto', 'get')
  .mockImplementation(() => ({ getRandomValues: () => [12345678] }) as unknown as Crypto);

jest.spyOn(console, 'warn').mockImplementation((...args) => {
  if (
    args[0].toString().includes('[mobx-react-lite] importing batchingForReactDom is no longer needed') ||
    args[0].toString().includes('NODE_ENV is not defined')
  ) {
    return;
  }

  console.log(...args);
});
