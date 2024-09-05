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
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Rest Configuration',
  description: 'To configure rest',
  type: 'object',
  additionalProperties: false,
  properties: {
    component: {
      type: 'string',
      title: 'Component',
      description:
        'The Camel Rest component to use for the REST transport (consumer), such as netty-http, jetty, servlet, undertow. If no component has been explicit configured, then Camel will lookup if there is a Camel component that integrates with the Rest DSL, or if a org.apache.camel.spi.RestConsumerFactory is registered in the registry. If either one is found, then that is being used.',
      enum: ['platform-http', 'servlet', 'jetty', 'undertow', 'netty-http', 'coap'],
    },
    apiComponent: {
      type: 'string',
      title: 'Api Component',
      description:
        'The name of the Camel component to use as the REST API. If no API Component has been explicit configured, then Camel will lookup if there is a Camel component responsible for servicing and generating the REST API documentation, or if a org.apache.camel.spi.RestApiProcessorFactory is registered in the registry. If either one is found, then that is being used.',
      enum: ['openapi', 'swagger'],
    },
    producerComponent: {
      type: 'string',
      title: 'Producer Component',
      description: 'Sets the name of the Camel component to use as the REST producer',
      enum: ['vertx-http', 'http', 'undertow', 'netty-http'],
    },
    scheme: {
      type: 'string',
      title: 'Scheme',
      description:
        'The scheme to use for exposing the REST service. Usually http or https is supported. The default value is http',
    },
    host: {
      type: 'string',
      title: 'Host',
      description: 'The hostname to use for exposing the REST service.',
    },
    port: {
      type: 'string',
      title: 'Port',
      description:
        'The port number to use for exposing the REST service. Notice if you use servlet component then the port number configured here does not apply, as the port number in use is the actual port number the servlet component is using. eg if using Apache Tomcat its the tomcat http port, if using Apache Karaf its the HTTP service in Karaf that uses port 8181 by default etc. Though in those situations setting the port number here, allows tooling and JMX to know the port number, so its recommended to set the port number to the number that the servlet engine uses.',
    },
    apiHost: {
      type: 'string',
      title: 'Api Host',
      description:
        'To use a specific hostname for the API documentation (such as swagger or openapi) This can be used to override the generated host with this configured hostname',
    },
    useXForwardHeaders: {
      type: 'boolean',
      title: 'Use XForward Headers',
      description:
        'Whether to use X-Forward headers to set host etc. for OpenApi. This may be needed in special cases involving reverse-proxy and networking going from HTTP to HTTPS etc. Then the proxy can send X-Forward headers (X-Forwarded-Proto) that influences the host names in the OpenAPI schema that camel-openapi-java generates from Rest DSL routes.',
      default: false,
    },
    producerApiDoc: {
      type: 'string',
      title: 'Producer Api Doc',
      description:
        'Sets the location of the api document the REST producer will use to validate the REST uri and query parameters are valid accordingly to the api document. The location of the api document is loaded from classpath by default, but you can use file: or http: to refer to resources to load from file or http url.',
    },
    contextPath: {
      type: 'string',
      title: 'Context Path',
      description:
        'Sets a leading context-path the REST services will be using. This can be used when using components such as camel-servlet where the deployed web application is deployed using a context-path. Or for components such as camel-jetty or camel-netty-http that includes a HTTP server.',
    },
    apiContextPath: {
      type: 'string',
      title: 'Api Context Path',
      description:
        'Sets a leading context-path the REST API will be using. This can be used when using components such as camel-servlet where the deployed web application is deployed using a context-path.',
    },
    apiContextRouteId: {
      type: 'string',
      title: 'Api Context Route Id',
      description:
        'Sets the route id to use for the route that services the REST API. The route will by default use an auto assigned route id.',
    },
    apiVendorExtension: {
      type: 'boolean',
      title: 'Api Vendor Extension',
      description:
        'Whether vendor extension is enabled in the Rest APIs. If enabled then Camel will include additional information as vendor extension (eg keys starting with x-) such as route ids, class names etc. Not all 3rd party API gateways and tools supports vendor-extensions when importing your API docs.',
      default: false,
    },
    hostNameResolver: {
      type: 'string',
      title: 'Host Name Resolver',
      description:
        'If no hostname has been explicit configured, then this resolver is used to compute the hostname the REST service will be using.',
      default: 'allLocalIp',
      enum: ['allLocalIp', 'localHostName', 'localIp', 'none'],
    },
    bindingMode: {
      type: 'string',
      title: 'Binding Mode',
      description: 'Sets the binding mode to use. The default value is off',
      default: 'off',
      enum: ['auto', 'json', 'json_xml', 'off', 'xml'],
    },
    skipBindingOnErrorCode: {
      type: 'boolean',
      title: 'Skip Binding On Error Code',
      description:
        'Whether to skip binding on output if there is a custom HTTP error code header. This allows to build custom error messages that do not bind to json / xml etc, as success messages otherwise will do.',
      default: false,
    },
    bindingPackageScan: {
      type: 'string',
      title: 'Binding Package Scan',
      description:
        'Package name to use as base (offset) for classpath scanning of POJO classes are located when using binding mode is enabled for JSon or XML. Multiple package names can be separated by comma.',
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
      description: 'Whether to enable CORS headers in the HTTP response. The default value is false.',
      default: false,
    },
    enableNoContentResponse: {
      type: 'boolean',
      title: 'Enable No Content Response',
      description:
        'Whether to return HTTP 204 with an empty body when a response contains an empty JSON object or XML root object. The default value is false.',
      default: false,
    },
    inlineRoutes: {
      type: 'boolean',
      title: 'Inline Routes',
      description:
        'Inline routes in rest-dsl which are linked using direct endpoints. Each service in Rest DSL is an individual route, meaning that you would have at least two routes per service (rest-dsl, and the route linked from rest-dsl). By inlining (default) allows Camel to optimize and inline this as a single route, however this requires to use direct endpoints, which must be unique per service. If a route is not using direct endpoint then the rest-dsl is not inlined, and will become an individual route. This option is default true.',
      default: true,
    },
    jsonDataFormat: {
      type: 'string',
      title: 'Json Data Format',
      description:
        'Name of specific json data format to use. By default jackson will be used. Important: This option is only for setting a custom name of the data format, not to refer to an existing data format instance.',
    },
    xmlDataFormat: {
      type: 'string',
      title: 'Xml Data Format',
      description:
        'Name of specific XML data format to use. By default jaxb will be used. Important: This option is only for setting a custom name of the data format, not to refer to an existing data format instance.',
    },
    componentProperty: {
      type: 'array',
      title: 'Component Property',
      description: 'Allows to configure as many additional properties for the rest component in use.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
    },
    endpointProperty: {
      type: 'array',
      title: 'Endpoint Property',
      description: 'Allows to configure as many additional properties for the rest endpoint in use.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
    },
    consumerProperty: {
      type: 'array',
      title: 'Consumer Property',
      description: 'Allows to configure as many additional properties for the rest consumer in use.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
    },
    dataFormatProperty: {
      type: 'array',
      title: 'Data Format Property',
      description:
        'Allows to configure as many additional properties for the data formats in use. For example set property prettyPrint to true to have json outputted in pretty mode. The properties can be prefixed to denote the option is only for either JSON or XML and for either the IN or the OUT. The prefixes are: json.in. json.out. xml.in. xml.out. For example a key with value xml.out.mustBeJAXBElement is only for the XML data format for the outgoing. A key without a prefix is a common key for all situations.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
    },
    apiProperty: {
      type: 'array',
      title: 'Api Property',
      description:
        'Allows to configure as many additional properties for the api documentation. For example set property api.title to my cool stuff',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
    },
    corsHeaders: {
      type: 'array',
      title: 'Cors Headers',
      description: 'Allows to configure custom CORS headers.',
      items: {
        $ref: '#/definitions/org.apache.camel.model.rest.RestPropertyDefinition',
      },
    },
  },
  definitions: {
    'org.apache.camel.model.rest.RestPropertyDefinition': {
      title: 'Rest Property',
      description: 'A key value pair',
      type: 'object',
      additionalProperties: false,
      properties: {
        key: {
          type: 'string',
          title: 'Key',
          description: 'Property key',
        },
        value: {
          type: 'string',
          title: 'Value',
          description: 'Property value',
        },
      },
      required: ['key', 'value'],
    },
  },
};
