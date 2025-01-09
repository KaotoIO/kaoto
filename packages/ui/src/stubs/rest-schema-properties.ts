import { KaotoSchemaDefinition } from '../models/kaoto-schema';

export const restSchemaProperties: KaotoSchemaDefinition['schema']['properties'] = {
  id: {
    type: 'string',
    title: 'Id',
    description: 'Sets the id of this node',
  },
  description: {
    type: 'string',
    title: 'Description',
    description: 'Sets the description of this node',
  },
  disabled: {
    type: 'boolean',
    title: 'Disabled',
    description:
      'Whether to disable this REST service from the route during build time. Once an REST service has been disabled then it cannot be enabled later at runtime.',
    default: false,
  },
  path: {
    type: 'string',
    title: 'Path',
    description: 'Path of the rest service, such as /foo',
  },
  consumes: {
    type: 'string',
    title: 'Consumes',
    description:
      'To define the content type what the REST service consumes (accept as input), such as application/xml or application/json. This option will override what may be configured on a parent level',
  },
  produces: {
    type: 'string',
    title: 'Produces',
    description:
      'To define the content type what the REST service produces (uses for output), such as application/xml or application/json This option will override what may be configured on a parent level',
  },
  bindingMode: {
    type: 'string',
    title: 'Binding Mode',
    description:
      'Sets the binding mode to use. This option will override what may be configured on a parent level The default value is auto',
    default: 'off',
    enum: ['off', 'auto', 'json', 'xml', 'json_xml'],
  },
  skipBindingOnErrorCode: {
    type: 'boolean',
    title: 'Skip Binding On Error Code',
    description:
      'Whether to skip binding on output if there is a custom HTTP error code header. This allows to build custom error messages that do not bind to json / xml etc, as success messages otherwise will do. This option will override what may be configured on a parent level',
    default: false,
  },
  clientRequestValidation: {
    type: 'boolean',
    title: 'Client Request Validation',
    description:
      'Whether to enable validation of the client request to check: 1) Content-Type header matches what the Rest DSL consumes; returns HTTP Status 415 if validation error. 2) Accept header matches what the Rest DSL produces; returns HTTP Status 406 if validation error. 3) Missing required data (query parameters, HTTP headers, body); returns HTTP Status 400 if validation error. 4) Parsing error of the message body (JSon, XML or Auto binding mode must be enabled); returns HTTP Status 400 if validation error.',
    default: false,
  },
  enableCORS: {
    type: 'boolean',
    title: 'Enable CORS',
    description:
      'Whether to enable CORS headers in the HTTP response. This option will override what may be configured on a parent level The default value is false.',
    default: false,
  },
  enableNoContentResponse: {
    type: 'boolean',
    title: 'Enable No Content Response',
    description:
      'Whether to return HTTP 204 with an empty body when a response contains an empty JSON object or XML root object. The default value is false.',
    default: false,
  },
  apiDocs: {
    type: 'boolean',
    title: 'Api Docs',
    description:
      'Whether to include or exclude this rest operation in API documentation. This option will override what may be configured on a parent level. The default value is true.',
    default: true,
  },
  tag: {
    type: 'string',
    title: 'Tag',
    description: 'To configure a special tag for the operations within this rest definition.',
  },
  openApi: {
    title: 'Open Api',
    description: 'To use OpenApi as contract-first with Camel Rest DSL.',
    type: 'object',
    additionalProperties: false,
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
          'Whether to disable all the REST services from the OpenAPI contract from the route during build time. Once an REST service has been disabled then it cannot be enabled later at runtime.',
      },
      id: {
        type: 'string',
        title: 'Id',
        description: 'Sets the id of this node',
      },
      missingOperation: {
        type: 'string',
        title: 'Missing Operation',
        description:
          'Whether to fail, ignore or return a mock response for OpenAPI operations that are not mapped to a corresponding route.',
        default: 'fail',
        enum: ['fail', 'ignore', 'mock'],
      },
      mockIncludePattern: {
        type: 'string',
        title: 'Mock Include Pattern',
        description:
          'Used for inclusive filtering of mock data from directories. The pattern is using Ant-path style pattern. Multiple patterns can be specified separated by comma.',
        default: 'classpath:camel-mock/**',
      },
      routeId: {
        type: 'string',
        title: 'Route Id',
        description: 'Sets the id of the route',
      },
      specification: {
        type: 'string',
        title: 'Specification',
        description: 'Path to the OpenApi specification file.',
      },
    },
    required: ['specification'],
  },
  securityDefinitions: {
    title: 'Rest Security Definitions',
    description: 'To configure rest security definitions.',
    type: 'object',
    additionalProperties: false,
    properties: {
      apiKey: {
        title: 'Api Key',
        description: 'Rest security basic auth definition',
        type: 'object',
        additionalProperties: false,
        properties: {
          description: {
            type: 'string',
            title: 'Description',
            description: 'A short description for security scheme.',
          },
          inCookie: {
            type: 'boolean',
            title: 'In Cookie',
            description: 'To use a cookie as the location of the API key.',
          },
          inHeader: {
            type: 'boolean',
            title: 'In Header',
            description: 'To use header as the location of the API key.',
          },
          inQuery: {
            type: 'boolean',
            title: 'In Query',
            description: 'To use query parameter as the location of the API key.',
          },
          key: {
            type: 'string',
            title: 'Key',
            description: 'Key used to refer to this security definition',
          },
          name: {
            type: 'string',
            title: 'Name',
            description: 'The name of the header or query parameter to be used.',
          },
        },
        required: ['key', 'name'],
      },
      basicAuth: {
        title: 'Basic Auth',
        description: 'Rest security basic auth definition',
        type: 'object',
        additionalProperties: false,
        properties: {
          description: {
            type: 'string',
            title: 'Description',
            description: 'A short description for security scheme.',
          },
          key: {
            type: 'string',
            title: 'Key',
            description: 'Key used to refer to this security definition',
          },
        },
        required: ['key'],
      },
      bearer: {
        title: 'Bearer Token',
        description: 'Rest security bearer token authentication definition',
        type: 'object',
        additionalProperties: false,
        properties: {
          description: {
            type: 'string',
            title: 'Description',
            description: 'A short description for security scheme.',
          },
          format: {
            type: 'string',
            title: 'Format',
            description: 'A hint to the client to identify how the bearer token is formatted.',
          },
          key: {
            type: 'string',
            title: 'Key',
            description: 'Key used to refer to this security definition',
          },
        },
        required: ['key'],
      },
      mutualTLS: {
        title: 'Mutual TLS',
        description: 'Rest security mutual TLS authentication definition',
        type: 'object',
        additionalProperties: false,
        properties: {
          description: {
            type: 'string',
            title: 'Description',
            description: 'A short description for security scheme.',
          },
          key: {
            type: 'string',
            title: 'Key',
            description: 'Key used to refer to this security definition',
          },
        },
        required: ['key'],
      },
      oauth2: {
        title: 'Oauth2',
        description: 'Rest security OAuth2 definition',
        type: 'object',
        additionalProperties: false,
        properties: {
          authorizationUrl: {
            type: 'string',
            title: 'Authorization Url',
            description:
              'The authorization URL to be used for this flow. This SHOULD be in the form of a URL. Required for implicit and access code flows',
          },
          description: {
            type: 'string',
            title: 'Description',
            description: 'A short description for security scheme.',
          },
          flow: {
            type: 'string',
            title: 'Flow',
            description:
              'The flow used by the OAuth2 security scheme. Valid values are implicit, password, application or accessCode.',
            enum: ['implicit', 'password', 'application', 'clientCredentials', 'accessCode', 'authorizationCode'],
          },
          key: {
            type: 'string',
            title: 'Key',
            description: 'Key used to refer to this security definition',
          },
          refreshUrl: {
            type: 'string',
            title: 'Refresh Url',
            description: 'The URL to be used for obtaining refresh tokens. This MUST be in the form of a URL.',
          },
          scopes: {
            type: 'array',
            title: 'Scopes',
            description: 'The available scopes for an OAuth2 security scheme',
            items: {
              $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
            },
          },
          tokenUrl: {
            type: 'string',
            title: 'Token Url',
            description:
              'The token URL to be used for this flow. This SHOULD be in the form of a URL. Required for password, application, and access code flows.',
          },
        },
        required: ['key'],
      },
      openIdConnect: {
        title: 'Open Id Connect',
        description: 'Rest security OpenID Connect definition',
        type: 'object',
        additionalProperties: false,
        properties: {
          description: {
            type: 'string',
            title: 'Description',
            description: 'A short description for security scheme.',
          },
          key: {
            type: 'string',
            title: 'Key',
            description: 'Key used to refer to this security definition',
          },
          url: {
            type: 'string',
            title: 'Url',
            description: 'OpenId Connect URL to discover OAuth2 configuration values.',
          },
        },
        required: ['key', 'url'],
      },
    },
  },
  securityRequirements: {
    type: 'array',
    title: 'Security Requirements',
    description: 'Sets the security requirement(s) for all endpoints.',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.SecurityDefinition',
    },
  },
  delete: {
    type: 'array',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.DeleteDefinition',
    },
  },
  get: {
    type: 'array',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.GetDefinition',
    },
  },
  head: {
    type: 'array',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.HeadDefinition',
    },
  },
  patch: {
    type: 'array',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.PatchDefinition',
    },
  },
  post: {
    type: 'array',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.PostDefinition',
    },
  },
  put: {
    type: 'array',
    items: {
      $ref: '#/definitions/org.apache.camel.model.rest.PutDefinition',
    },
  },
};
