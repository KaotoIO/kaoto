import {
  CanvasFormTabsContext,
  CanvasNode,
  CanvasSideBar,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeIconResolver,
  NodeIconType,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { NodeShape } from '@patternfly/react-topology';
import { Meta, StoryFn } from '@storybook/react';

const selectedNode: CanvasNode = {
  id: 'marshal-1234',
  label: 'marshal',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: {
      children: undefined,
      data: {
        label: 'marshal',
        path: 'sink',
        isPlaceholder: false,
        icon: NodeIconResolver.getIcon('marshal', NodeIconType.EIP),
      } as IVisualizationNodeData,
      id: 'marshal-1234',
      nextNode: undefined,
      parentNode: undefined,
      previousNode: undefined,
      label: 'test',
      getId: () => 'marshal-1234',
      getNodeTitle: () => 'Marshal',
      getOmitFormFields: () => [],
      getComponentSchema: () => {
        return {
          schema: {
            title: 'Marshal',
            description: 'Marshals data into a specified format for transmission over a transport or component',
            type: 'object',
            additionalProperties: false,
            anyOf: [
              {
                oneOf: [
                  {
                    type: 'object',
                    required: ['asn1'],
                    properties: {
                      asn1: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.ASN1DataFormat',
                      },
                    },
                  },
                  {
                    not: {
                      anyOf: [
                        {
                          required: ['asn1'],
                        },
                        {
                          required: ['avro'],
                        },
                        {
                          required: ['barcode'],
                        },
                        {
                          required: ['base64'],
                        },
                        {
                          required: ['beanio'],
                        },
                        {
                          required: ['bindy'],
                        },
                        {
                          required: ['cbor'],
                        },
                        {
                          required: ['crypto'],
                        },
                        {
                          required: ['csv'],
                        },
                        {
                          required: ['custom'],
                        },
                        {
                          required: ['fhirJson'],
                        },
                        {
                          required: ['fhirXml'],
                        },
                        {
                          required: ['flatpack'],
                        },
                        {
                          required: ['fury'],
                        },
                        {
                          required: ['grok'],
                        },
                        {
                          required: ['gzipDeflater'],
                        },
                        {
                          required: ['hl7'],
                        },
                        {
                          required: ['ical'],
                        },
                        {
                          required: ['jacksonXml'],
                        },
                        {
                          required: ['jaxb'],
                        },
                        {
                          required: ['json'],
                        },
                        {
                          required: ['jsonApi'],
                        },
                        {
                          required: ['lzf'],
                        },
                        {
                          required: ['mimeMultipart'],
                        },
                        {
                          required: ['parquetAvro'],
                        },
                        {
                          required: ['pgp'],
                        },
                        {
                          required: ['protobuf'],
                        },
                        {
                          required: ['rss'],
                        },
                        {
                          required: ['smooks'],
                        },
                        {
                          required: ['soap'],
                        },
                        {
                          required: ['swiftMt'],
                        },
                        {
                          required: ['swiftMx'],
                        },
                        {
                          required: ['syslog'],
                        },
                        {
                          required: ['tarFile'],
                        },
                        {
                          required: ['thrift'],
                        },
                        {
                          required: ['tidyMarkup'],
                        },
                        {
                          required: ['univocityCsv'],
                        },
                        {
                          required: ['univocityFixed'],
                        },
                        {
                          required: ['univocityTsv'],
                        },
                        {
                          required: ['xmlSecurity'],
                        },
                        {
                          required: ['yaml'],
                        },
                        {
                          required: ['zipDeflater'],
                        },
                        {
                          required: ['zipFile'],
                        },
                      ],
                    },
                  },
                  {
                    type: 'object',
                    required: ['avro'],
                    properties: {
                      avro: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.AvroDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['barcode'],
                    properties: {
                      barcode: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.BarcodeDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['base64'],
                    properties: {
                      base64: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.Base64DataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['beanio'],
                    properties: {
                      beanio: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.BeanioDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['bindy'],
                    properties: {
                      bindy: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.BindyDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['cbor'],
                    properties: {
                      cbor: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.CBORDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['crypto'],
                    properties: {
                      crypto: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.CryptoDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['csv'],
                    properties: {
                      csv: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.CsvDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['custom'],
                    properties: {
                      custom: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.CustomDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['fhirJson'],
                    properties: {
                      fhirJson: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.FhirJsonDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['fhirXml'],
                    properties: {
                      fhirXml: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.FhirXmlDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['flatpack'],
                    properties: {
                      flatpack: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.FlatpackDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['fury'],
                    properties: {
                      fury: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.FuryDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['grok'],
                    properties: {
                      grok: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.GrokDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['gzipDeflater'],
                    properties: {
                      gzipDeflater: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.GzipDeflaterDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['hl7'],
                    properties: {
                      hl7: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.HL7DataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['ical'],
                    properties: {
                      ical: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.IcalDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['jacksonXml'],
                    properties: {
                      jacksonXml: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.JacksonXMLDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['jaxb'],
                    properties: {
                      jaxb: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.JaxbDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['json'],
                    properties: {
                      json: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.JsonDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['jsonApi'],
                    properties: {
                      jsonApi: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.JsonApiDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['lzf'],
                    properties: {
                      lzf: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.LZFDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['mimeMultipart'],
                    properties: {
                      mimeMultipart: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.MimeMultipartDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['parquetAvro'],
                    properties: {
                      parquetAvro: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.ParquetAvroDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['pgp'],
                    properties: {
                      pgp: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.PGPDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['protobuf'],
                    properties: {
                      protobuf: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.ProtobufDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['rss'],
                    properties: {
                      rss: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.RssDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['smooks'],
                    properties: {
                      smooks: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.SmooksDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['soap'],
                    properties: {
                      soap: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.SoapDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['swiftMt'],
                    properties: {
                      swiftMt: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.SwiftMtDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['swiftMx'],
                    properties: {
                      swiftMx: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.SwiftMxDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['syslog'],
                    properties: {
                      syslog: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.SyslogDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['tarFile'],
                    properties: {
                      tarFile: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.TarFileDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['thrift'],
                    properties: {
                      thrift: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.ThriftDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['tidyMarkup'],
                    properties: {
                      tidyMarkup: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.TidyMarkupDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['univocityCsv'],
                    properties: {
                      univocityCsv: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.UniVocityCsvDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['univocityFixed'],
                    properties: {
                      univocityFixed: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.UniVocityFixedDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['univocityTsv'],
                    properties: {
                      univocityTsv: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.UniVocityTsvDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['xmlSecurity'],
                    properties: {
                      xmlSecurity: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.XMLSecurityDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['yaml'],
                    properties: {
                      yaml: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.YAMLDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['zipDeflater'],
                    properties: {
                      zipDeflater: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.ZipDeflaterDataFormat',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['zipFile'],
                    properties: {
                      zipFile: {
                        $ref: '#/definitions/org.apache.camel.model.dataformat.ZipFileDataFormat',
                      },
                    },
                  },
                ],
              },
            ],
            properties: {
              id: {
                type: 'string',
                title: 'Id',
                description: 'Sets the id of this node',
                $comment: 'group:common',
              },
              description: {
                type: 'string',
                title: 'Description',
                description: 'Sets the description of this node',
                $comment: 'group:common',
              },
              disabled: {
                type: 'boolean',
                title: 'Disabled',
                description:
                  'Whether to disable this EIP from the route during build time. Once an EIP has been disabled then it cannot be enabled later at runtime.',
                $comment: 'group:advanced',
              },
              variableSend: {
                type: 'string',
                title: 'Variable Send',
                description:
                  'To use a variable as the source for the message body to send. This makes it handy to use variables for user data and to easily control what data to use for sending and receiving. Important: When using send variable then the message body is taken from this variable instead of the current message, however the headers from the message will still be used as well. In other words, the variable is used instead of the message body, but everything else is as usual.',
                $comment: 'group:common',
              },
              variableReceive: {
                type: 'string',
                title: 'Variable Receive',
                description:
                  'To use a variable to store the received message body (only body, not headers). This makes it handy to use variables for user data and to easily control what data to use for sending and receiving. Important: When using receive variable then the received body is stored only in this variable and not on the current message.',
                $comment: 'group:common',
              },
              asn1: {},
              avro: {},
              barcode: {},
              base64: {},
              beanio: {},
              bindy: {},
              cbor: {},
              crypto: {},
              csv: {},
              custom: {},
              fhirJson: {},
              fhirXml: {},
              flatpack: {},
              fury: {},
              grok: {},
              gzipDeflater: {},
              hl7: {},
              ical: {},
              jacksonXml: {},
              jaxb: {},
              json: {},
              jsonApi: {},
              lzf: {},
              mimeMultipart: {},
              parquetAvro: {},
              pgp: {},
              protobuf: {},
              rss: {},
              smooks: {},
              soap: {},
              swiftMt: {},
              swiftMx: {},
              syslog: {},
              tarFile: {},
              thrift: {},
              tidyMarkup: {},
              univocityCsv: {},
              univocityFixed: {},
              univocityTsv: {},
              xmlSecurity: {},
              yaml: {},
              zipDeflater: {},
              zipFile: {},
            },
            $schema: 'http://json-schema.org/draft-07/schema#',
            updateModel: () => {},
            getBaseEntity: () => {},
          },
        };
      },
    } as unknown as IVisualizationNode,
  },
};

export default {
  title: 'Canvas/Marshal',
  component: CanvasSideBar,
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  return (
    <CanvasFormTabsContext.Provider
      value={{
        selectedTab: 'All',
        onTabChange: () => {},
      }}
    >
      <VisibleFlowsProvider>
        <CanvasSideBar {...args} onClose={() => {}} />
      </VisibleFlowsProvider>
    </CanvasFormTabsContext.Provider>
  );
};

export const MarshalNode = Template.bind({});
MarshalNode.args = {
  selectedNode,
};
