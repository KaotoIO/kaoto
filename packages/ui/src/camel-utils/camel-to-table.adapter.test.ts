import { PropertiesHeaders } from '../components/PropertiesModal/PropertiesModal.models';
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
  camelComponentApisToTable,
  camelComponentPropertiesToTable,
  camelProcessorPropertiesToTable,
  kameletToPropertiesTable,
} from './camel-to-table.adapter';

describe('camelComponentToTable', () => {
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
        enum: ["first", "second"],
        autowired: true,
        secret: false,
      },
    } as Record<string, ICamelComponentProperty>,
    headers: {
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
    } as Record<string, ICamelComponentHeader>,
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
        } as Record<string, ICamelComponentApiMethod>,
      },
      client2: {
        consumerOnly: false,
        producerOnly: false,
        description: 'Client2 api',
        methods: {
          send: {
            description: 'Client2 send',
            signatures: [''],
          },
        } as Record<string, ICamelComponentApiMethod>,
      },
      server: {
        consumerOnly: true,
        producerOnly: false,
        description: 'Server api',
        methods: {
          send: {
            description: 'Server send',
            signatures: [''],
          },
        } as Record<string, ICamelComponentApiMethod>,
      },
      server2: {
        consumerOnly: false,
        producerOnly: true,
        description: 'Server2 api',
        methods: {
          send: {
            description: 'Server2 send',
            signatures: [''],
          },
        } as Record<string, ICamelComponentApiMethod>,
      },
    } as Record<string, ICamelComponentApi>,
  } as ICamelComponentDefinition;

  it('should return a component properties IPropertiesTable with the correct values', () => {
    const table = camelComponentPropertiesToTable(componentDef.componentProperties);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('brokerURL');
    expect(table.rows[0].description).toEqual('url');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toEqual('String');
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(false);
    expect(table.rows[0].rowAdditionalInfo.group).toEqual('producer');
    expect(table.rows[0].rowAdditionalInfo.autowired).toEqual(false);
    expect(table.rows[0].rowAdditionalInfo.enum).toBeUndefined;
  });
  it('should return a properties IPropertiesTable with the correct values with filter', () => {
    const table = camelComponentPropertiesToTable(componentDef.properties, {
      filterKey: 'kind',
      filterValue: 'parameter',
    });
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('hostname');
    expect(table.rows[0].description).toEqual('The hostname of the asterisk server');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toEqual('String');
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(false);
    expect(table.rows[0].rowAdditionalInfo.group).toEqual('common');
    expect(table.rows[0].rowAdditionalInfo.autowired).toEqual(true);
    expect(table.rows[0].rowAdditionalInfo.enum).toHaveLength(2);
  });
  it('should return a headers IPropertiesTable with the correct values', () => {
    let table = camelComponentPropertiesToTable(componentDef.headers!, { filterKey: 'kind', filterValue: 'parameter' });
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows.length).toEqual(0);
    table = camelComponentPropertiesToTable(componentDef.headers!);
    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('CamelAsteriskEventName');
    expect(table.rows[0].description).toEqual('Header asterisk');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toEqual('ExceptionHandler');
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(false);
    expect(table.rows[0].rowAdditionalInfo.group).toEqual('producer');  
    expect(table.rows[0].rowAdditionalInfo.autowired).toEqual(true);
  });
  it('should return a apis IPropertiesTable with the correct values', () => {
    const table = camelComponentApisToTable(componentDef.apis!);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows.length).toEqual(4);
    expect(table.rows[0].name).toEqual('client');
    expect(table.rows[0].description).toEqual('Client api');
    expect(table.rows[0].type).toEqual('Both');
    expect(table.rows[0].rowAdditionalInfo).toBeUndefined;
    expect(table.rows[1].name).toEqual('client2');
    expect(table.rows[1].description).toEqual('Client2 api');
    expect(table.rows[1].type).toEqual('Both');
    expect(table.rows[2].name).toEqual('server');
    expect(table.rows[2].description).toEqual('Server api');
    expect(table.rows[2].type).toEqual('Consumer');
    expect(table.rows[3].name).toEqual('server2');
    expect(table.rows[3].description).toEqual('Server2 api');
    expect(table.rows[3].type).toEqual('Producer');
  });
  it('should return a apis IPropertiesTable with the correct values with filter', () => {
    let table = camelComponentApisToTable(componentDef.apis!, { filterKey: 'description', filterValue: 'whatever' });
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.rows.length).toEqual(0);

    table = camelComponentApisToTable(componentDef.apis!, { filterKey: 'description', filterValue: 'Server api' });
    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('server');
    expect(table.rows[0].description).toEqual('Server api');
    expect(table.rows[0].type).toEqual('Consumer');
    expect(table.rows[0].rowAdditionalInfo).toBeUndefined;
  });
});

