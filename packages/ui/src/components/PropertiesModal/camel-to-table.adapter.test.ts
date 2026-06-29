import {
  CatalogKind,
  ICamelComponentApi,
  ICamelComponentApiMethod,
  ICamelComponentApiProperty,
  ICamelComponentApiPropertyMethod,
  ICamelComponentDefinition,
  ICamelComponentHeader,
  ICamelComponentProperty,
  ICamelProcessorDefinition,
  ICamelProcessorProperty,
  ICitrusComponentDefinition,
  IKameletDefinition,
  IKameletSpecProperty,
} from '../../models';
import {
  camelComponentApisToTable,
  camelComponentPropertiesToTable,
  camelProcessorPropertiesToTable,
  citrusComponentToPropertiesTable,
  getClassNameOnlyFunctionExportedForTesting,
  kameletToPropertiesTable,
} from './camel-to-table.adapter';
import { PropertiesHeaders, PropertiesTableType } from './PropertiesModal.models';

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
        enum: ['first', 'second'],
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
    apiProperties: {
      client: {
        methods: {
          send: {
            properties: {
              request: {
                index: 0,
                kind: 'parameter',
                displayName: 'Request Uri Pattern',
                group: 'consumer',
                label: '',
                required: false,
                type: 'string',
                javaType: 'java.lang.String',
                deprecated: false,
                autowired: false,
                secret: false,
                description: 'Request uri',
                optional: false,
              } as ICamelComponentProperty,
            } as Record<string, ICamelComponentProperty>,
          } as ICamelComponentApiPropertyMethod,
        } as Record<string, ICamelComponentApiPropertyMethod>,
      } as ICamelComponentApiProperty,
    } as Record<string, ICamelComponentApiProperty>,
  } as ICamelComponentDefinition;

  it('should return a component properties IPropertiesTable with the correct values', () => {
    const table = camelComponentPropertiesToTable(componentDef.componentProperties);
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('brokerURL');
    expect(table.rows[0].description).toBe('url');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toBe('String');
    expect(table.rows[0].rowAdditionalInfo.required).toBe(false);
    expect(table.rows[0].rowAdditionalInfo.group).toBe('producer');
    expect(table.rows[0].rowAdditionalInfo.autowired).toBe(false);
    expect(table.rows[0].rowAdditionalInfo.enum).toBeUndefined();
  });

  it('should return a properties IPropertiesTable with the correct values with filter', () => {
    const table = camelComponentPropertiesToTable(componentDef.properties, {
      filterKey: 'kind',
      filterValue: 'parameter',
    });
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('hostname');
    expect(table.rows[0].description).toBe('The hostname of the asterisk server');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toBe('String');
    expect(table.rows[0].rowAdditionalInfo.required).toBe(false);
    expect(table.rows[0].rowAdditionalInfo.group).toBe('common');
    expect(table.rows[0].rowAdditionalInfo.autowired).toBe(true);
    expect(table.rows[0].rowAdditionalInfo.enum).toHaveLength(2);
  });

  it('should return a headers IPropertiesTable with the correct values', () => {
    let table = camelComponentPropertiesToTable(componentDef.headers!, { filterKey: 'kind', filterValue: 'parameter' });
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows).toHaveLength(0);
    table = camelComponentPropertiesToTable(componentDef.headers!);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('CamelAsteriskEventName');
    expect(table.rows[0].description).toBe('Header asterisk');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toBe('ExceptionHandler');
    expect(table.rows[0].rowAdditionalInfo.required).toBe(false);
    expect(table.rows[0].rowAdditionalInfo.group).toBe('producer');
    expect(table.rows[0].rowAdditionalInfo.autowired).toBe(true);
  });

  it('should return a apis IPropertiesTable with the correct values', () => {
    const table = camelComponentApisToTable({ apis: componentDef.apis!, apiProperties: componentDef.apiProperties! });
    expect(table.type).toEqual(PropertiesTableType.Tree);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);

    expect(table.rows).toHaveLength(4);
    expect(table.rows[0].name).toBe('client');
    expect(table.rows[0].description).toBe('Client api');
    expect(table.rows[0].type).toBe('Both');
    expect(table.rows[0].rowAdditionalInfo).toBeDefined();
    expect(table.rows[0].children?.length).toBe(1);
    expect(table.rows[1].name).toBe('client2');
    expect(table.rows[1].description).toBe('Client2 api');
    expect(table.rows[1].type).toBe('Both');
    expect(table.rows[1].children?.length).toBe(0);
    expect(table.rows[2].name).toBe('server');
    expect(table.rows[2].description).toBe('Server api');
    expect(table.rows[2].type).toBe('Consumer');
    expect(table.rows[1].children?.length).toBe(0);
    expect(table.rows[3].name).toBe('server2');
    expect(table.rows[3].description).toBe('Server2 api');
    expect(table.rows[3].type).toBe('Producer');
    expect(table.rows[1].children?.length).toBe(0);
  });

  it('should return a apis IPropertiesTable with the correct values with filter', () => {
    let table = camelComponentApisToTable(
      { apis: componentDef.apis!, apiProperties: componentDef.apiProperties! },
      { filterKey: 'description', filterValue: 'whatever' },
    );
    expect(table.type).toEqual(PropertiesTableType.Tree);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.rows).toHaveLength(0);

    table = camelComponentApisToTable(
      { apis: componentDef.apis!, apiProperties: componentDef.apiProperties! },
      { filterKey: 'description', filterValue: 'Server api' },
    );
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('server');
    expect(table.rows[0].description).toBe('Server api');
    expect(table.rows[0].type).toBe('Consumer');
    expect(table.rows[0].rowAdditionalInfo).toBeDefined();
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
        enum: ['first', 'second'],
        secret: false,
      },
    } as Record<string, ICamelProcessorProperty>,
  } as ICamelProcessorDefinition;

  it('should return a properties IPropertiesTable with the correct values', () => {
    const table = camelProcessorPropertiesToTable(processDef.properties);
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Description);

    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('instanceClassName');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toBe('String');
    expect(table.rows[0].description).toBe('Class name to use for marshal and unmarshalling');
    expect(table.rows[0].rowAdditionalInfo.required).toBe(true);
    expect(table.rows[0].rowAdditionalInfo.group).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.autowired).toBe(true);
    expect(table.rows[0].rowAdditionalInfo.enum).toHaveLength(2);
  });

  it('should return a properties IPropertiesTable with the correct values with filter', () => {
    let table = camelProcessorPropertiesToTable(processDef.properties, { filterKey: 'kind', filterValue: 'path' });
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.rows).toHaveLength(0);

    table = camelProcessorPropertiesToTable(processDef.properties, { filterKey: 'kind', filterValue: 'attribute' });
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('instanceClassName');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].type).toBe('String');
    expect(table.rows[0].description).toBe('Class name to use for marshal and unmarshalling');
    expect(table.rows[0].rowAdditionalInfo.required).toBe(true);
    expect(table.rows[0].rowAdditionalInfo.group).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.autowired).toBe(true);
    expect(table.rows[0].rowAdditionalInfo.enum).toHaveLength(2);
  });
});

