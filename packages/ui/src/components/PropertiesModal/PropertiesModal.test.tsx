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
      componentProperties: {
        bridgeErrorHandler: {
          kind: 'property',
          displayName: 'Bridge Error Handler',
          group: 'common',
          required: true,
          javaType: 'java.lang.String',
          description: 'Allows for bridging the consumer to the Camel',
        },
      },
      properties: {
        name: {
          kind: 'path',
          group: 'common',
          required: true,
          javaType: 'java.lang.String',
          description: 'Name of component',
        },
        hostname: {
          kind: 'parameter',
          group: 'advanced',
          required: false,
          javaType: 'java.lang.String',
          defaultValue: 'http',
          description: 'The hostname of the asterisk server',
        },
      },
      headers: {
        CamelAsteriskEventName: {
          kind: 'header',
          displayName: '',
          group: 'producer',
          description: 'The hostname of the asterisk server',
          javaType: 'org.apache.camel.spi.ExceptionHandler',
        },
      },
      apis: {
        client: {
          consumerOnly: true,
          producerOnly: true,
          description: 'Client api',
          methods: {
            send: {
              description: 'Client send',
              signatures: [''],
            },
          },
        },
        client2: {
          consumerOnly: false,
          producerOnly: true,
          description: 'Client2 api',
          methods: {
            send: {
              description: 'Client2 send',
              signatures: [''],
            },
          },
        },
      },
      apiProperties: {},
    },
  };

  it('renders component properties table correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Atom');
    expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Poll Atom RSS feeds.');
    // tab 0
    expect(screen.getByTestId('tab-0')).toHaveTextContent('Component Options (1)');
    // headers
    expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
    expect(screen.getByTestId('tab-0-table-0-header-default')).toHaveTextContent('default');
    expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');

    // rows
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('bridgeErrorHandler (common)');
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
      'Required Allows for bridging the consumer to the Camel',
    );
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-default')).toHaveTextContent('');
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('String');

    //tab 1
    expect(screen.getByTestId('tab-1')).toHaveTextContent('Endpoint Options (2)');
    //table1
    expect(screen.getByTestId('tab-1-table-0-properties-modal-table-caption')).toHaveTextContent('path parameters (1)');
    //headers
    expect(screen.getByTestId('tab-1-table-0-header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('tab-1-table-0-header-description')).toHaveTextContent('description');
    expect(screen.getByTestId('tab-1-table-0-header-default')).toHaveTextContent('default');
    expect(screen.getByTestId('tab-1-table-0-header-type')).toHaveTextContent('type');
    //rows
    expect(screen.getByTestId('tab-1-table-0-row-0-cell-name')).toHaveTextContent('name (common)');
    expect(screen.getByTestId('tab-1-table-0-row-0-cell-description')).toHaveTextContent('Required Name of component');
    expect(screen.getByTestId('tab-1-table-0-row-0-cell-default')).toHaveTextContent('');
    expect(screen.getByTestId('tab-1-table-0-row-0-cell-type')).toHaveTextContent('String');

    //table2
    expect(screen.getByTestId('tab-1-table-1-properties-modal-table-caption')).toHaveTextContent(
      'query parameters (1)',
    );
    //headers
    expect(screen.getByTestId('tab-1-table-1-header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('tab-1-table-1-header-description')).toHaveTextContent('description');
    expect(screen.getByTestId('tab-1-table-1-header-default')).toHaveTextContent('default');
    expect(screen.getByTestId('tab-1-table-1-header-type')).toHaveTextContent('type');
    //rows
    expect(screen.getByTestId('tab-1-table-1-row-0-cell-name')).toHaveTextContent('hostname (advanced)');
    expect(screen.getByTestId('tab-1-table-1-row-0-cell-description')).toHaveTextContent(
      'The hostname of the asterisk server',
    );
    expect(screen.getByTestId('tab-1-table-1-row-0-cell-default')).toHaveTextContent('http');
    expect(screen.getByTestId('tab-1-table-1-row-0-cell-type')).toHaveTextContent('String');

    //tab 2
    expect(screen.getByTestId('tab-2')).toHaveTextContent('Message Headers (1)');
    //headers
    expect(screen.getByTestId('tab-2-table-0-header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('tab-2-table-0-header-description')).toHaveTextContent('description');
    expect(screen.getByTestId('tab-2-table-0-header-default')).toHaveTextContent('default');
    expect(screen.getByTestId('tab-2-table-0-header-type')).toHaveTextContent('type');
    //rows
    expect(screen.getByTestId('tab-2-table-0-row-0-cell-name')).toHaveTextContent('CamelAsteriskEventName (producer)');
    expect(screen.getByTestId('tab-2-table-0-row-0-cell-description')).toHaveTextContent(
      'The hostname of the asterisk server',
    );
    expect(screen.getByTestId('tab-2-table-0-row-0-cell-type')).toHaveTextContent('ExceptionHandler');
    expect(screen.getByTestId('tab-2-table-0-row-0-cell-default')).toHaveTextContent('');

    //tab 3
    expect(screen.getByTestId('tab-3')).toHaveTextContent('APIs (2)');
    //headers
    expect(screen.getByTestId('tab-3-table-0-header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('tab-3-table-0-header-description')).toHaveTextContent('description');
    expect(screen.getByTestId('tab-3-table-0-header-type')).toHaveTextContent('type');
    // rows
    expect(screen.getByTestId('tab-3-table-0-row-0-cell-name')).toHaveTextContent('client');
    expect(screen.getByTestId('tab-3-table-0-row-0-cell-description')).toHaveTextContent('Client api');
    expect(screen.getByTestId('tab-3-table-0-row-0-cell-type')).toHaveTextContent('Both');
    expect(screen.getByTestId('tab-3-table-0-row-1-cell-name')).toHaveTextContent('client2');
    expect(screen.getByTestId('tab-3-table-0-row-1-cell-description')).toHaveTextContent('Client2 api');
    expect(screen.getByTestId('tab-3-table-0-row-1-cell-type')).toHaveTextContent('Producer');
  });
});

describe('Component tile with empty properties', () => {
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
      properties: {},
      componentProperties: {},
      headers: {},
      apis: {},
    },
  };

  it('renders property modal correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Atom');
    expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Poll Atom RSS feeds.');
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for atom');
  });
});