describe('camelProcessorToTable', () => {
  const processDef = {
    model: {
      name: 'my-processor',
      title: 'My Processor',
      description: 'My Processor Description',
      label: 'label1,label2',
    },
    properties: {
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
        enum: ["first", "second"],
        secret: false,
      },
    } as Record<string, ICamelProcessorProperty>,
  } as ICamelProcessorDefinition;

  it('should return a properties IPropertiesTable with the correct values', () => {
    const table = camelProcessorPropertiesToTable(processDef.properties);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Description);

    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('instanceClassName');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toEqual('String');
    expect(table.rows[0].description).toEqual('Class name to use for marshal and unmarshalling');
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(true);
    expect(table.rows[0].rowAdditionalInfo.group).toBeUndefined;
    expect(table.rows[0].rowAdditionalInfo.autowired).toEqual(true);
    expect(table.rows[0].rowAdditionalInfo.enum).toHaveLength(2);
  });

  it('should return a properties IPropertiesTable with the correct values with filter', () => {
    let table = camelProcessorPropertiesToTable(processDef.properties, { filterKey: 'kind', filterValue: 'path' });
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.rows.length).toEqual(0);

    table = camelProcessorPropertiesToTable(processDef.properties, { filterKey: 'kind', filterValue: 'attribute' });
    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('instanceClassName');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toEqual('String');
    expect(table.rows[0].description).toEqual('Class name to use for marshal and unmarshalling');
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(true);
    expect(table.rows[0].rowAdditionalInfo.group).toBeUndefined;
    expect(table.rows[0].rowAdditionalInfo.autowired).toEqual(true);
    expect(table.rows[0].rowAdditionalInfo.enum).toHaveLength(2);
  });
});

describe('kameletToTable', () => {
  it('should return a IPropertiesTable with the correct values', () => {
    const kameletDef = {
      spec: {
        definition: {
          title: 'My Kamelet',
          description: 'My Kamelet Description',
          required: ['schedule'],
          properties: {
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
          } as Record<string, IKameletSpecProperty>,
        },
      },
    } as IKameletDefinition;

    const table = kameletToPropertiesTable(kameletDef);

    expect(table.headers).toContain(PropertiesHeaders.Property);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Example);

    expect(table.rows.length).toEqual(2);
    expect(table.rows[0].property).toEqual('schedule');
    expect(table.rows[0].name).toEqual('Cron Schedule');
    expect(table.rows[0].description).toEqual('A cron example');
    expect(table.rows[0].type).toEqual('number');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].example).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(true);

    expect(table.rows[1].property).toEqual('message');
    expect(table.rows[1].name).toEqual('Message');
    expect(table.rows[1].description).toEqual('The message to generate');
    expect(table.rows[1].type).toEqual('string');
    expect(table.rows[1].default).toEqual('hello');
    expect(table.rows[1].example).toEqual('secretsmanager.amazonaws.com');
    expect(table.rows[1].rowAdditionalInfo.required).toEqual(false);
  });

  it('should return a IPropertiesTable with the correct values with filter', () => {
    const kameletDef = {
      spec: {
        definition: {
          title: 'My Kamelet',
          description: 'My Kamelet Description',
          required: ['schedule'],
          properties: {
            schedule: {
              title: 'Cron Schedule',
              description: 'A cron example',
              type: 'number',
            },
          } as Record<string, IKameletSpecProperty>,
        },
      },
    } as IKameletDefinition;

    let table = kameletToPropertiesTable(kameletDef, { filterKey: 'type', filterValue: 'string' });
    expect(table.headers).toContain(PropertiesHeaders.Property);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Example);
    expect(table.rows.length).toEqual(0);

    table = kameletToPropertiesTable(kameletDef, { filterKey: 'type', filterValue: 'number' });
    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].property).toEqual('schedule');
    expect(table.rows[0].name).toEqual('Cron Schedule');
    expect(table.rows[0].description).toEqual('A cron example');
    expect(table.rows[0].type).toEqual('number');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].example).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(true);
  });

  it('should return empty IPropertiesTable if no properties exists', () => {
    const kameletDef = {
      spec: {
        definition: {
          title: 'My Kamelet',
          description: 'My Kamelet Description',
          required: ['schedule'],
        },
      },
    } as IKameletDefinition;

    const table = kameletToPropertiesTable(kameletDef);

    expect(table.headers).toContain(PropertiesHeaders.Property);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Example);

    expect(table.rows.length).toEqual(0);
  });

  it('should return properties with required false if no required array exists', () => {
    const kameletDef = {
      spec: {
        definition: {
          title: 'My Kamelet',
          description: 'My Kamelet Description',
          properties: {
            schedule: {
              title: 'Cron Schedule',
              description: 'A cron example',
              type: 'number',
            },
          } as Record<string, IKameletSpecProperty>,
        },
      },
    } as IKameletDefinition;

    const table = kameletToPropertiesTable(kameletDef);

    expect(table.headers).toContain(PropertiesHeaders.Property);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Example);

    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].property).toEqual('schedule');
    expect(table.rows[0].name).toEqual('Cron Schedule');
    expect(table.rows[0].description).toEqual('A cron example');
    expect(table.rows[0].type).toEqual('number');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.required).toEqual(false);
  });
});
