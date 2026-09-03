import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProjectConfigPage from './ProjectConfigPage';

describe('ProjectConfigPage', () => {
  it('renders its own content without a project banner or explorer', () => {
    render(<ProjectConfigPage />);
    expect(screen.getByTestId('project-config-page')).toBeInTheDocument();
    expect(screen.queryByTestId('project-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('explorer')).not.toBeInTheDocument();
  });
});
