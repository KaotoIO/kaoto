import { fireEvent, render, screen } from '@testing-library/react';

import { createWizardState } from '../rest-import-test-utils';
import { ImportOperation } from '../RestDslImportTypes';
import { ImportSpecificationStep } from './ImportSpecificationStep';

const operation = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
  operationId: 'getPet',
  method: 'get',
  path: '/pet',
  selected: true,
  routeExists: false,
  ...overrides,
});

describe('ImportSpecificationStep', () => {
  it('renders the specification text area and forwards changes', () => {
    const wizard = createWizardState({ openApiSpecText: 'openapi: 3.0.0' });
    render(<ImportSpecificationStep wizard={wizard} />);

    const textarea = screen.getByRole('textbox', { name: 'OpenAPI Specification' });
    expect(textarea).toHaveValue('openapi: 3.0.0');

    fireEvent.change(textarea, { target: { value: 'openapi: 3.1.0' } });
    expect(wizard.setOpenApiSpecText).toHaveBeenCalledWith('openapi: 3.1.0');
  });

  it('parses the specification when the button is clicked', () => {
    const wizard = createWizardState();
    render(<ImportSpecificationStep wizard={wizard} />);

    fireEvent.click(screen.getByRole('button', { name: 'Parse Specification' }));

    expect(wizard.handleParseOpenApiSpec).toHaveBeenCalled();
  });

  it('shows no notification before the first parse', () => {
    render(<ImportSpecificationStep wizard={createWizardState()} />);

    expect(screen.queryByText('Specification parsed successfully.')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid OpenAPI specification.')).not.toBeInTheDocument();
  });

  it('shows the operation count once the specification is parsed', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [operation(), operation({ operationId: 'addPet', method: 'post' })],
    });
    render(<ImportSpecificationStep wizard={wizard} />);

    expect(screen.getByText('Specification parsed successfully.')).toBeInTheDocument();
    expect(screen.getByText('2 operations found.')).toBeInTheDocument();
  });

  it('uses the singular for a single operation', () => {
    render(
      <ImportSpecificationStep
        wizard={createWizardState({ isOpenApiParsed: true, importOperations: [operation()] })}
      />,
    );

    expect(screen.getByText('1 operation found.')).toBeInTheDocument();
  });

  it('shows the parse error with a hint while the specification is not parsed', () => {
    const wizard = createWizardState({ parseError: 'Invalid OpenAPI specification.' });
    render(<ImportSpecificationStep wizard={wizard} />);

    expect(screen.getByText('Invalid OpenAPI specification.')).toBeInTheDocument();
    expect(screen.getByText(/select Parse Specification again/)).toBeInTheDocument();
  });

  it('does not show an import error as a parse error', () => {
    const wizard = createWizardState({
      importStatus: { type: 'error', message: 'Import failed. Select at least one operation.' },
    });
    render(<ImportSpecificationStep wizard={wizard} />);

    expect(screen.queryByText('Import failed. Select at least one operation.')).not.toBeInTheDocument();
    expect(screen.queryByText(/select Parse Specification again/)).not.toBeInTheDocument();
  });

  it('does not show a stale parse error once the specification is parsed', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [operation()],
      parseError: 'Invalid OpenAPI specification.',
    });
    render(<ImportSpecificationStep wizard={wizard} />);

    expect(screen.queryByText('Invalid OpenAPI specification.')).not.toBeInTheDocument();
  });
});
