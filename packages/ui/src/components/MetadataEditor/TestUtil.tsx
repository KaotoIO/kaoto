export const mockSchema = {
  beans: {
    title: 'Beans',
    description: 'Beans Configuration',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string',
          description: 'Bean name',
        },
        type: {
          type: 'string',
          description:
            'What type to use for creating the bean. Can be one of: #class,#type,bean,groovy,joor,language,mvel,ognl. #class or #type then the bean is created via the fully qualified classname, such as #class:com.foo.MyBean The others are scripting languages that gives more power to create the bean with an inlined code in the script section, such as using groovy.',
        },
        properties: {
          type: 'object',
          description: 'Optional properties to set on the created local bean',
        },
      },
      required: ['name', 'type'],
    },
  },
  single: {
    title: 'Single Object',
    description: 'Single Object Configuration',
    type: 'object',
    additionalProperties: false,
    properties: {
      name: {
        type: 'string',
        description: 'Bean name',
      },
      type: {
        type: 'string',
        description:
          'What type to use for creating the bean. Can be one of: #class,#type,bean,groovy,joor,language,mvel,ognl. #class or #type then the bean is created via the fully qualified classname, such as #class:com.foo.MyBean The others are scripting languages that gives more power to create the bean with an inlined code in the script section, such as using groovy.',
      },
      properties: {
        type: 'object',
        description: 'Optional properties to set on the created local bean',
      },
    },
  },
};

export const mockModel = {
  beans: [
    {
      name: 'bean1',
      type: 'type1',
      properties: {
        prop1: 'value1',
        propObj1: {
          propObj1Sub: 'valueObj1',
        },
      },
    },
    {
      name: 'bean2',
      type: 'type2',
      properties: {
        prop2: 'value2',
        propObj2: {
          propObj2Sub: 'valueObj2',
        },
      },
    },
  ],
  beansNoProp: [
    {
      name: 'bean1',
      type: 'type1',
      properties: {},
    },
    {
      name: 'bean2',
      type: 'type2',
      properties: {},
    },
  ],
};
