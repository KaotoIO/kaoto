import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';

import {
  CamelCatalogService,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../../models';
import { ITile } from '../Catalog';
import { PropertiesModal } from './PropertiesModal';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';

describe('PropertiesModal', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;
  let modelCatalogMap: Record<string, ICamelProcessorDefinition>;

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

    CamelCatalogService.setCatalogKey(CatalogKind.Component, componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, catalogsMap.dataformatCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, catalogsMap.loadbalancerCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
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
      const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
      // info
      expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Atom');
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
      screen.getByTestId('tab-1').click();
      await new Promise(process.nextTick);
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
      screen.getByTestId('tab-2').click();
      await new Promise(process.nextTick);
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

    it('renders property modal correctly', () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
      // info
      expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Asterisk');
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

    it('renders property modal correctly', () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
      // info
      expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent('Api Key');
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

    it('renders property modal correctly', () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
      // info
      expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent(
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

    it('renders property modal correctly', () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
      // info
      expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent(
        'AWS DynamoDB Streams Source',
      );
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Receive events');
      expect(screen.getByTestId('tab-0')).toHaveTextContent('Options (9)');
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

    it('renders property modal correctly', () => {
      // modal uses React portals so baseElement needs to be used here
      const { baseElement } = render(<PropertiesModal tile={tile} isModalOpen={true} onClose={jest.fn()} />);
      // info
      expect(baseElement.getElementsByClassName('pf-v5-c-modal-box__title-text').item(0)).toHaveTextContent(
        'NATS Sink',
      );
      expect(screen.getByTestId('properties-modal-description')).toHaveTextContent('Send data to NATS topics.');
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No properties found for nats-sink');
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
});
