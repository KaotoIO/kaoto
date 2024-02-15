XML DOM Document bridge
========================
This is to mimic XML DOM Document in TypeScript, with handling namespaces transparently.
This internally uses fast-xml-parser to generate a JSON object from XML string, and then wrap
it with XmlDocument class which mimics DOM Document object. The primary focus is to bridge
between our [XSD parser](../xsd/README.md) and the `any` type of object generated from [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser#readme).