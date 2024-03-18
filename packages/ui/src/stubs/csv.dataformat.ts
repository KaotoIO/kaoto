import { KaotoSchemaDefinition } from '../models';

export const csvDataFormatSchema: KaotoSchemaDefinition['schema'] = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allowMissingColumnNames: {
      type: 'boolean',
      title: 'Allow Missing Column Names',
      description: 'Whether to allow missing column names.',
    },
    captureHeaderRecord: {
      type: 'boolean',
      title: 'Capture Header Record',
      description: 'Whether the unmarshalling should capture the header record and store it in the message header',
    },
    commentMarker: {
      type: 'string',
      title: 'Comment Marker',
      description: 'Sets the comment marker of the reference format.',
    },
    commentMarkerDisabled: {
      type: 'boolean',
      title: 'Comment Marker Disabled',
      description: 'Disables the comment marker of the reference format.',
    },
    delimiter: {
      type: 'string',
      title: 'Delimiter',
      description: 'Sets the delimiter to use. The default value is , (comma)',
    },
    escape: {
      type: 'string',
      title: 'Escape',
      description: 'Sets the escape character to use',
    },
    escapeDisabled: {
      type: 'boolean',
      title: 'Escape Disabled',
      description: 'Use for disabling using escape character',
    },
    formatName: {
      type: 'string',
      title: 'Format Name',
      description: 'The name of the format to use, the default value is CSVFormat.DEFAULT',
      default: 'DEFAULT',
      enum: ['DEFAULT', 'EXCEL', 'INFORMIX_UNLOAD', 'INFORMIX_UNLOAD_CSV', 'MYSQL', 'RFC4180'],
    },
    formatRef: {
      type: 'string',
      title: 'Format Ref',
      description:
        'The reference format to use, it will be updated with the other format options, the default value is CSVFormat.DEFAULT',
    },
    header: {
      type: 'array',
      title: 'Header',
      description: 'To configure the CSV headers',
      items: {
        type: 'string',
      },
    },
    headerDisabled: {
      type: 'boolean',
      title: 'Header Disabled',
      description: 'Use for disabling headers',
    },
    id: {
      type: 'string',
      title: 'Id',
      description: 'The id of this node',
    },
    ignoreEmptyLines: {
      type: 'boolean',
      title: 'Ignore Empty Lines',
      description: 'Whether to ignore empty lines.',
    },
    ignoreHeaderCase: {
      type: 'boolean',
      title: 'Ignore Header Case',
      description: 'Sets whether or not to ignore case when accessing header names.',
    },
    ignoreSurroundingSpaces: {
      type: 'boolean',
      title: 'Ignore Surrounding Spaces',
      description: 'Whether to ignore surrounding spaces',
    },
    lazyLoad: {
      type: 'boolean',
      title: 'Lazy Load',
      description:
        'Whether the unmarshalling should produce an iterator that reads the lines on the fly or if all the lines must be read at one.',
    },
    marshallerFactoryRef: {
      type: 'string',
      title: 'Marshaller Factory Ref',
      description:
        'Sets the implementation of the CsvMarshallerFactory interface which is able to customize marshalling/unmarshalling behavior by extending CsvMarshaller or creating it from scratch.',
    },
    nullString: {
      type: 'string',
      title: 'Null String',
      description: 'Sets the null string',
    },
    nullStringDisabled: {
      type: 'boolean',
      title: 'Null String Disabled',
      description: 'Used to disable null strings',
    },
    quote: {
      type: 'string',
      title: 'Quote',
      description: 'Sets the quote which by default is',
    },
    quoteDisabled: {
      type: 'boolean',
      title: 'Quote Disabled',
      description: 'Used to disable quotes',
    },
    quoteMode: {
      type: 'string',
      title: 'Quote Mode',
      description: 'Sets the quote mode',
      enum: ['ALL', 'ALL_NON_NULL', 'MINIMAL', 'NON_NUMERIC', 'NONE'],
    },
    recordConverterRef: {
      type: 'string',
      title: 'Record Converter Ref',
      description: 'Refers to a custom CsvRecordConverter to lookup from the registry to use.',
    },
    recordSeparator: {
      type: 'string',
      title: 'Record Separator',
      description: 'Sets the record separator (aka new line) which by default is new line characters (CRLF)',
    },
    recordSeparatorDisabled: {
      type: 'string',
      title: 'Record Separator Disabled',
      description: 'Used for disabling record separator',
    },
    skipHeaderRecord: {
      type: 'boolean',
      title: 'Skip Header Record',
      description: 'Whether to skip the header record in the output',
    },
    trailingDelimiter: {
      type: 'boolean',
      title: 'Trailing Delimiter',
      description: 'Sets whether or not to add a trailing delimiter.',
    },
    trim: {
      type: 'boolean',
      title: 'Trim',
      description: 'Sets whether or not to trim leading and trailing blanks.',
    },
    useMaps: {
      type: 'boolean',
      title: 'Use Maps',
      description:
        'Whether the unmarshalling should produce maps (HashMap)for the lines values instead of lists. It requires to have header (either defined or collected).',
    },
    useOrderedMaps: {
      type: 'boolean',
      title: 'Use Ordered Maps',
      description:
        'Whether the unmarshalling should produce ordered maps (LinkedHashMap) for the lines values instead of lists. It requires to have header (either defined or collected).',
    },
  },
  title: 'CSV',
  description: 'Handle CSV (Comma Separated Values) payloads.',
};
