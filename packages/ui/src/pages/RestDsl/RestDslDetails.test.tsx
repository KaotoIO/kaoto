import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('@kaoto/forms', () => ({
  CanvasFormTabsContext: React.createContext({}),
  FieldWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="field-wrapper">{children}</div>,
  KaotoForm: jest.fn((props) => (
    <div data-testid="kaoto-form" data-schema={JSON.stringify(props.schema)} data-model={JSON.stringify(props.model)} />
  )),
  Typeahead: (props: { 'data-testid'?: string }) => <div data-testid={props['data-testid'] ?? 'typeahead'} />,
}));

import { RestDslDetails } from './RestDslDetails';
import { RestEditorSelection } from './restDslTypes';

jest.mock('../../components/Visualization/Canvas/Form/suggestions/SuggestionsProvider', () => ({
  SuggestionRegistrar: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../components/Visualization/Canvas/Form/fields/custom-fields-factory', () => ({
  customFieldsFactoryfactory: jest.fn(),
}));

const baseProps = {
  formKey: 'form-1',
  selection: undefined as RestEditorSelection | undefined,
  formTabsValue: {} as never,
  toUriFieldRef: { current: null },
  directEndpointItems: [],
  toUriValue: '',
  directRouteExists: false,
  onToUriChange: jest.fn(),
  onToUriClear: jest.fn(),
  onCreateDirectRoute: jest.fn(),
  onChangeProp: jest.fn(),
};

describe('RestDslDetails', () => {
  it('renders empty state when nothing is selected', () => {
    render(<RestDslDetails {...baseProps} />);

    expect(screen.getByText('Nothing selected')).toBeInTheDocument();
    expect(screen.getByText('Select a Rest element to start editing.')).toBeInTheDocument();
  });

  it('renders form and operation controls when selection is an operation', () => {
    const selectedFormState = {
      title: 'Rest Operation',
      path: 'rest.get.0',
      omitFields: [],
      entity: {
        getNodeSchema: jest.fn(() => ({ title: 'schema' })),
        getNodeDefinition: jest.fn(() => ({ id: 'op-1' })),
        getRootPath: jest.fn(() => 'rest.get.0'),
        updateModel: jest.fn(),
      },
    };

    render(
      <RestDslDetails
        {...baseProps}
        selectedFormState={selectedFormState}
        selection={{ kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 }}
        toUriValue=""
        directRouteExists={false}
      />,
    );

    expect(screen.getByText('Rest Operation')).toBeInTheDocument();
    expect(screen.getByTestId('rest-operation-to-uri')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Route' })).toBeDisabled();
    expect(screen.getByTestId('kaoto-form')).toBeInTheDocument();
  });

  it('enables Create Route when a to-uri is set and no route exists', () => {
    const selectedFormState = {
      title: 'Rest Operation',
      path: 'rest.get.0',
      omitFields: [],
      entity: {
        getNodeSchema: jest.fn(() => ({})),
        getNodeDefinition: jest.fn(() => ({})),
        getRootPath: jest.fn(() => 'rest.get.0'),
        updateModel: jest.fn(),
      },
    };

    render(
      <RestDslDetails
        {...baseProps}
        selectedFormState={selectedFormState}
        selection={{ kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 }}
        toUriValue="direct:test"
        directRouteExists={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create Route' })).toBeEnabled();
  });
});