describe('citrusComponentToPropertiesTable', () => {
  const componentDef = {
    kind: CatalogKind.TestAction,
    name: 'my-action',
    group: 'my-group',
    title: 'My Action',
    description: 'This is the description',
    propertiesSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['prop1'],
      properties: {
        prop1: {
          type: 'string',
          title: 'Property 1',
          description: 'The property 1 description.',
        },
        prop2: {
          type: 'string',
          title: 'Property 2',
          description: 'The property 2 description.',
        },
      },
    },
  } as ICitrusComponentDefinition;

  it('should return a properties IPropertiesTable with the correct values', () => {
    const table = citrusComponentToPropertiesTable(componentDef);
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Description);

    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].name).toBe('prop1');
    expect(table.rows[0].type).toBe('string');
    expect(table.rows[0].description).toBe('The property 1 description.');
    expect(table.rows[0].rowAdditionalInfo.required).toBe(true);

    expect(table.rows[1].name).toBe('prop2');
    expect(table.rows[1].type).toBe('string');
    expect(table.rows[1].description).toBe('The property 2 description.');
    expect(table.rows[1].rowAdditionalInfo.required).toBe(false);
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

    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].property).toBe('schedule');
    expect(table.rows[0].name).toBe('Cron Schedule');
    expect(table.rows[0].description).toBe('A cron example');
    expect(table.rows[0].type).toBe('number');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].example).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.required).toBe(true);

    expect(table.rows[1].property).toBe('message');
    expect(table.rows[1].name).toBe('Message');
    expect(table.rows[1].description).toBe('The message to generate');
    expect(table.rows[1].type).toBe('string');
    expect(table.rows[1].default).toBe('hello');
    expect(table.rows[1].example).toBe('secretsmanager.amazonaws.com');
    expect(table.rows[1].rowAdditionalInfo.required).toBe(false);
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
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Property);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Example);
    expect(table.rows).toHaveLength(0);

    table = kameletToPropertiesTable(kameletDef, { filterKey: 'type', filterValue: 'number' });
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].property).toBe('schedule');
    expect(table.rows[0].name).toBe('Cron Schedule');
    expect(table.rows[0].description).toBe('A cron example');
    expect(table.rows[0].type).toBe('number');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].example).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.required).toBe(true);
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

    expect(table.rows).toHaveLength(0);
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
    expect(table.type).toEqual(PropertiesTableType.Simple);
    expect(table.headers).toContain(PropertiesHeaders.Property);
    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Default);
    expect(table.headers).toContain(PropertiesHeaders.Example);

    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].property).toBe('schedule');
    expect(table.rows[0].name).toBe('Cron Schedule');
    expect(table.rows[0].description).toBe('A cron example');
    expect(table.rows[0].type).toBe('number');
    expect(table.rows[0].default).toBeUndefined();
    expect(table.rows[0].rowAdditionalInfo.required).toBe(false);
  });
});

