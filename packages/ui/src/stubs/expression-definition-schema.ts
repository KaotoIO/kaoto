import { KaotoSchemaDefinition } from '../models';

export const setHeaderSchema: KaotoSchemaDefinition['schema'] = {
  $ref: '#/definitions/org.apache.camel.model.SetHeaderDefinition',
};

export const setHeaderDefinitions: KaotoSchemaDefinition['schema']['definitions'] = {
  'org.apache.camel.model.SetHeaderDefinition': {
    title: 'Set Header',
    description: 'Sets the value of a message header',
    type: 'object',
    additionalProperties: false,
    anyOf: [
      {
        oneOf: [
          {
            $ref: '#/definitions/org.apache.camel.model.language.ExpressionDefinition',
          },
          {
            not: {
              anyOf: [
                {
                  required: ['expression'],
                },
                {
                  required: ['constant'],
                },
                {
                  required: ['csimple'],
                },
                {
                  required: ['datasonnet'],
                },
                {
                  required: ['exchangeProperty'],
                },
                {
                  required: ['groovy'],
                },
                {
                  required: ['header'],
                },
                {
                  required: ['hl7terser'],
                },
                {
                  required: ['java'],
                },
                {
                  required: ['joor'],
                },
                {
                  required: ['jq'],
                },
                {
                  required: ['js'],
                },
                {
                  required: ['jsonpath'],
                },
                {
                  required: ['language'],
                },
                {
                  required: ['method'],
                },
                {
                  required: ['mvel'],
                },
                {
                  required: ['ognl'],
                },
                {
                  required: ['python'],
                },
                {
                  required: ['ref'],
                },
                {
                  required: ['simple'],
                },
                {
                  required: ['spel'],
                },
                {
                  required: ['tokenize'],
                },
                {
                  required: ['variable'],
                },
                {
                  required: ['wasm'],
                },
                {
                  required: ['xpath'],
                },
                {
                  required: ['xquery'],
                },
                {
                  required: ['xtokenize'],
                },
              ],
            },
          },
          {
            type: 'object',
            required: ['expression'],
            properties: {
              expression: {
                title: 'Expression',
                description: 'Expression to return the value of the header',
                $ref: '#/definitions/org.apache.camel.model.language.ExpressionDefinition',
              },
            },
          },
        ],
      },
    ],
    properties: {
      description: {
        type: 'string',
        title: 'Description',
        description: 'Sets the description of this node',
      },
      disabled: {
        type: 'boolean',
        title: 'Disabled',
        description:
          'Whether to disable this EIP from the route during build time. Once an EIP has been disabled then it cannot be enabled later at runtime.',
      },
      id: {
        type: 'string',
        title: 'Id',
        description: 'Sets the id of this node',
      },
      name: {
        type: 'string',
        title: 'Name',
        description:
          'Name of message header to set a new value The simple language can be used to define a dynamic evaluated header name to be used. Otherwise a constant name will be used.',
      },
      constant: {},
      csimple: {},
      datasonnet: {},
      exchangeProperty: {},
      groovy: {},
      header: {},
      hl7terser: {},
      java: {},
      joor: {},
      jq: {},
      js: {},
      jsonpath: {},
      language: {},
      method: {},
      mvel: {},
      ognl: {},
      python: {},
      ref: {},
      simple: {},
      spel: {},
      tokenize: {},
      variable: {},
      wasm: {},
      xpath: {},
      xquery: {},
      xtokenize: {},
      expression: {},
    },
    required: ['name'],
  },
};

