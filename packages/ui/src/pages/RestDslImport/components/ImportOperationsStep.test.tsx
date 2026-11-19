import { fireEvent, render, screen } from '@testing-library/react';

import { createWizardState } from '../rest-import-test-utils';
import { ImportOperation } from '../RestDslImportTypes';
import { ImportOperationsStep } from './ImportOperationsStep';

const operation = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
  operationId: 'getPet',
  method: 'get',
  path: '/pet',
  selected: true,
  routeExists: false,
  ...overrides,
});

describe('ImportOperationsStep', () => {
  it('renders the import options and forwards toggles', () => {
    const wizard = createWizardState();
    render(<ImportOperationsStep wizard={wizard} />);

    const createRest = screen.getByLabelText('Create Rest DSL operations');
    const createRoutes = screen.getByLabelText('Create routes with direct endpoints');
    expect(createRest).not.toBeChecked();
    expect(createRoutes).toBeChecked();

    fireEvent.click(createRest);
    fireEvent.click(createRoutes);

    expect(wizard.setImportCreateRest).toHaveBeenCalledWith(true);
    expect(wizard.setImportCreateRoutes).toHaveBeenCalledWith(false);
  });

  it('does not render the operations list when there are no operations', () => {
    render(<ImportOperationsStep wizard={createWizardState()} />);

    expect(screen.queryByLabelText('Select all operations')).not.toBeInTheDocument();
  });

  it('renders operations, forwards toggles and disables operations whose route exists', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [
        operation(),
        operation({ operationId: 'addPet', method: 'post', routeExists: true, selected: false }),
      ],
    });
    render(<ImportOperationsStep wizard={wizard} />);

    fireEvent.click(screen.getByLabelText('Select all operations'));
    expect(wizard.handleToggleSelectAllOperations).toHaveBeenCalledWith(false);

    const getPet = screen.getByLabelText('GET /pet');
    expect(getPet).toBeChecked();
    fireEvent.click(getPet);
    expect(wizard.handleToggleOperation).toHaveBeenCalledWith('getPet', 'get', '/pet', false);

    const addPet = screen.getByLabelText('POST /pet - Route exists');
    expect(addPet).toBeDisabled();
    expect(addPet).not.toBeChecked();
  });

  it('marks "Select all operations" as partially checked when only some operations are selected', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [operation(), operation({ operationId: 'addPet', method: 'post', selected: false })],
    });
    render(<ImportOperationsStep wizard={wizard} />);

    expect(screen.getByLabelText('Select all operations')).toBePartiallyChecked();
  });

  it('shows the import validation error as an alert while the specification is parsed', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [operation({ selected: false })],
      importStatus: { type: 'error', message: 'Import failed. Select at least one operation.' },
    });
    render(<ImportOperationsStep wizard={wizard} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Import failed. Select at least one operation.');
  });

  it('does not show a parse error that belongs to the Specification step', () => {
    const wizard = createWizardState({ importStatus: { type: 'error', message: 'Invalid OpenAPI specification.' } });
    render(<ImportOperationsStep wizard={wizard} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables "Select all operations" when every operation already has a route', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [
        operation({ routeExists: true, selected: false }),
        operation({ operationId: 'addPet', method: 'post', routeExists: true, selected: false }),
      ],
    });
    render(<ImportOperationsStep wizard={wizard} />);

    expect(screen.getByLabelText('Select all operations')).toBeDisabled();
  });

  it('keeps "Select all operations" enabled when at least one operation can be selected', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [operation(), operation({ operationId: 'addPet', method: 'post', routeExists: true })],
    });
    render(<ImportOperationsStep wizard={wizard} />);

    expect(screen.getByLabelText('Select all operations')).toBeEnabled();
  });

  it('gives each operation its own checkbox id, even when an operationId looks like a generated fallback', () => {
    const wizard = createWizardState({
      isOpenApiParsed: true,
      importOperations: [
        operation({ operationId: 'get-/a', path: '/a' }),
        operation({ operationId: 'get-/a', path: '/b' }),
      ],
    });
    render(<ImportOperationsStep wizard={wizard} />);

    fireEvent.click(screen.getByLabelText('GET /b'));

    expect(wizard.handleToggleOperation).toHaveBeenCalledWith('get-/a', 'get', '/b', false);
  });

  it('labels the operations list as a region', () => {
    render(
      <ImportOperationsStep
        wizard={createWizardState({ isOpenApiParsed: true, importOperations: [operation({ routeExists: true })] })}
      />,
    );

    expect(screen.getByRole('region', { name: 'REST operations' })).toBeInTheDocument();
  });
});
