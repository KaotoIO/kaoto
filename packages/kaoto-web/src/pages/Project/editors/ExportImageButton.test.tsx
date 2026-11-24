import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExportImageButton } from './ExportImageButton';

describe('ExportImageButton', () => {
  it('exports the image when it is clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportImageButton canExport isExporting={false} onExport={onExport} />);

    await user.click(screen.getByRole('button', { name: 'Export as image' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['there is nothing to export', false, false],
    ['an export is running', true, true],
  ])('is disabled while %s', (_case, canExport, isExporting) => {
    render(<ExportImageButton canExport={canExport} isExporting={isExporting} onExport={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Export as image' })).toBeDisabled();
  });
});
