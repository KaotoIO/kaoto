import { fireEvent, render, screen } from '@testing-library/react';

import { createWizardState } from '../rest-import-test-utils';
import { ImportSourceStep } from './ImportSourceStep';

describe('ImportSourceStep', () => {
  const onOpenSettings = vi.fn();

  beforeEach(() => {
    onOpenSettings.mockClear();
  });

  it('renders the three import sources with the current one selected', () => {
    render(<ImportSourceStep wizard={createWizardState({ importSource: 'file' })} onOpenSettings={onOpenSettings} />);

    expect(screen.getByLabelText('Upload file')).toBeChecked();
    expect(screen.getByLabelText('Import from URI')).not.toBeChecked();
    expect(screen.getByLabelText('Import from Apicurio')).not.toBeChecked();
  });

  it('notifies the wizard when the source changes', () => {
    const wizard = createWizardState();
    render(<ImportSourceStep wizard={wizard} onOpenSettings={onOpenSettings} />);

    fireEvent.click(screen.getByLabelText('Import from URI'));

    expect(wizard.handleImportSourceChange).toHaveBeenCalledWith('uri');
  });

  it('shows the file uploader for the file source', () => {
    render(<ImportSourceStep wizard={createWizardState({ importSource: 'file' })} onOpenSettings={onOpenSettings} />);

    expect(screen.getByRole('button', { name: 'Drag and drop files here or click to upload' })).toBeInTheDocument();
  });

  it('shows the URI field for the URI source', () => {
    render(<ImportSourceStep wizard={createWizardState({ importSource: 'uri' })} onOpenSettings={onOpenSettings} />);

    expect(screen.getByPlaceholderText('https://example.com/openapi.yaml')).toBeInTheDocument();
  });

  it('warns when the Apicurio registry is not configured and opens the settings', () => {
    render(
      <ImportSourceStep wizard={createWizardState({ importSource: 'apicurio' })} onOpenSettings={onOpenSettings} />,
    );

    expect(screen.getByText(/Configure the Apicurio Registry URL in Settings/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));

    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('shows the file already loaded when the step is revisited', () => {
    const wizard = createWizardState({
      importSource: 'file',
      isOpenApiParsed: true,
      openApiLoadSource: 'file',
      sourceIdentifier: 'spec.json',
    });
    render(<ImportSourceStep wizard={wizard} onOpenSettings={onOpenSettings} />);

    expect(screen.getByText('spec.json')).toBeInTheDocument();
  });

  it('discards the parsed specification when the file is removed', () => {
    const wizard = createWizardState({
      importSource: 'file',
      isOpenApiParsed: true,
      openApiLoadSource: 'file',
      sourceIdentifier: 'spec.json',
    });
    render(<ImportSourceStep wizard={wizard} onOpenSettings={onOpenSettings} />);

    fireEvent.click(screen.getByRole('button', { name: /remove file/i }));

    expect(wizard.handleSourceCleared).toHaveBeenCalled();
  });

  it('keeps the URI typed by the user when the step is revisited', () => {
    const wizard = createWizardState({ importSource: 'uri', importUri: 'http://example.com/spec.yaml' });
    render(<ImportSourceStep wizard={wizard} onOpenSettings={onOpenSettings} />);

    expect(screen.getByRole('textbox')).toHaveValue('http://example.com/spec.yaml');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://example.com/other.yaml' } });

    expect(wizard.setImportUri).toHaveBeenCalledWith('http://example.com/other.yaml');
  });
});
