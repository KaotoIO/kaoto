import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';

import { ITile } from '../Catalog';
import { PropertiesModal } from './PropertiesModal';

describe('Component tile', () => {
  const tile: ITile = {
    type: 'component',
    name: 'atom',
    title: 'Atom',
    description: 'Poll Atom RSS feeds.',
    headerTags: ['Stable'],
    tags: ['document', '4.0.0'],
    rawObject: {
      component: {
        kind: 'component',
        name: 'atom',
        title: 'Atom',
        description: 'Poll Atom RSS feeds.',
      },
      properties: {
        bridgeErrorHandler: {
          kind: 'property',
          displayName: 'Bridge Error Handler',
          required: false,
          type: 'boolean',
          defaultValue: false,
          description: 'Allows for bridging the consumer to the Camel',
        },
      },
    },
  };

  it('renders property modal correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    expect(baseElement).toMatchSnapshot();

    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Atom');
    expect(screen.getByTestId('properties-modal-table-description')).toBeInTheDocument();
    expect(screen.getByTestId('properties-modal-table-description')).toHaveTextContent('Poll Atom RSS feeds.');
    expect(screen.getByTestId('properties-modal-table-caption')).toBeInTheDocument();
    expect(screen.getByTestId('properties-modal-table-caption')).toHaveTextContent('Available properties (1)');
    // headers
    expect(screen.getByTestId('header-name')).toBeInTheDocument();
    expect(screen.getByTestId('header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('header-type')).toBeInTheDocument();
    expect(screen.getByTestId('header-type')).toHaveTextContent('type');
    expect(screen.getByTestId('header-kind')).toBeInTheDocument();
    expect(screen.getByTestId('header-kind')).toHaveTextContent('kind');
    expect(screen.getByTestId('header-required')).toBeInTheDocument();
    expect(screen.getByTestId('header-required')).toHaveTextContent('required');
    expect(screen.getByTestId('header-defaultValue')).toBeInTheDocument();
    expect(screen.getByTestId('header-defaultValue')).toHaveTextContent('defaultValue');
    expect(screen.getByTestId('header-description')).toBeInTheDocument();
    expect(screen.getByTestId('header-description')).toHaveTextContent('description');
    // row
    expect(screen.getByTestId('row-0-cell-name')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-name')).toHaveTextContent('Bridge Error Handler');
    expect(screen.getByTestId('row-0-cell-type')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-type')).toHaveTextContent('boolean');
    expect(screen.getByTestId('row-0-cell-kind')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-kind')).toHaveTextContent('property');
    expect(screen.getByTestId('row-0-cell-required')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-required')).toHaveTextContent('false');
    expect(screen.getByTestId('row-0-cell-defaultValue')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-defaultValue')).toHaveTextContent('false');
    expect(screen.getByTestId('row-0-cell-description')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-description')).toHaveTextContent(
      'Allows for bridging the consumer to the Camel',
    );
  });
});

describe('Model tile with empty properties', () => {
  const tile: ITile = {
    type: 'model',
    name: 'apiKey',
    title: 'Api Key',
    description: 'Rest security basic auth definition',
    headerTags: ['Stable'],
    tags: ['document', '4.0.0'],
    rawObject: {
      model: {
        kind: 'model',
        name: 'apiKey',
        title: 'Api Key',
        description: 'Rest security basic auth definition',
      },
      properties: {},
    },
  };

  it('renders property modal correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    expect(baseElement).toMatchSnapshot();

    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Api Key');
    expect(screen.getByTestId('properties-modal-table-description')).toBeInTheDocument();
    expect(screen.getByTestId('properties-modal-table-description')).toHaveTextContent(
      'Rest security basic auth definition',
    );
    expect(screen.getByTestId('properties-modal-table-caption')).toBeInTheDocument();
    expect(screen.getByTestId('properties-modal-table-caption')).toHaveTextContent('Available properties (0)');
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

describe('Kamelet tile', () => {
  const tile: ITile = {
    type: 'kamelet',
    name: 'aws-ddb-streams-source',
    title: 'AWS DynamoDB Streams Source',
    description: 'Receive events from Amazon DynamoDB Streams.',
    headerTags: ['Stable'],
    tags: ['source', '4.0.0-RC1'],
    rawObject: {
      apiVersion: 'camel.apache.org/v1alpha1',
      kind: 'Kamelet',
      metadata: {
        name: 'aws-ddb-streams-source',
      },
      spec: {
        definition: {
          title: 'AWS DynamoDB Streams Source',
          description: 'Receive events',
          required: ['table'],
          type: 'object',
          properties: {
            table: {
              title: 'Table',
              description: 'The name of the DynamoDB table.',
              type: 'string',
            },
            key: {
              title: 'Key',
              description: 'New key',
              type: 'string',
              default: 'amazonaws.com',
            },
          },
        },
      },
    },
  };

  it('renders property modal correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    expect(baseElement).toMatchSnapshot();

    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent(
      'AWS DynamoDB Streams Source',
    );
    expect(screen.getByTestId('properties-modal-table-description')).toBeInTheDocument();
    expect(screen.getByTestId('properties-modal-table-description')).toHaveTextContent('Receive events');
    expect(screen.getByTestId('properties-modal-table-caption')).toBeInTheDocument();
    expect(screen.getByTestId('properties-modal-table-caption')).toHaveTextContent('Available properties (2)');
    // headers
    expect(screen.getByTestId('header-name')).toBeInTheDocument();
    expect(screen.getByTestId('header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('header-type')).toBeInTheDocument();
    expect(screen.getByTestId('header-type')).toHaveTextContent('type');
    expect(screen.getByTestId('header-required')).toBeInTheDocument();
    expect(screen.getByTestId('header-required')).toHaveTextContent('required');
    expect(screen.getByTestId('header-defaultValue')).toBeInTheDocument();
    expect(screen.getByTestId('header-defaultValue')).toHaveTextContent('defaultValue');
    expect(screen.getByTestId('header-description')).toBeInTheDocument();
    expect(screen.getByTestId('header-description')).toHaveTextContent('description');
    // row
    expect(screen.getByTestId('row-0-cell-name')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-name')).toHaveTextContent('Table');
    expect(screen.getByTestId('row-0-cell-type')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-type')).toHaveTextContent('string');
    expect(screen.getByTestId('row-0-cell-required')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-required')).toHaveTextContent('true');
    expect(screen.getByTestId('row-0-cell-defaultValue')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-defaultValue')).toHaveTextContent('');
    expect(screen.getByTestId('row-0-cell-description')).toBeInTheDocument();
    expect(screen.getByTestId('row-0-cell-description')).toHaveTextContent('The name of the DynamoDB table.');
    expect(screen.getByTestId('row-1-cell-name')).toBeInTheDocument();
    expect(screen.getByTestId('row-1-cell-name')).toHaveTextContent('Key');
    expect(screen.getByTestId('row-1-cell-type')).toBeInTheDocument();
    expect(screen.getByTestId('row-1-cell-type')).toHaveTextContent('string');
    expect(screen.getByTestId('row-1-cell-required')).toBeInTheDocument();
    expect(screen.getByTestId('row-1-cell-required')).toHaveTextContent('false');
    expect(screen.getByTestId('row-1-cell-defaultValue')).toBeInTheDocument();
    expect(screen.getByTestId('row-1-cell-defaultValue')).toHaveTextContent('amazonaws.com');
    expect(screen.getByTestId('row-1-cell-description')).toBeInTheDocument();
    expect(screen.getByTestId('row-1-cell-description')).toHaveTextContent('New key');
  });
});

describe('Unknown tile', () => {
  const tile: ITile = {
    type: 'tile-type',
    name: 'tile-name',
    title: 'tile-title',
    description: 'tile-description',
    tags: ['tag1', 'tag2'],
    headerTags: ['header-tag1', 'header-tag2'],
    rawObject: {},
  };

  // it suppresses error in the console.log since it is expected
  const consoleErrorFn = jest.spyOn(console, 'error').mockImplementation(() => jest.fn());

  afterAll(() => {
    consoleErrorFn.mockRestore()
  });

  it('fires error for property modal', () => {
    
    expect(() => render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />)).toThrow(
      'Unknown CatalogKind during rendering modal: tile-type',
    );
  });
});
