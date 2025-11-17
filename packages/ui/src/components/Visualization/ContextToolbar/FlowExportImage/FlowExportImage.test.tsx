import { render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { SourceCodeProvider } from '../../../../providers/source-code.provider';
import { FlowExportImage } from './FlowExportImage';

const wrapper = ({ children }: PropsWithChildren) => <SourceCodeProvider>{children}</SourceCodeProvider>;

describe('FlowExportImage.tsx', () => {
  beforeEach(() => render(<FlowExportImage />, { wrapper }));

  afterEach(() => jest.clearAllMocks());

  it('should be render', () => {
    const exportButton = screen.getByTestId('exportImageButton');

    expect(exportButton).toBeInTheDocument();
  });
});
