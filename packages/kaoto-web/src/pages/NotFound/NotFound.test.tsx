import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import NotFound from './NotFound';

const renderNotFound = (path = '/unknown') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NotFound', () => {
  it('renders the "Page not found" heading', () => {
    renderNotFound();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('renders the descriptive paragraph', () => {
    renderNotFound();
    expect(screen.getByText('This is not the page you were looking for.')).toBeInTheDocument();
  });

  it('renders the unrecognized route path', () => {
    renderNotFound('/some/weird/path');
    expect(screen.getByText(/\/some\/weird\/path/)).toBeInTheDocument();
  });

  it('renders the maintainer notice', () => {
    renderNotFound();
    expect(screen.getByText('Maintained by fed-at-ibm, a chapter of the OIC.')).toBeInTheDocument();
  });
});
