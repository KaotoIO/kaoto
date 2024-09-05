import {
  ICamelComponentApi,
  ICamelComponentApiMethod,
  ICamelComponentDefinition,
  ICamelComponentHeader,
  ICamelComponentProperty,
  ICamelProcessorDefinition,
  ICamelProcessorProperty,
  IKameletDefinition,
  IKameletSpecProperty,
} from '../models';
import {
  transformCamelComponentIntoTab,
  transformCamelProcessorComponentIntoTab,
  transformKameletComponentIntoTab,
} from './camel-to-tabs.adapter';

describe('camelComponentToTab', () => {
  const componentDef = {
    component: {
      name: 'my-component',
      title: 'My Component',
      description: 'My Component Description',
    },
    componentProperties: {
      brokerURL: {
        index: 0,
        kind: 'property',
        group: 'producer',
        displayName: 'Broker URL',
        required: false,
        type: 'string',
        javaType: 'java.lang.String',
        deprecated: false,
        autowired: false,
        secret: false,
        description: 'url',
      },
    } as Record<string, ICamelComponentProperty>,
    properties: {
      name: {
        index: 0,
        displayName: 'name',
        kind: 'path',
        group: 'common',
        required: true,
        javaType: 'java.lang.String',
        description: 'Name of component',
        type: 'string',
        deprecated: false,
        autowired: true,
        secret: false,
      },
      hostname: {
        index: 1,
        displayName: 'hostname',
        kind: 'parameter',
        group: 'common',
        required: false,
        javaType: 'java.lang.String',
        description: 'The hostname of the asterisk server',
        type: 'string',
        deprecated: false,
        enum: ['first', 'second'],
        autowired: true,
        secret: false,
      },
    } as Record<string, ICamelComponentProperty>,
  } as ICamelComponentDefinition;

  beforeEach(() => {
    componentDef.headers = undefined;
    componentDef.apis = undefined;
    componentDef.apiProperties = undefined;
  });

  it('should return properties and component properties tabs only', () => {
    const tab = transformCamelComponentIntoTab(componentDef);

    expect(tab).toHaveLength(2);
    expect(tab[0].tables).toHaveLength(1);
    expect(tab[0].rootName).toEqual('Component Options (1)');
    expect(tab[1].tables).toHaveLength(2);
    expect(tab[1].rootName).toEqual('Endpoint Options (2)');
    expect(tab[1].tables[0].caption).toEqual('path parameters (1)');
    expect(tab[1].tables[1].caption).toEqual('query parameters (1)');
  });

  it('should return also header tab', () => {
    componentDef.headers = {
      CamelAsteriskEventName: {
        index: 0,
        kind: 'header',
        displayName: '',
        group: 'producer',
        description: 'Header asterisk',
        javaType: 'org.apache.camel.spi.ExceptionHandler',
        deprecated: false,
        autowired: true,
        secret: false,
        required: false,
        constantName: '',
      },
    } as Record<string, ICamelComponentHeader>;
    const tab = transformCamelComponentIntoTab(componentDef);

    expect(tab).toHaveLength(3);
    expect(tab[0].tables).toHaveLength(1);
    expect(tab[1].tables).toHaveLength(2);
    expect(tab[2].tables).toHaveLength(1);
    expect(tab[2].rootName).toEqual('Message Headers (1)');
  });

  it('should return also api tab', () => {
    componentDef.apis = {
      client: {
        consumerOnly: true,
        producerOnly: true,
        description: 'Client api',
        methods: {
          send: {
            description: 'Client send',
            signatures: [''],
          },
        } as Record<string, ICamelComponentApiMethod>,
      },
    } as Record<string, ICamelComponentApi>;
    componentDef.apiProperties = {};
    const tab = transformCamelComponentIntoTab(componentDef);

    expect(tab).toHaveLength(3);
    expect(tab[0].tables).toHaveLength(1);
    expect(tab[1].tables).toHaveLength(2);
    expect(tab[2].tables).toHaveLength(1);
    expect(tab[2].rootName).toEqual('APIs (1)');
  });

  it('should return properties and component properties tabs only even though optional properties exist but they are empty', () => {
    componentDef.headers = {};
    componentDef.apis = {};
    componentDef.apiProperties = {};
    const tab = transformCamelComponentIntoTab(componentDef);

    expect(tab).toHaveLength(2);
  });

  it('should return empty tab when component definition is undefined', () => {
    const tab = transformCamelComponentIntoTab(undefined);
    expect(tab).toHaveLength(0);
  });
});

describe('camelProcessorToTab', () => {
  const processDef = {
    model: {
      name: 'my-processor',
      title: 'My Processor',
      description: 'My Processor Description',
      label: 'label1,label2',
    },
  } as ICamelProcessorDefinition;

  beforeEach(() => {
    processDef.properties = {};
  });

  it('should return properties tab only', () => {
    processDef.properties = {
      instanceClassName: {
        index: 0,
        displayName: 'Instance Class Name',
        kind: 'attribute',
        required: true,
        javaType: 'java.lang.String',
        description: 'Class name to use for marshal and unmarshalling',
        type: 'string',
        deprecated: false,
        autowired: true,
        enum: ['first', 'second'],
        secret: false,
      },
    } as Record<string, ICamelProcessorProperty>;

    const tab = transformCamelProcessorComponentIntoTab(processDef);

    expect(tab).toHaveLength(1);
    expect(tab[0].tables).toHaveLength(1);
    expect(tab[0].rootName).toEqual('Options (1)');
  });

  it('should return empty tab', () => {
    const tab = transformCamelProcessorComponentIntoTab(processDef);
    expect(tab).toHaveLength(0);
  });

  it('should return empty tab when processor definition is undefined', () => {
    const tab = transformCamelProcessorComponentIntoTab(undefined);
    expect(tab).toHaveLength(0);
  });
});

describe('kameletToTab', () => {
  const kameletDef = {
    spec: {
      definition: {
        title: 'My Kamelet',
        description: 'My Kamelet Description',
      },
    },
  } as IKameletDefinition;

  beforeEach(() => {
    kameletDef.spec.definition.properties = undefined;
  });

  it('should return properties tab only', () => {
    kameletDef.spec.definition.properties = {
      schedule: {
        title: 'Cron Schedule',
        description: 'A cron example',
        type: 'number',
      },
      message: {
        title: 'Message',
        description: 'The message to generate',
        default: 'hello',
        type: 'string',
        example: 'secretsmanager.amazonaws.com',
      },
    } as Record<string, IKameletSpecProperty>;

    const tab = transformKameletComponentIntoTab(kameletDef);

    expect(tab).toHaveLength(1);
    expect(tab[0].tables).toHaveLength(1);
    expect(tab[0].rootName).toEqual('Options (2)');
  });

  it('should return empty tab', () => {
    const tab = transformKameletComponentIntoTab(kameletDef);
    expect(tab).toHaveLength(0);
  });

  it('should return empty tab even though properties exist but they are empty', () => {
    kameletDef.spec.definition.properties = {};
    const tab = transformKameletComponentIntoTab(kameletDef);
    expect(tab).toHaveLength(0);
  });

  it('should return empty tab when kamelet definition is undefined', () => {
    const tab = transformKameletComponentIntoTab(undefined);
    expect(tab).toHaveLength(0);
  });
});