describe('getClassNameOnly', () => {
  it.each([
    ['boolean', 'boolean'],
    ['String', 'String'],
    ['java.lang.String', 'String'],
    ['java.util.Set<java.nio.file.OpenOption>', 'Set'],
    ['java.util.Map<java.lang.String, java.lang.String>', 'Map'],
    [
      'java.util.Comparator<org.apache.camel.component.file.GenericFile<org.apache.commons.net.ftp.FTPFile>>',
      'Comparator',
    ],
    ['org.apache.camel.component.as2.AS2Component', 'AS2Component'],
    ['org.apache.camel.component.aws2.ddbstream.Ddb2StreamConfiguration.StreamIteratorType', 'StreamIteratorType'],
    ['org.hl7.fhir.instance.model.api.IPrimitiveType<java.util.Date>', 'IPrimitiveType'],
    [
      'org.apache.camel.component.kubernetes.config_maps.KubernetesConfigMapsComponent',
      'KubernetesConfigMapsComponent',
    ],
  ])('for fully qualified name %p is expecting %p', (fullyQualifiedName: string, result: string) => {
    expect(getClassNameOnlyFunctionExportedForTesting(fullyQualifiedName)).toEqual(result);
  });

  it('should report warning in console log if does not know', () => {
    const invalidName = 'java.^#&.p@ckage.Cla$$';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(getClassNameOnlyFunctionExportedForTesting(invalidName)).toEqual(invalidName);
    expect(consoleSpy).toHaveBeenCalledWith('[WARN] Not able to parse this fully qualified name: ' + invalidName);
  });
});
