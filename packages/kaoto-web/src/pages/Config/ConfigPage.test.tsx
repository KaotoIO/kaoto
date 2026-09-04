import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ConfigPage from './ConfigPage';

describe('ConfigPage', () => {
  it('renders the config page sentinel', () => {
    render(<ConfigPage />);
    expect(screen.getByTestId('config-page')).toBeInTheDocument();
  });
});
