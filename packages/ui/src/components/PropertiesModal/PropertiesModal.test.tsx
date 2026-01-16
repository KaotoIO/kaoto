import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { screen, waitFor } from '@testing-library/dom';
import { act, render } from '@testing-library/react';

import { CatalogContext } from '../../dynamic-catalog/catalog.provider';
import { IDynamicCatalogRegistry } from '../../dynamic-catalog/models';
import {
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../../models';
import { getFirstCatalogMap, getFirstCitrusCatalogMap } from '../../stubs/test-load-catalog';
import { ITile } from '../Catalog';
import { PropertiesModal } from './PropertiesModal';

describe('PropertiesModal', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;
  let modelCatalogMap: Record<string, ICamelProcessorDefinition>;
  let mockCatalogRegistry: IDynamicCatalogRegistry;
  let citrusActionCatalogMap: Record<string, ICitrusComponentDefinition>;
  let citrusContainerCatalogMap: Record<string, ICitrusComponentDefinition>;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
    componentCatalogMap.asterisk.properties = {};
    componentCatalogMap.asterisk.headers = {};
    componentCatalogMap.asterisk.componentProperties = {};

    kameletCatalogMap = catalogsMap.kameletsCatalogMap;
    kameletCatalogMap['nats-sink'].spec.definition.properties = {};

    modelCatalogMap = catalogsMap.modelCatalogMap;
    modelCatalogMap.asn1.properties = {};

    const citrusCatalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    citrusActionCatalogMap = citrusCatalogsMap.actionsCatalogMap;
    citrusContainerCatalogMap = citrusCatalogsMap.containersCatalogMap;

    // Create mock catalog registry
    mockCatalogRegistry = {
      getEntity: jest.fn(async (kind: CatalogKind, key: string) => {
        switch (kind) {
          case CatalogKind.Component:
            return componentCatalogMap[key];
          case CatalogKind.Processor:
            return modelCatalogMap[key];
          case CatalogKind.Pattern:
            return catalogsMap.patternCatalogMap[key];
          case CatalogKind.Entity:
            return catalogsMap.entitiesCatalog[key];
          case CatalogKind.Kamelet:
            return kameletCatalogMap[key];
          case CatalogKind.TestAction:
            return citrusActionCatalogMap[key];
          case CatalogKind.TestContainer:
            return citrusContainerCatalogMap[key];
          default:
            return undefined;
        }
      }),
    } as unknown as IDynamicCatalogRegistry;
  });

  describe('Component tile', () => {
    const tile: ITile = {
      type: CatalogKind.Component,
      name: 'atom',
      title: 'Atom',
      description: 'Poll Atom RSS feeds.',
      headerTags: ['Stable'],
      tags: ['document'],
    };

    it('renders component properties table correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent('Atom');
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Poll Atom RSS feeds.');
      // tab 0
      expect(screen.getByTestId('tab-0')).toHaveTextContent('Component Options (2)');
      // headers
      expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-0-table-0-header-default')).toHaveTextContent('default');
      expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');

      // rows
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('bridgeErrorHandler (consumer)');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
        'Allows for bridging the consumer to the Camel routing Error Handler, which mean any exceptions (if possible) occurred while the Camel consumer is trying to pickup incoming messages, or the likes, will now be processed as a message and handled by the routing Error Handler. Important: This is only possible if the 3rd party component allows Camel to be alerted if an exception was thrown. Some components handle this internally only, and therefore bridgeErrorHandler is not possible. In other situations we may improve the Camel component to hook into the 3rd party component and make this possible for future releases. By default the consumer will use the org.apache.camel.spi.ExceptionHandler to deal with exceptions, that will be logged at WARN or ERROR level and ignored.',
      );
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-default')).toHaveTextContent('false');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('boolean');

      //tab 1
      expect(screen.getByTestId('tab-1')).toHaveTextContent('Endpoint Options (24)');
      //table1
      await act(async () => {
        screen.getByTestId('tab-1').click();
        await new Promise(process.nextTick);
      });
      expect(screen.getByTestId('tab-1-table-0-properties-modal-table-caption')).toHaveTextContent(
        'path parameters (1)',
      );
      //headers
      expect(screen.getByTestId('tab-1-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-1-table-0-header-description')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-1-table-0-header-default')).toHaveTextContent('default');
      expect(screen.getByTestId('tab-1-table-0-header-type')).toHaveTextContent('type');
      //rows
      expect(screen.getByTestId('tab-1-table-0-row-0-cell-name')).toHaveTextContent('feedUri (consumer)');
      expect(screen.getByTestId('tab-1-table-0-row-0-cell-description')).toHaveTextContent(
        'Required The URI to the feed to poll.',
      );
      expect(screen.getByTestId('tab-1-table-0-row-0-cell-default')).toHaveTextContent('');
      expect(screen.getByTestId('tab-1-table-0-row-0-cell-type')).toHaveTextContent('String');

      //table2
      expect(screen.getByTestId('tab-1-table-1-properties-modal-table-caption')).toHaveTextContent(
        'query parameters (23)',
      );
      //headers
      expect(screen.getByTestId('tab-1-table-1-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-1-table-1-header-description')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-1-table-1-header-default')).toHaveTextContent('default');
      expect(screen.getByTestId('tab-1-table-1-header-type')).toHaveTextContent('type');
      //rows
      expect(screen.getByTestId('tab-1-table-1-row-0-cell-name')).toHaveTextContent(
        'sendEmptyMessageWhenIdle (consumer)',
      );
      expect(screen.getByTestId('tab-1-table-1-row-0-cell-description')).toHaveTextContent(
        'If the polling consumer did not poll any files, you can enable this option to send an empty message (no body) instead.',
      );
      expect(screen.getByTestId('tab-1-table-1-row-0-cell-default')).toHaveTextContent('false');
      expect(screen.getByTestId('tab-1-table-1-row-0-cell-type')).toHaveTextContent('boolean');

      //tab 2
      expect(screen.getByTestId('tab-2')).toHaveTextContent('Message Headers (1)');
      //headers
      await act(async () => {
        screen.getByTestId('tab-2').click();
        await new Promise(process.nextTick);
      });
      expect(screen.getByTestId('tab-2-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-2-table-0-header-description')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-2-table-0-header-default')).toHaveTextContent('default');
      expect(screen.getByTestId('tab-2-table-0-header-type')).toHaveTextContent('type');
      //rows
      expect(screen.getByTestId('tab-2-table-0-row-0-cell-name')).toHaveTextContent('CamelAtomFeed (consumer)');
      expect(screen.getByTestId('tab-2-table-0-row-0-cell-description')).toHaveTextContent(
        'When consuming the List object is set to this header.',
      );
      expect(screen.getByTestId('tab-2-table-0-row-0-cell-type')).toHaveTextContent('List');
      expect(screen.getByTestId('tab-2-table-0-row-0-cell-default')).toHaveTextContent('');
    });
  });

  describe('Component tile with empty properties and no headers/apis', () => {
    const tile: ITile = {
      type: CatalogKind.Component,
      name: 'asterisk',
      title: 'Asterisk',
      description: 'Interact with Asterisk PBX Server (VoIP).',
      headerTags: ['Stable'],
      tags: ['document', '4.0.0'],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent('Asterisk');
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent(
        'Interact with Asterisk PBX Server (VoIP).',
      );
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for asterisk');
    });
  });

  describe('Processor tile', () => {
    const tile: ITile = {
      type: CatalogKind.Processor,
      name: 'apiKey',
      title: 'Api Key',
      description: 'Rest security basic auth definition',
      headerTags: ['Stable'],
      tags: ['document'],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent('Api Key');
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent(
        'Rest security basic auth definition',
      );
      expect(screen.getByTestId('tab-0')).toHaveTextContent('Options (6)');
      // headers
      expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-0-table-0-header-default')).toHaveTextContent('default');
      expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');
      expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
      // row
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-default')).toHaveTextContent('');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('String');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
        'A short description for security scheme.',
      );
    });
  });

  describe('Processor tile with empty properties', () => {
    const tile: ITile = {
      type: CatalogKind.Processor,
      name: 'asn1',
      title: 'ASN.1 File',
      description: 'Encode and decode data structures using Abstract Syntax Notation One (ASN.1).',
      headerTags: ['Stable'],
      tags: ['document', '4.0.0'],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent(
        'ASN.1 File',
      );
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent(
        'Encode and decode data structures using Abstract Syntax Notation One (ASN.1).',
      );
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for asn1');
    });
  });

  describe('Kamelet tile', () => {
    const tile: ITile = {
      type: CatalogKind.Kamelet,
      name: 'aws-ddb-streams-source',
      title: 'AWS DynamoDB Streams Source',
      description: 'Receive events from Amazon DynamoDB Streams.',
      headerTags: ['Stable'],
      tags: ['source'],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent(
        'AWS DynamoDB Streams Source',
      );
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Receive events');
      expect(screen.getByTestId('tab-0')).toHaveTextContent('Options (13)');
      // headers
      expect(screen.getByTestId('tab-0-table-0-header-property')).toHaveTextContent('property');
      expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');
      expect(screen.getByTestId('tab-0-table-0-header-default')).toHaveTextContent('default');
      expect(screen.getByTestId('tab-0-table-0-header-example')).toHaveTextContent('example');

      // row
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-property')).toHaveTextContent('table');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('Table');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
        'Required The name of the DynamoDB table.',
      );
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('string');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-default')).toHaveTextContent('');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-example')).toHaveTextContent('');
      expect(screen.getByTestId('tab-0-table-0-row-1-cell-property')).toHaveTextContent('accessKey');
      expect(screen.getByTestId('tab-0-table-0-row-1-cell-name')).toHaveTextContent('Access Key');
      expect(screen.getByTestId('tab-0-table-0-row-1-cell-description')).toHaveTextContent(
        'The access key obtained from AWS.',
      );
      expect(screen.getByTestId('tab-0-table-0-row-1-cell-type')).toHaveTextContent('string');
      expect(screen.getByTestId('tab-0-table-0-row-1-cell-default')).toHaveTextContent('');
      expect(screen.getByTestId('tab-0-table-0-row-1-cell-example')).toHaveTextContent('');
    });
  });

  describe('Kamelet tile with no properties', () => {
    const tile: ITile = {
      type: CatalogKind.Kamelet,
      name: 'nats-sink',
      title: 'NATS Sink',
      description: 'Send data to NATS topics.',
      headerTags: ['Stable'],
      tags: ['source', '4.0.0-RC1'],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent(
        'NATS Sink',
      );
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Send data to NATS topics.');
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for nats-sink');
    });
  });

  describe('Citrus test action tile', () => {
    const tile: ITile = {
      type: CatalogKind.TestAction,
      name: 'print',
      title: 'Print',
      description: 'The print test action.',
      headerTags: [],
      tags: [],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent('Print');
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('The print test action.');
      expect(screen.getByTestId('tab-0')).toHaveTextContent('Options (2)');
      // headers
      expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');
      expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
      // row
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('description');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('string');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
        'Test action description printed when the action is executed.',
      );
    });
  });

  describe('Citrus test container tile', () => {
    const tile: ITile = {
      type: CatalogKind.TestContainer,
      name: 'iterate',
      title: 'Iterate',
      description: 'The iterate test container.',
      headerTags: [],
      tags: [],
    };

    it('renders property modal correctly', async () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = await act(async () =>
        render(
          <CatalogContext.Provider value={mockCatalogRegistry}>
            <PropertiesModal tile={tile} isModalOpen onClose={jest.fn()} />
          </CatalogContext.Provider>,
        ),
      );
      await waitFor(() => expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument());
      // info
      expect(baseElement.getElementsByClassName('pf-v6-c-modal-box__title-text').item(0)).toHaveTextContent('Iterate');
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('The iterate test container.');
      expect(screen.getByTestId('tab-0')).toHaveTextContent('Options (6)');
      // headers
      expect(screen.getByTestId('tab-0-table-0-header-name')).toHaveTextContent('name');
      expect(screen.getByTestId('tab-0-table-0-header-type')).toHaveTextContent('type');
      expect(screen.getByTestId('tab-0-table-0-header-description')).toHaveTextContent('description');
      // row
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-name')).toHaveTextContent('actions');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-type')).toHaveTextContent('array');
      expect(screen.getByTestId('tab-0-table-0-row-0-cell-description')).toHaveTextContent(
        'Required Sequence of test actions to execute.',
      );
    });
  });
});
