import { PropertiesHeaders } from '../components/PropertiesModal/PropertiesModal.models';
import { ICamelComponentProperty, IKameletDefinition, IKameletSpecProperty } from '../models';
import { camelComponentPropertiesToTable, kameletToPropertiesTable } from './camel-to-table.adapter';

describe('camelComponentToTable', () => {
  it('should return a IPropertiesTable with the correct values', () => {
    const componentProperties = {
      brokerURL: {
        index: 0,
        kind: 'property',
        displayName: 'Broker URL',
        required: false,
        type: 'string',
        javaType: 'java.lang.String',
        deprecated: false,
        secret: false,
        description: 'url',
        group: 'producer',
      },
    } as Record<string, ICamelComponentProperty>;

    const table = camelComponentPropertiesToTable(componentProperties);

    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Kind);
    expect(table.headers).toContain(PropertiesHeaders.Required);
    expect(table.headers).toContain(PropertiesHeaders.DefaultValue);
    expect(table.headers).toContain(PropertiesHeaders.Description);

    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('Broker URL');
    expect(table.rows[0].type).toEqual('string');
    expect(table.rows[0].kind).toEqual('property');
    expect(table.rows[0].required).toEqual(false);
    expect(table.rows[0].defaultValue).toBeUndefined();
    expect(table.rows[0].description).toEqual('url');
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
            },
          } as Record<string, IKameletSpecProperty>,
        },
      },
    } as IKameletDefinition;

    const table = kameletToPropertiesTable(kameletDef);

    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Required);
    expect(table.headers).toContain(PropertiesHeaders.DefaultValue);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).not.toContain(PropertiesHeaders.Kind);

    expect(table.rows.length).toEqual(2);
    expect(table.rows[0].name).toEqual('Cron Schedule');
    expect(table.rows[0].type).toEqual('number');
    expect(table.rows[0].required).toEqual(true);
    expect(table.rows[0].defaultValue).toBeUndefined();
    expect(table.rows[0].description).toEqual('A cron example');
    expect(table.rows[1].name).toEqual('Message');
    expect(table.rows[1].type).toEqual('string');
    expect(table.rows[1].required).toEqual(false);
    expect(table.rows[1].defaultValue).toEqual('hello');
    expect(table.rows[1].description).toEqual('The message to generate');
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

    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Required);
    expect(table.headers).toContain(PropertiesHeaders.DefaultValue);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).not.toContain(PropertiesHeaders.Kind);

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

    expect(table.headers).toContain(PropertiesHeaders.Name);
    expect(table.headers).toContain(PropertiesHeaders.Type);
    expect(table.headers).toContain(PropertiesHeaders.Required);
    expect(table.headers).toContain(PropertiesHeaders.DefaultValue);
    expect(table.headers).toContain(PropertiesHeaders.Description);
    expect(table.headers).not.toContain(PropertiesHeaders.Kind);

    expect(table.rows.length).toEqual(1);
    expect(table.rows[0].name).toEqual('Cron Schedule');
    expect(table.rows[0].type).toEqual('number');
    expect(table.rows[0].required).toEqual(false);
    expect(table.rows[0].defaultValue).toBeUndefined();
    expect(table.rows[0].description).toEqual('A cron example');
  });
});
