XmlSchemaTS - XML Schema Parser written in TypeScript, ported from Apache XmlSchema 
==============================================

This is supposed to be a minimal porting from [Apache XmlSchema](https://ws.apache.org/xmlschema/)
to TypeScript for what is required for the Data Mapper with using standard DOMParser.
The main focus is to parse the XML schema file and build a Data Mapper Document model.

Always honor the upstream for the internal design so we can share the common sense.
https://github.com/apache/ws-xmlschema

See this test case for the basic usage
https://github.com/KaotoIO/datamapper-poc/blob/main/packages/ui/src/util/xsd/XmlSchemaCollection.test.ts

### Behavioral Changes
- From what I understand from XML Schema definition, the top level elements are always assigned to the target namespace. In order to achieve this behavior, I made the following change
  - https://github.com/KaotoIO/datamapper-poc/commit/92be1f4b21d37194bf627a845c785aa9462dab16#diff-f4482bd2efd45dc85f74b837385f37fde87ddb67c49dde92608c37549185b3adR35-R36