import '@testing-library/jest-dom';
// import '@testing-library/jest-dom/extend-expect'

beforeAll(() => {
  jest
    .spyOn(global, 'crypto', 'get')
    .mockImplementation(() => ({ getRandomValues: () => [12345678] }) as unknown as Crypto);
});
