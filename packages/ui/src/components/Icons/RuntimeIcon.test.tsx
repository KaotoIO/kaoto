import { render, screen } from '@testing-library/react';

import { getRuntimeIcon } from './RuntimeIcon';

describe('getRuntimeIcon', () => {
  it.each([
    ['Main', 'Apache Camel logo'],
    ['Camel Main 4.0.0', 'Apache Camel logo'],
    ['Unknown Runtime', 'Apache Camel logo'],
    ['Citrus', 'Citrus logo'],
    ['Citrus 1.0.0', 'Citrus logo'],
    ['Quarkus', 'Quarkus logo'],
    ['Camel Quarkus 3.0.0', 'Quarkus logo'],
    ['Spring Boot', 'Spring Boot logo'],
    ['CamelSpringBoot3.0.0', 'Spring Boot logo'],
    ['Camel Main 4.0.0.redhat-00001', 'Red Hat logo'],
    ['anything-with-redhat-in-name', 'Red Hat logo'],
  ])('returns correct icon for "%s"', (input, expectedAlt) => {
    render(getRuntimeIcon(input));
    expect(screen.getByAltText(expectedAlt)).toBeInTheDocument();
  });
});