describe('Processor tile with empty properties', () => {
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
    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Api Key');
    expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Rest security basic auth definition');
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for apiKey');
  });
});

describe('Kamelet tile with empty properties', () => {
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
          properties: {},
        },
      },
    },
  };

  it('renders property modal correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent(
      'AWS DynamoDB Streams Source',
    );
    expect(screen.getByTestId('properties-modal-description')).toHaveTextContent(
      'Receive events from Amazon DynamoDB Streams.',
    );
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for aws-ddb-streams-source');
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
              title: 'Table with space',
              description: 'The name of the DynamoDB table.',
              type: 'string',
            },
            key: {
              title: 'Key',
              description: 'New key',
              type: 'string',
              default: 'amazonaws.com',
              example: 'whatever',
            },
          },
        },
      },
    },
  };

  it('renders property modal correctly', () => {
    // modal uses React portals so baseElement needs to be used here
    const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
    // info
    expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent(
      'AWS DynamoDB Streams Source',
    );
    expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Receive events');
    expect(screen.getByTestId('tab-0')).toHaveTextContent('Options (2)');
    // headers
    expect(screen.getByTestId('tab-0-table-0-header-property')).toHaveTextContent('property');
    expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
    expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
    expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');
    expect(screen.getByTestId('tab-0-table-0-header-default')).toHaveTextContent('default');
    expect(screen.getByTestId('tab-0-table-0-header-example')).toHaveTextContent('example');

    // row
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-property')).toHaveTextContent('table');
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('Table with space');
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
      'Required The name of the DynamoDB table.',
    );
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('string');
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-default')).toHaveTextContent('');
    expect(screen.getByTestId('tab-0-table-0-row-0-cell-example')).toHaveTextContent('');
    expect(screen.getByTestId('tab-0-table-0-row-1-cell-property')).toHaveTextContent('key');
    expect(screen.getByTestId('tab-0-table-0-row-1-cell-name')).toHaveTextContent('Key');
    expect(screen.getByTestId('tab-0-table-0-row-1-cell-description')).toHaveTextContent('New key');
    expect(screen.getByTestId('tab-0-table-0-row-1-cell-type')).toHaveTextContent('string');
    expect(screen.getByTestId('tab-0-table-0-row-1-cell-default')).toHaveTextContent('amazonaws.com');
    expect(screen.getByTestId('tab-0-table-0-row-1-cell-example')).toHaveTextContent('whatever');
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
    consoleErrorFn.mockRestore();
  });

  it('fires error for property modal', () => {
    expect(() => render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />)).toThrow(
      'Unknown CatalogKind during rendering modal: tile-type',
    );
  });
});