export const expressionDefinitions: KaotoSchemaDefinition['schema']['definitions'] = {
  'org.apache.camel.model.language.CSimpleExpression': {
    title: 'CSimple',
    description: 'Evaluate a compiled simple expression.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.ConstantExpression': {
    title: 'Constant',
    description: 'A fixed value set only once during the route startup.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.DatasonnetExpression': {
    title: 'DataSonnet',
    description: 'To use DataSonnet scripts for message transformations.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          bodyMediaType: {
            type: 'string',
            title: 'Body Media Type',
            description: "The String representation of the message's body MediaType",
          },
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          outputMediaType: {
            type: 'string',
            title: 'Output Media Type',
            description: 'The String representation of the MediaType to output',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.ExchangePropertyExpression': {
    title: 'ExchangeProperty',
    description: 'Gets a property from the Exchange.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.ExpressionDefinition': {
    type: 'object',
    anyOf: [
      {
        oneOf: [
          {
            type: 'object',
            required: ['constant'],
            properties: {
              constant: {
                $ref: '#/definitions/org.apache.camel.model.language.ConstantExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['csimple'],
            properties: {
              csimple: {
                $ref: '#/definitions/org.apache.camel.model.language.CSimpleExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['datasonnet'],
            properties: {
              datasonnet: {
                $ref: '#/definitions/org.apache.camel.model.language.DatasonnetExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['exchangeProperty'],
            properties: {
              exchangeProperty: {
                $ref: '#/definitions/org.apache.camel.model.language.ExchangePropertyExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['groovy'],
            properties: {
              groovy: {
                $ref: '#/definitions/org.apache.camel.model.language.GroovyExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['header'],
            properties: {
              header: {
                $ref: '#/definitions/org.apache.camel.model.language.HeaderExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['hl7terser'],
            properties: {
              hl7terser: {
                $ref: '#/definitions/org.apache.camel.model.language.Hl7TerserExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['java'],
            properties: {
              java: {
                $ref: '#/definitions/org.apache.camel.model.language.JavaExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['joor'],
            properties: {
              joor: {
                $ref: '#/definitions/org.apache.camel.model.language.JoorExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['jq'],
            properties: {
              jq: {
                $ref: '#/definitions/org.apache.camel.model.language.JqExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['js'],
            properties: {
              js: {
                $ref: '#/definitions/org.apache.camel.model.language.JavaScriptExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['jsonpath'],
            properties: {
              jsonpath: {
                $ref: '#/definitions/org.apache.camel.model.language.JsonPathExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['language'],
            properties: {
              language: {
                $ref: '#/definitions/org.apache.camel.model.language.LanguageExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['method'],
            properties: {
              method: {
                $ref: '#/definitions/org.apache.camel.model.language.MethodCallExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['mvel'],
            properties: {
              mvel: {
                $ref: '#/definitions/org.apache.camel.model.language.MvelExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['ognl'],
            properties: {
              ognl: {
                $ref: '#/definitions/org.apache.camel.model.language.OgnlExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['python'],
            properties: {
              python: {
                $ref: '#/definitions/org.apache.camel.model.language.PythonExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['ref'],
            properties: {
              ref: {
                $ref: '#/definitions/org.apache.camel.model.language.RefExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['simple'],
            properties: {
              simple: {
                $ref: '#/definitions/org.apache.camel.model.language.SimpleExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['spel'],
            properties: {
              spel: {
                $ref: '#/definitions/org.apache.camel.model.language.SpELExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['tokenize'],
            properties: {
              tokenize: {
                $ref: '#/definitions/org.apache.camel.model.language.TokenizerExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['variable'],
            properties: {
              variable: {
                $ref: '#/definitions/org.apache.camel.model.language.VariableExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['wasm'],
            properties: {
              wasm: {
                $ref: '#/definitions/org.apache.camel.model.language.WasmExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['xpath'],
            properties: {
              xpath: {
                $ref: '#/definitions/org.apache.camel.model.language.XPathExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['xquery'],
            properties: {
              xquery: {
                $ref: '#/definitions/org.apache.camel.model.language.XQueryExpression',
              },
            },
          },
          {
            type: 'object',
            required: ['xtokenize'],
            properties: {
              xtokenize: {
                $ref: '#/definitions/org.apache.camel.model.language.XMLTokenizerExpression',
              },
            },
          },
        ],
      },
    ],
    properties: {
      constant: {},
      csimple: {},
      datasonnet: {},
      exchangeProperty: {},
      groovy: {},
      header: {},
      hl7terser: {},
      java: {},
      joor: {},
      jq: {},
      js: {},
      jsonpath: {},
      language: {},
      method: {},
      mvel: {},
      ognl: {},
      python: {},
      ref: {},
      simple: {},
      spel: {},
      tokenize: {},
      variable: {},
      wasm: {},
      xpath: {},
      xquery: {},
      xtokenize: {},
    },
  },
  'org.apache.camel.model.language.GroovyExpression': {
    title: 'Groovy',
    description: 'Evaluates a Groovy script.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.HeaderExpression': {
    title: 'Header',
    description: 'Gets a header from the Exchange.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.Hl7TerserExpression': {
    title: 'HL7 Terser',
    description: 'Get the value of a HL7 message field specified by terse location specification syntax.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.JavaExpression': {
    title: 'Java',
    description: 'Evaluates a Java (Java compiled once at runtime) expression.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          preCompile: {
            type: 'boolean',
            title: 'Pre Compile',
            description:
              'Whether the expression should be pre compiled once during initialization phase. If this is turned off, then the expression is reloaded and compiled on each evaluation.',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          singleQuotes: {
            type: 'boolean',
            title: 'Single Quotes',
            description:
              'Whether single quotes can be used as replacement for double quotes. This is convenient when you need to work with strings inside strings.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.JavaScriptExpression': {
    title: 'JavaScript',
    description: 'Evaluates a JavaScript expression.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.JoorExpression': {
    title: 'jOOR',
    description: 'Evaluates a jOOR (Java compiled once at runtime) expression.',
    deprecated: true,
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          preCompile: {
            type: 'boolean',
            title: 'Pre Compile',
            description:
              'Whether the expression should be pre compiled once during initialization phase. If this is turned off, then the expression is reloaded and compiled on each evaluation.',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          singleQuotes: {
            type: 'boolean',
            title: 'Single Quotes',
            description:
              'Whether single quotes can be used as replacement for double quotes. This is convenient when you need to work with strings inside strings.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.JqExpression': {
    title: 'JQ',
    description: 'Evaluates a JQ expression against a JSON message body.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.JsonPathExpression': {
    title: 'JSONPath',
    description: 'Evaluates a JSONPath expression against a JSON message body.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowEasyPredicate: {
            type: 'boolean',
            title: 'Allow Easy Predicate',
            description: 'Whether to allow using the easy predicate parser to pre-parse predicates.',
          },
          allowSimple: {
            type: 'boolean',
            title: 'Allow Simple',
            description: 'Whether to allow in inlined Simple exceptions in the JSONPath expression',
          },
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          option: {
            type: 'string',
            title: 'Option',
            description: 'To configure additional options on JSONPath. Multiple values can be separated by comma.',
            enum: [
              'DEFAULT_PATH_LEAF_TO_NULL',
              'ALWAYS_RETURN_LIST',
              'AS_PATH_LIST',
              'SUPPRESS_EXCEPTIONS',
              'REQUIRE_PROPERTIES',
            ],
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          suppressExceptions: {
            type: 'boolean',
            title: 'Suppress Exceptions',
            description: 'Whether to suppress exceptions such as PathNotFoundException.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
          unpackArray: {
            type: 'boolean',
            title: 'Unpack Array',
            description: 'Whether to unpack a single element json-array into an object.',
          },
          writeAsString: {
            type: 'boolean',
            title: 'Write As String',
            description:
              'Whether to write the output of each row/element as a JSON String value instead of a Map/POJO value.',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.LanguageExpression': {
    title: 'Language',
    description: 'Evaluates a custom language.',
    type: 'object',
    additionalProperties: false,
    properties: {
      expression: {
        type: 'string',
        title: 'Expression',
        description: 'The expression value in your chosen language syntax',
      },
      id: {
        type: 'string',
        title: 'Id',
        description: 'Sets the id of this node',
      },
      language: {
        type: 'string',
        title: 'Language',
        description: 'The name of the language to use',
      },
      trim: {
        type: 'boolean',
        title: 'Trim',
        description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
      },
    },
    required: ['expression', 'language'],
  },
  'org.apache.camel.model.language.MethodCallExpression': {
    title: 'Bean Method',
    description: 'Calls a Java bean method.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          beanType: {
            type: 'string',
            title: 'Bean Type',
            description:
              'Class name (fully qualified) of the bean to use Will lookup in registry and if there is a single instance of the same type, then the existing bean is used, otherwise a new bean is created (requires a default no-arg constructor).',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          method: {
            type: 'string',
            title: 'Method',
            description: 'Name of method to call',
          },
          ref: {
            type: 'string',
            title: 'Ref',
            description: 'Reference to an existing bean (bean id) to lookup in the registry',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          scope: {
            type: 'string',
            title: 'Scope',
            description:
              'Scope of bean. When using singleton scope (default) the bean is created or looked up only once and reused for the lifetime of the endpoint. The bean should be thread-safe in case concurrent threads is calling the bean at the same time. When using request scope the bean is created or looked up once per request (exchange). This can be used if you want to store state on a bean while processing a request and you want to call the same bean instance multiple times while processing the request. The bean does not have to be thread-safe as the instance is only called from the same request. When using prototype scope, then the bean will be looked up or created per call. However in case of lookup then this is delegated to the bean registry such as Spring or CDI (if in use), which depends on their configuration can act as either singleton or prototype scope. So when using prototype scope then this depends on the bean registry implementation.',
            default: 'Singleton',
            enum: ['Singleton', 'Request', 'Prototype'],
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
          validate: {
            type: 'boolean',
            title: 'Validate',
            description: 'Whether to validate the bean has the configured method.',
          },
        },
      },
    ],
  },
  'org.apache.camel.model.language.MvelExpression': {
    title: 'MVEL',
    description: 'Evaluates a MVEL template.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.OgnlExpression': {
    title: 'OGNL',
    description: 'Evaluates an OGNL expression (Apache Commons OGNL).',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.PythonExpression': {
    title: 'Python',
    description: 'Evaluates a Python expression.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.RefExpression': {
    title: 'Ref',
    description: 'Uses an existing expression from the registry.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.SimpleExpression': {
    title: 'Simple',
    description: 'Evaluates a Camel simple expression.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.SpELExpression': {
    title: 'SpEL',
    description: 'Evaluates a Spring expression (SpEL).',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.TokenizerExpression': {
    title: 'Tokenize',
    description: 'Tokenize text payloads using delimiter patterns.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          endToken: {
            type: 'string',
            title: 'End Token',
            description:
              'The end token to use as tokenizer if using start/end token pairs. You can use simple language as the token to support dynamic tokens.',
          },
          group: {
            type: 'string',
            title: 'Group',
            description:
              'To group N parts together, for example to split big files into chunks of 1000 lines. You can use simple language as the group to support dynamic group sizes.',
          },
          groupDelimiter: {
            type: 'string',
            title: 'Group Delimiter',
            description:
              'Sets the delimiter to use when grouping. If this has not been set then token will be used as the delimiter.',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          includeTokens: {
            type: 'boolean',
            title: 'Include Tokens',
            description:
              'Whether to include the tokens in the parts when using pairs. When including tokens then the endToken property must also be configured (to use pair mode). The default value is false',
          },
          inheritNamespaceTagName: {
            type: 'string',
            title: 'Inherit Namespace Tag Name',
            description:
              'To inherit namespaces from a root/parent tag name when using XML You can use simple language as the tag name to support dynamic names.',
          },
          regex: {
            type: 'boolean',
            title: 'Regex',
            description: 'If the token is a regular expression pattern. The default value is false',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          skipFirst: {
            type: 'boolean',
            title: 'Skip First',
            description: 'To skip the very first element',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          token: {
            type: 'string',
            title: 'Token',
            description:
              'The (start) token to use as tokenizer, for example you can use the new line token. You can use simple language as the token to support dynamic tokens.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
          xml: {
            type: 'boolean',
            title: 'Xml',
            description:
              'Whether the input is XML messages. This option must be set to true if working with XML payloads.',
          },
        },
      },
    ],
    required: ['token'],
  },
  'org.apache.camel.model.language.VariableExpression': {
    title: 'Variable',
    description: 'Gets a variable',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.WasmExpression': {
    title: 'Wasm',
    description: 'Call a wasm (web assembly) function.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          module: {
            type: 'string',
            title: 'Module',
            description:
              'Set the module (the distributable, loadable, and executable unit of code in WebAssembly) resource that provides the expression function.',
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression', 'module'],
  },
  'org.apache.camel.model.language.XMLTokenizerExpression': {
    title: 'XML Tokenize',
    description: 'Tokenize XML payloads.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          group: {
            type: 'number',
            title: 'Group',
            description: 'To group N parts together',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          mode: {
            type: 'string',
            title: 'Mode',
            description:
              'The extraction mode. The available extraction modes are: i - injecting the contextual namespace bindings into the extracted token (default) w - wrapping the extracted token in its ancestor context u - unwrapping the extracted token to its child content t - extracting the text content of the specified element',
            default: 'i',
            enum: ['i', 'w', 'u', 't'],
          },
          namespace: {
            type: 'array',
            title: 'Namespace',
            description: 'Injects the XML Namespaces of prefix - uri mappings',
            items: {
              $ref: '#/definitions/org.apache.camel.model.PropertyDefinition',
            },
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.XPathExpression': {
    title: 'XPath',
    description: 'Evaluates an XPath expression against an XML payload.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          documentType: {
            type: 'string',
            title: 'Document Type',
            description: 'Name of class for document type The default value is org.w3c.dom.Document',
          },
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          factoryRef: {
            type: 'string',
            title: 'Factory Ref',
            description: 'References to a custom XPathFactory to lookup in the registry',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          logNamespaces: {
            type: 'boolean',
            title: 'Log Namespaces',
            description: 'Whether to log namespaces which can assist during troubleshooting',
          },
          namespace: {
            type: 'array',
            title: 'Namespace',
            description: 'Injects the XML Namespaces of prefix - uri mappings',
            items: {
              $ref: '#/definitions/org.apache.camel.model.PropertyDefinition',
            },
          },
          objectModel: {
            type: 'string',
            title: 'Object Model',
            description: 'The XPath object model to use',
          },
          preCompile: {
            type: 'boolean',
            title: 'Pre Compile',
            description:
              'Whether to enable pre-compiling the xpath expression during initialization phase. pre-compile is enabled by default. This can be used to turn off, for example in cases the compilation phase is desired at the starting phase, such as if the application is ahead of time compiled (for example with camel-quarkus) which would then load the xpath factory of the built operating system, and not a JVM runtime.',
          },
          resultQName: {
            type: 'string',
            title: 'Result QName',
            description: 'Sets the output type supported by XPath.',
            default: 'NODESET',
            enum: ['NUMBER', 'STRING', 'BOOLEAN', 'NODESET', 'NODE'],
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          saxon: {
            type: 'boolean',
            title: 'Saxon',
            description: 'Whether to use Saxon.',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          threadSafety: {
            type: 'boolean',
            title: 'Thread Safety',
            description:
              'Whether to enable thread-safety for the returned result of the xpath expression. This applies to when using NODESET as the result type, and the returned set has multiple elements. In this situation there can be thread-safety issues if you process the NODESET concurrently such as from a Camel Splitter EIP in parallel processing mode. This option prevents concurrency issues by doing defensive copies of the nodes. It is recommended to turn this option on if you are using camel-saxon or Saxon in your application. Saxon has thread-safety issues which can be prevented by turning this option on.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
  'org.apache.camel.model.language.XQueryExpression': {
    title: 'XQuery',
    description: 'Evaluates an XQuery expressions against an XML payload.',
    oneOf: [
      {
        type: 'string',
      },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          configurationRef: {
            type: 'string',
            title: 'Configuration Ref',
            description:
              'Reference to a saxon configuration instance in the registry to use for xquery (requires camel-saxon). This may be needed to add custom functions to a saxon configuration, so these custom functions can be used in xquery expressions.',
          },
          expression: {
            type: 'string',
            title: 'Expression',
            description: 'The expression value in your chosen language syntax',
          },
          id: {
            type: 'string',
            title: 'Id',
            description: 'Sets the id of this node',
          },
          namespace: {
            type: 'array',
            title: 'Namespace',
            description: 'Injects the XML Namespaces of prefix - uri mappings',
            items: {
              $ref: '#/definitions/org.apache.camel.model.PropertyDefinition',
            },
          },
          resultType: {
            type: 'string',
            title: 'Result Type',
            description: 'Sets the class of the result type (type from output)',
          },
          source: {
            type: 'string',
            title: 'Source',
            description:
              'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
          },
          trim: {
            type: 'boolean',
            title: 'Trim',
            description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          },
        },
      },
    ],
    required: ['expression'],
  },
};

export const setHeaderExpressionSchema: KaotoSchemaDefinition['schema'] = {
  format: 'expression',
  title: 'Test Expression',
  description: 'Test Description',
  default: 'default value',
  definitions: {
    'org.apache.camel.model.language.CSimpleExpression': {
      title: 'CSimple',
      description: 'Evaluate a compiled simple expression.',
      required: ['expression'],
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          title: 'Id',
          description: 'Sets the id of this node',
          $comment: 'group:common',
        },
        expression: {
          type: 'string',
          title: 'Expression',
          description: 'The expression value in your chosen language syntax',
          $comment: 'group:common',
        },
        resultType: {
          type: 'string',
          title: 'Result Type',
          description: 'Sets the class of the result type (type from output)',
          $comment: 'group:common',
        },
        trim: {
          type: 'boolean',
          title: 'Trim',
          description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          $comment: 'group:advanced',
          default: true,
        },
      },
    },
    'org.apache.camel.model.language.SimpleExpression': {
      title: 'Simple',
      description: 'Evaluates a Camel simple expression.',
      required: ['expression'],
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          title: 'Id',
          description: 'Sets the id of this node',
          $comment: 'group:common',
        },
        expression: {
          type: 'string',
          title: 'Expression',
          description: 'The expression value in your chosen language syntax',
          $comment: 'group:common',
        },
        resultType: {
          type: 'string',
          title: 'Result Type',
          description: 'Sets the class of the result type (type from output)',
          $comment: 'group:common',
        },
        trim: {
          type: 'boolean',
          title: 'Trim',
          description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
          $comment: 'group:advanced',
          default: true,
        },
      },
    },
  },
  oneOf: [
    {
      type: 'object',
      anyOf: [
        {
          oneOf: [
            {
              type: 'object',
              required: ['csimple'],
              properties: {
                csimple: {
                  $ref: '#/definitions/org.apache.camel.model.language.CSimpleExpression',
                },
              },
            },
            {
              type: 'object',
              required: ['simple'],
              properties: {
                simple: {
                  $ref: '#/definitions/org.apache.camel.model.language.SimpleExpression',
                },
              },
            },
            {
              type: 'object',
              required: ['wasm'],
              properties: {
                wasm: {
                  $ref: '#/definitions/org.apache.camel.model.language.WasmExpression',
                },
              },
            },
            {
              type: 'object',
              required: ['xpath'],
              properties: {
                xpath: {
                  $ref: '#/definitions/org.apache.camel.model.language.XPathExpression',
                },
              },
            },
            {
              type: 'object',
              required: ['xquery'],
              properties: {
                xquery: {
                  $ref: '#/definitions/org.apache.camel.model.language.XQueryExpression',
                },
              },
            },
            {
              type: 'object',
              required: ['xtokenize'],
              properties: {
                xtokenize: {
                  $ref: '#/definitions/org.apache.camel.model.language.XMLTokenizerExpression',
                },
              },
            },
          ],
        },
      ],
      properties: {
        constant: {},
        csimple: {},
        datasonnet: {},
        exchangeProperty: {},
        groovy: {},
        header: {},
        hl7terser: {},
        java: {},
        joor: {},
        jq: {},
        js: {},
        jsonpath: {},
        language: {},
        method: {},
        mvel: {},
        ognl: {},
        python: {},
        ref: {},
        simple: {},
        spel: {},
        tokenize: {},
        variable: {},
        wasm: {},
        xpath: {},
        xquery: {},
        xtokenize: {},
      },
    },
    {
      not: {
        anyOf: [
          {
            required: ['expression'],
          },
          {
            required: ['constant'],
          },
          {
            required: ['csimple'],
          },
          {
            required: ['datasonnet'],
          },
          {
            required: ['exchangeProperty'],
          },
          {
            required: ['groovy'],
          },
          {
            required: ['header'],
          },
          {
            required: ['hl7terser'],
          },
          {
            required: ['java'],
          },
          {
            required: ['joor'],
          },
          {
            required: ['jq'],
          },
          {
            required: ['js'],
          },
          {
            required: ['jsonpath'],
          },
          {
            required: ['language'],
          },
          {
            required: ['method'],
          },
          {
            required: ['mvel'],
          },
          {
            required: ['ognl'],
          },
          {
            required: ['python'],
          },
          {
            required: ['ref'],
          },
          {
            required: ['simple'],
          },
          {
            required: ['spel'],
          },
          {
            required: ['tokenize'],
          },
          {
            required: ['variable'],
          },
          {
            required: ['wasm'],
          },
          {
            required: ['xpath'],
          },
          {
            required: ['xquery'],
          },
          {
            required: ['xtokenize'],
          },
        ],
      },
    },
    {
      type: 'object',
      required: ['expression'],
      properties: {
        expression: {
          title: 'Expression',
          description: 'Expression to return the value of the header',
          $ref: '#/definitions/org.apache.camel.model.language.ExpressionDefinition',
        },
      },
    },
  ],
};
