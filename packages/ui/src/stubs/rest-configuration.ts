import { RestConfiguration } from '@kaoto/camel-catalog/types';

import { KaotoSchemaDefinition } from '../models';

export const restConfigurationStub: { restConfiguration: RestConfiguration } = {
  restConfiguration: {
    apiComponent: 'openapi',
    bindingMode: 'off',
    component: 'platform-http',
    hostNameResolver: 'allLocalIp',
    port: '8080',
    producerComponent: 'vertx-http',
  },
};

export const restConfigurationSchema: KaotoSchemaDefinition['schema'] = {
  title: 'Rest Configuration',
  description:
    'Configures global settings for the REST DSL, such as host, port, context path, binding mode, and the underlying HTTP component to use',
  type: 'object',
  additionalProperties: false,
  properties: {
    component: {
      type: 'string',
      title: 'Component',
      description:
        'The Camel Rest component to use for the REST transport (consumer), such as netty-http, jetty, servlet, undertow.',
      enum: ['platform-http', 'servlet', 'jetty', 'undertow', 'netty-http', 'coap'],
      $comment: 'group:common',
    },
    apiComponent: {
      type: 'string',
      title: 'Api Component',
      description: 'The name of the Camel component to use as the REST API (such as OpenApi).',
      enum: ['openapi', 'swagger'],
      $comment: 'group:consumer (advanced)',
    },
    producerComponent: {
      type: 'string',
      title: 'Producer Component',
      description: 'Sets the name of the Camel component to use as the REST producer.',
      enum: ['vertx-http', 'http', 'undertow', 'netty-http'],
      $comment: 'group:producer (advanced)',
    },
    scheme: {
      type: 'string',
      title: 'Scheme',
      description: 'The scheme to use for exposing the REST service. Usually http or https is supported.',
      $comment: 'group:common',
    },
    host: {
      type: 'string',
      title: 'Host',
      description: 'The hostname to use for exposing the REST service.',
      $comment: 'group:common',
    },
    port: {
      type: 'string',
      title: 'Port',
      description: 'The port number to use for exposing the REST service.',
      $comment: 'group:common',
    },
    apiHost: {
      type: 'string',
      title: 'Api Host',
      description:
        'To use a specific hostname for the API documentation (such as swagger or openapi). This can be used to override the generated host with this configured hostname.',
      $comment: 'group:consumer (advanced)',
    },
    useXForwardHeaders: {
      type: 'boolean',
      default: false,
      title: 'Use XForward Headers',
      description:
        'Whether to use X-Forward headers to set host etc. for OpenApi. This may be needed in special cases involving reverse-proxy and networking going from HTTP to HTTPS etc.',
      $comment: 'group:consumer (advanced)',
    },
    validationLevels: {
      $comment: 'group:consumer (advanced)',
      description:
        'Allows to configure custom validation levels when using camel-openapi-validator with client request/response validator.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      title: 'Validation Levels',
      type: 'array',
    },
    producerApiDoc: {
      type: 'string',
      title: 'Producer Api Doc',
      description:
        'Sets the location of the api document the REST producer will use to validate the REST uri and query parameters are valid accordingly to the api document.',
      $comment: 'group:producer (advanced)',
    },
    contextPath: {
      type: 'string',
      title: 'Context Path',
      description:
        'Sets a leading context-path the REST services will be using. This can be used when using components such as camel-servlet where the deployed web application is deployed using a context-path.',
      $comment: 'group:consumer',
    },
    apiContextPath: {
      type: 'string',
      title: 'Api Context Path',
      description: 'Sets a leading context-path the REST API will be using.',
      $comment: 'group:consumer',
    },
    apiContextRouteId: {
      type: 'string',
      title: 'Api Context Route Id',
      description:
        'Sets the route id to use for the route that services the REST API. The route will by default use an auto assigned route id.',
      $comment: 'group:consumer (advanced)',
    },
    apiVendorExtension: {
      type: 'boolean',
      default: false,
      title: 'Api Vendor Extension',
      description:
        'Whether vendor extension is enabled in the Rest APIs. If enabled then Camel will include additional information as vendor extension (eg keys starting with x-) such as route ids, class names etc.',
      $comment: 'group:consumer (advanced)',
    },
    hostNameResolver: {
      type: 'string',
      title: 'Host Name Resolver',
      description:
        'If no hostname has been explicit configured, then this resolver is used to compute the hostname the REST service will be using.',
      default: 'allLocalIp',
      enum: ['allLocalIp', 'localHostName', 'localIp', 'none'],
      $comment: 'group:consumer (advanced)',
    },
    bindingMode: {
      type: 'string',
      title: 'Binding Mode',
      description:
        'Sets the binding mode for automatic marshalling and unmarshalling of request and response bodies. off (default) disables binding. auto detects JSON or XML from the Content-Type header. json binds using a JSON data format only. xml binds using an XML data format only. json_xml supports both JSON and XML.',
      default: 'off',
      enum: ['auto', 'json', 'json_xml', 'off', 'xml'],
      $comment: 'group:common',
    },
    bindingPackageScan: {
      type: 'string',
      title: 'Binding Package Scan',
      description:
        'Package name to use as base (offset) for classpath scanning of POJO classes are located when using binding mode is enabled for JSon or XML. Multiple package names can be separated by comma.',
      $comment: 'group:consumer (advanced)',
    },
    skipBindingOnErrorCode: {
      type: 'boolean',
      default: false,
      title: 'Skip Binding On Error Code',
      description:
        'Whether to skip binding on output if there is a custom HTTP error code header. This allows to build custom error messages that do not bind to json / xml etc, as success messages otherwise will do.',
      $comment: 'group:advanced',
    },
    clientRequestValidation: {
      type: 'boolean',
      default: false,
      title: 'Client Request Validation',
      description:
        'Whether to enable validation of the client request to check whether Content-Type/Accept headers, required parameters, and message body are valid.',
      $comment: 'group:consumer (advanced)',
    },
    clientResponseValidation: {
      $comment: 'group:consumer (advanced)',
      description:
        'Whether to validate what Camel is returning as response to the client, such as checking status-code, Content-Type, and headers match the Rest DSL response definition.',
      title: 'Client Response Validation',
      type: 'boolean',
      default: false,
    },
    enableCORS: {
      type: 'boolean',
      default: false,
      title: 'Enable CORS',
      description: 'Whether to enable CORS headers in the HTTP response.',
      $comment: 'group:consumer (advanced)',
    },
    enableNoContentResponse: {
      type: 'boolean',
      default: false,
      title: 'Enable No Content Response',
      description:
        'Whether to return HTTP 204 with an empty body when a response contains an empty JSON object or XML root object.',
      $comment: 'group:consumer (advanced)',
    },
    inlineRoutes: {
      type: 'boolean',
      title: 'Inline Routes',
      description:
        'Inline routes in rest-dsl which are linked using direct endpoints. By inlining, Camel can optimize and inline this as a single route, however this requires to use direct endpoints, which must be unique per service.',
      $comment: 'group:consumer',
      default: true,
    },
    jsonDataFormat: {
      type: 'string',
      title: 'Json Data Format',
      description:
        'Name of specific json data format to use. By default jackson will be used. Important: This option is only for setting a custom name of the data format, not to refer to an existing data format instance.',
      default: 'jackson',
      enum: ['jackson', 'jsonb', 'fastjson', 'gson'],
      $comment: 'group:advanced',
    },
    xmlDataFormat: {
      type: 'string',
      title: 'Xml Data Format',
      description:
        'Name of specific XML data format to use. By default jaxb will be used. Important: This option is only for setting a custom name of the data format, not to refer to an existing data format instance.',
      default: 'jaxb',
      enum: ['jaxb', 'jacksonXml'],
      $comment: 'group:advanced',
    },
    componentProperty: {
      type: 'array',
      title: 'Component Property',
      description: 'Allows to configure as many additional properties for the rest component in use.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      $comment: 'group:advanced',
    },
    endpointProperty: {
      type: 'array',
      title: 'Endpoint Property',
      description: 'Allows to configure as many additional properties for the rest endpoint in use.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      $comment: 'group:advanced',
    },
    consumerProperty: {
      type: 'array',
      title: 'Consumer Property',
      description: 'Allows to configure as many additional properties for the rest consumer in use.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      $comment: 'group:consumer (advanced)',
    },
    dataFormatProperty: {
      type: 'array',
      title: 'Data Format Property',
      description:
        'Allows to configure as many additional properties for the data formats in use. For example set property prettyPrint to true to have json outputted in pretty mode.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      $comment: 'group:advanced',
    },
    apiProperty: {
      type: 'array',
      title: 'Api Property',
      description: 'Allows to configure as many additional properties for the api documentation.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      $comment: 'group:consumer (advanced)',
    },
    corsHeaders: {
      type: 'array',
      title: 'Cors Headers',
      description: 'Allows to configure custom CORS headers.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
      $comment: 'group:consumer (advanced)',
    },
  },
  definitions: {
    'org.apache.camel.model.rest.RestPropertyDefinition': {
      title: 'Rest Property',
      description: 'Defines a key/value property for REST configuration, used to pass component-specific settings',
      type: 'object',
      additionalProperties: false,
      properties: {
        key: {
          type: 'string',
          title: 'Key',
          description: 'Property key.',
          $comment: 'group:common',
        },
        value: {
          type: 'string',
          title: 'Value',
          description: 'Property value.',
          $comment: 'group:common',
        },
      },
      required: ['key', 'value'],
    },
  },
  $schema: 'http://json-schema.org/draft-07/schema#',
};
