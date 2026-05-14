import { render } from '@testing-library/react';

import { getRuntimeIcon } from './RuntimeIcon';

describe('getRuntimeIcon', () => {
  it.each([
    ['Main', 'Apache Camel logo'],
    ['Camel Main 4.0.0', 'Apache Camel logo'],
    ['Unknown Runtime', 'Apache Camel logo'],
  ])('returns Camel icon for %s', (input, expectedAlt) => {
    const { container } = render(getRuntimeIcon(input));
    const img = container.querySelector('img');
    expect(img?.alt).toBe(expectedAlt);
  });

  it.each([
    ['Citrus', 'Citrus logo'],
    ['Citrus 1.0.0', 'Citrus logo'],
  ])('returns Citrus icon for %s', (input, expectedAlt) => {
    const { container } = render(getRuntimeIcon(input));
    const img = container.querySelector('img');
    expect(img?.alt).toBe(expectedAlt);
  });

  it.each([
    ['Quarkus', 'Quarkus logo'],
    ['Camel Quarkus 3.0.0', 'Quarkus logo'],
  ])('returns Quarkus icon for %s', (input, expectedAlt) => {
    const { container } = render(getRuntimeIcon(input));
    const img = container.querySelector('img');
    expect(img?.alt).toBe(expectedAlt);
  });

  it.each([
    ['Spring Boot', 'Spring Boot logo'],
    ['CamelSpringBoot3.0.0', 'Spring Boot logo'],
  ])('returns Spring Boot icon for %s', (input, expectedAlt) => {
    const { container } = render(getRuntimeIcon(input));
    const img = container.querySelector('img');
    expect(img?.alt).toBe(expectedAlt);
  });

  it.each([
    ['Camel Main 4.0.0.redhat-00001', 'Red Hat logo'],
    ['anything-with-redhat-in-name', 'Red Hat logo'],
  ])('returns Red Hat icon for %s', (input, expectedAlt) => {
    const { container } = render(getRuntimeIcon(input));
    const img = container.querySelector('img');
    expect(img?.alt).toBe(expectedAlt);
  });
});
