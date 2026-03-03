import {
  getCamelSpringXsd,
  getConstraintsXsd,
  getCrossSchemaBaseTypesXsd,
  getCrossSchemaDerivedTypesXsd,
  getDerivationMethodsXsd,
  getExtensionComplexXsd,
  getNamedTypesXsd,
  getRestrictionInheritanceXsd,
  getSchemaTestXsd,
  getShipOrderEmptyFirstLineXsd,
  getShipOrderXsd,
  getTestDocumentXsd,
} from '../stubs/datamapper/data-mapper';
import { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';
import { XmlSchemaAttributeGroup } from './attribute/XmlSchemaAttributeGroup';
import { XmlSchemaAttributeGroupRef } from './attribute/XmlSchemaAttributeGroupRef';
import { XmlSchemaComplexContentExtension } from './complex/XmlSchemaComplexContentExtension';
import { XmlSchemaComplexContentRestriction } from './complex/XmlSchemaComplexContentRestriction';
import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { XmlSchemaKey } from './constraint/XmlSchemaKey';
import { XmlSchemaKeyref } from './constraint/XmlSchemaKeyref';
import { XmlSchemaUnique } from './constraint/XmlSchemaUnique';
import { XmlSchemaElement } from './particle/XmlSchemaElement';
import { XmlSchemaGroupRef } from './particle/XmlSchemaGroupRef';
import { XmlSchemaSequence } from './particle/XmlSchemaSequence';
import { QName } from './QName';
import { XmlSchemaSimpleType } from './simple/XmlSchemaSimpleType';
import { XmlSchemaSimpleTypeRestriction } from './simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaCollection } from './XmlSchemaCollection';
import { XmlSchemaGroup } from './XmlSchemaGroup';
import { XmlSchemaUse } from './XmlSchemaUse';

describe('XmlSchemaCollection', () => {
  it('should parse ShipOrder XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getShipOrderXsd(), () => {});
    const attributes = xmlSchema.getAttributes();
    expect(attributes.size).toEqual(0);

    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const shipOrderElement = elements.get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    expect(shipOrderElement!.getName()).toEqual('ShipOrder');
    expect(shipOrderElement!.getWireName()?.getNamespaceURI()).toEqual('io.kaoto.datamapper.poc.test');
    expect(shipOrderElement!.getWireName()?.getLocalPart()).toEqual('ShipOrder');
    expect(shipOrderElement!.getMinOccurs()).toEqual(1);
    expect(shipOrderElement!.getMaxOccurs()).toEqual(1);
    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderAttributes = shipOrderComplexType.getAttributes();
    expect(shipOrderAttributes.length).toBe(1);
    const orderIdAttr = shipOrderAttributes[0] as XmlSchemaAttribute;
    expect(orderIdAttr.getName()).toEqual('OrderId');
    expect(orderIdAttr.getWireName()?.getNamespaceURI()).toBe('');
    expect(orderIdAttr.getWireName()?.getLocalPart()).toBe('OrderId');
    expect(orderIdAttr.getSchemaType()).toBeNull();
    expect(orderIdAttr.getSchemaTypeName()?.getLocalPart()).toEqual('string');
    expect(orderIdAttr.getUse()).toEqual(XmlSchemaUse.REQUIRED);
    expect(orderIdAttr.getFixedValue()).toEqual('2');

    const shipOrderSequence = shipOrderComplexType.getParticle() as XmlSchemaSequence;
    const shipOrderSequenceMembers = shipOrderSequence.getItems();
    expect(shipOrderSequenceMembers.length).toBe(3);

    const orderPerson = shipOrderSequenceMembers[0] as XmlSchemaElement;
    expect(orderPerson.getSchemaType() instanceof XmlSchemaSimpleType).toBeTruthy();
    expect(orderPerson.getSchemaTypeName()?.getLocalPart()).toEqual('string');
    expect(orderPerson.getName()).toEqual('OrderPerson');
    expect(orderPerson.getWireName()?.getNamespaceURI()).toEqual('io.kaoto.datamapper.poc.test');
    expect(orderPerson.getWireName()?.getLocalPart()).toEqual('OrderPerson');
    expect(orderPerson.getMinOccurs()).toEqual(1);
    expect(orderPerson.getMaxOccurs()).toEqual(1);

    const shipTo = shipOrderSequenceMembers[1] as XmlSchemaElement;
    const shipToSchemaType = shipTo.getSchemaType() as XmlSchemaComplexType;
    const shipToSequence = shipToSchemaType.getParticle() as XmlSchemaSequence;
    const shipToSequenceMenbers = shipToSequence.getItems();
    expect(shipToSequenceMenbers.length).toBe(4);
    expect(shipTo.getSchemaTypeName()).toBeNull();
    expect(shipTo.getName()).toEqual('ShipTo');
    expect(shipTo.getWireName()?.getNamespaceURI()).toEqual('');
    expect(shipTo.getWireName()?.getLocalPart()).toEqual('ShipTo');
    expect(shipTo.getMinOccurs()).toEqual(1);
    expect(shipTo.getMaxOccurs()).toEqual(1);

    const item = shipOrderSequenceMembers[2] as XmlSchemaElement;
    expect(item.getMaxOccurs()).toBe('unbounded');
    const itemSchemaType = item.getSchemaType() as XmlSchemaComplexType;
    const itemSequence = itemSchemaType.getParticle() as XmlSchemaSequence;
    const itemSequenceMembers = itemSequence.getItems();
    expect(itemSequenceMembers.length).toEqual(4);
    const itemNote = itemSequenceMembers[1] as XmlSchemaElement;
    expect(itemNote.getMinOccurs()).toEqual(0);
    const itemQuantity = itemSequenceMembers[2] as XmlSchemaElement;
    expect(itemQuantity.getSchemaTypeName()?.getLocalPart()).toEqual('positiveInteger');
    const itemPrice = itemSequenceMembers[3] as XmlSchemaElement;
    expect(itemPrice.getSchemaTypeName()?.getLocalPart()).toEqual('decimal');
  });

  it('should parse TestDocument XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getTestDocumentXsd(), () => {});
    const attributes = xmlSchema.getAttributes();
    expect(attributes.size).toEqual(0);
    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const testDocumentElement = elements.get(new QName('io.kaoto.datamapper.poc.test', 'TestDocument'));
    const testDocumentComplexType = testDocumentElement!.getSchemaType() as XmlSchemaComplexType;
    const testDocumentAttributes = testDocumentComplexType.getAttributes();
    expect(testDocumentAttributes.length).toBe(1);
    const attrGroupRef = (testDocumentAttributes[0] as XmlSchemaAttributeGroupRef).getRef();
    expect(attrGroupRef.getTarget()).toBeTruthy();
  });

  it('should parse NamedTypes XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getNamedTypesXsd(), () => {});
    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const element1 = elements.get(new QName('io.kaoto.datamapper.poc.test', 'Element1'));
    const element1ComplexType = element1!.getSchemaType() as XmlSchemaComplexType;
    const element1Sequence = element1ComplexType.getParticle() as XmlSchemaSequence;
    const element1SequenceMembers = element1Sequence.getItems();
    expect(element1SequenceMembers.length).toEqual(1);
    const element1Simple1 = element1SequenceMembers[0] as XmlSchemaElement;
    expect(element1Simple1.getWireName()?.getNamespaceURI()).toEqual('');
    expect(element1Simple1.getWireName()?.getLocalPart()).toEqual('Element1Simple1');
  });

  it('should parse camel-spring XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getCamelSpringXsd(), () => {});
    const aggregate = xmlSchema.getElements().get(new QName('http://camel.apache.org/schema/spring', 'aggregate'));
    const aggregateComplexType = aggregate!.getSchemaType() as XmlSchemaComplexType;
    expect(aggregateComplexType.getParticle()).toBeNull();
    const aggregateComplexContent = aggregateComplexType
      .getContentModel()
      ?.getContent() as XmlSchemaComplexContentExtension;
    expect(aggregateComplexContent.getBaseTypeName()?.getLocalPart()).toEqual('output');
    expect(aggregateComplexContent.getAttributes().length).toEqual(22);
    const particle = aggregateComplexContent.getParticle() as XmlSchemaSequence;
    expect(particle.getItems().length).toEqual(6);
  });

  it('should parse ShipOrderEmptyFirstLine.xsd', () => {
    const collection = new XmlSchemaCollection();
    try {
      collection.read(getShipOrderEmptyFirstLineXsd(), () => {});
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error as any).message).toContain('an XML declaration must be at the start of the document');
      return;
    }
    fail('No error was thrown');
  });

  it('should track explicit minOccurs/maxOccurs flags in ShipOrder elements', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getShipOrderXsd(), () => {});

    const shipOrderElement = xmlSchema.getElements().get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    expect(shipOrderElement).toBeDefined();
    expect(shipOrderElement!.getMinOccurs()).toEqual(1);
    expect(shipOrderElement!.getMaxOccurs()).toEqual(1);
    expect(shipOrderElement!.isMinOccursExplicit()).toBe(false);
    expect(shipOrderElement!.isMaxOccursExplicit()).toBe(false);

    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderSequence = shipOrderComplexType.getParticle() as XmlSchemaSequence;
    const item = shipOrderSequence.getItems()[2] as XmlSchemaElement;
    expect(item.getName()).toEqual('Item');
    expect(item.getMaxOccurs()).toBe('unbounded');
    expect(item.isMaxOccursExplicit()).toBe(true);
    expect(item.isMinOccursExplicit()).toBe(false);

    const itemSchemaType = item.getSchemaType() as XmlSchemaComplexType;
    const itemSequence = itemSchemaType.getParticle() as XmlSchemaSequence;
    const itemNote = itemSequence.getItems()[1] as XmlSchemaElement;
    expect(itemNote.getName()).toEqual('Note');
    expect(itemNote.getMinOccurs()).toEqual(0);
    expect(itemNote.isMinOccursExplicit()).toBe(true);
    expect(itemNote.isMaxOccursExplicit()).toBe(false);
  });

  it('should correctly handle explicit flags in RestrictionInheritance.xsd', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getRestrictionInheritanceXsd(), () => {});

    const restrictedType = xmlSchema
      .getSchemaTypes()
      .get(new QName('http://www.example.com/INHERIT', 'RestrictedType')) as XmlSchemaComplexType;
    expect(restrictedType).toBeDefined();

    const complexContentRestriction = restrictedType.getContentModel()?.getContent();
    expect(complexContentRestriction).toBeDefined();

    const restrictionParticle = (
      complexContentRestriction as XmlSchemaComplexContentRestriction
    ).getParticle() as XmlSchemaSequence;
    expect(restrictionParticle).toBeDefined();

    const restrictionElements = restrictionParticle.getItems();
    expect(restrictionElements.length).toEqual(3);

    const requiredElement = restrictionElements[1] as XmlSchemaElement;
    expect(requiredElement).toBeDefined();
    expect(requiredElement.getName()).toEqual('required');
    expect(requiredElement.isMinOccursExplicit()).toBe(false);
    expect(requiredElement.isMaxOccursExplicit()).toBe(false);

    const optionalElement = restrictionElements[2] as XmlSchemaElement;
    expect(optionalElement).toBeDefined();
    expect(optionalElement.getName()).toEqual('optional');
    expect(optionalElement.getMaxOccurs()).toEqual(3);
    expect(optionalElement.isMaxOccursExplicit()).toBe(true);
    expect(optionalElement.isMinOccursExplicit()).toBe(false);
  });

  it('should handle explicit flags in sequence particles', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(getShipOrderXsd(), () => {});

    const shipOrderElement = xmlSchema.getElements().get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderSequence = shipOrderComplexType.getParticle() as XmlSchemaSequence;

    expect(shipOrderSequence.getMinOccurs()).toEqual(1);
    expect(shipOrderSequence.getMaxOccurs()).toEqual(1);
    expect(shipOrderSequence.isMinOccursExplicit()).toBe(false);
    expect(shipOrderSequence.isMaxOccursExplicit()).toBe(false);
  });

  describe('Cross-schema type resolution', () => {
    it('should load multiple schema files into the same collection', () => {
      const collection = new XmlSchemaCollection();
      const baseSchema = collection.read(getCrossSchemaBaseTypesXsd(), () => {});
      const derivedSchema = collection.read(getCrossSchemaDerivedTypesXsd(), () => {});

      expect(baseSchema).toBeTruthy();
      expect(derivedSchema).toBeTruthy();
      expect(baseSchema.getTargetNamespace()).toBe('http://www.example.com/BASE');
      expect(derivedSchema.getTargetNamespace()).toBe('http://www.example.com/DERIVED');
    });

    it('should resolve complex type extension across schema files', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCrossSchemaBaseTypesXsd(), () => {});
      const derivedSchema = collection.read(getCrossSchemaDerivedTypesXsd(), () => {});

      const employeeType = derivedSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/DERIVED', 'EmployeeType')) as XmlSchemaComplexType;

      expect(employeeType).toBeTruthy();

      const contentModel = employeeType.getContentModel();
      expect(contentModel).toBeTruthy();

      const extension = contentModel!.getContent() as XmlSchemaComplexContentExtension;
      expect(extension).toBeInstanceOf(XmlSchemaComplexContentExtension);

      const baseTypeName = extension.getBaseTypeName();
      expect(baseTypeName?.getLocalPart()).toBe('BasePersonType');
      expect(baseTypeName?.getNamespaceURI()).toBe('http://www.example.com/BASE');

      const baseType = collection.getTypeByQName(baseTypeName!);
      expect(baseType).toBeTruthy();
      expect(baseType).toBeInstanceOf(XmlSchemaComplexType);
    });

    it('should resolve complex type restriction across schema files', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCrossSchemaBaseTypesXsd(), () => {});
      const derivedSchema = collection.read(getCrossSchemaDerivedTypesXsd(), () => {});

      const usAddressType = derivedSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/DERIVED', 'USAddressType')) as XmlSchemaComplexType;

      expect(usAddressType).toBeTruthy();

      const contentModel = usAddressType.getContentModel();
      expect(contentModel).toBeTruthy();

      const restriction = contentModel!.getContent() as XmlSchemaComplexContentRestriction;
      expect(restriction).toBeInstanceOf(XmlSchemaComplexContentRestriction);

      const baseTypeName = restriction.getBaseTypeName();
      expect(baseTypeName?.getLocalPart()).toBe('BaseAddressType');
      expect(baseTypeName?.getNamespaceURI()).toBe('http://www.example.com/BASE');

      const baseType = collection.getTypeByQName(baseTypeName!);
      expect(baseType).toBeTruthy();
      expect(baseType).toBeInstanceOf(XmlSchemaComplexType);
    });

    it('should resolve simple type restriction across schema files', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCrossSchemaBaseTypesXsd(), () => {});
      const derivedSchema = collection.read(getCrossSchemaDerivedTypesXsd(), () => {});

      const specialCodeType = derivedSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/DERIVED', 'SpecialProductCode')) as XmlSchemaSimpleType;

      expect(specialCodeType).toBeTruthy();

      const content = specialCodeType.getContent() as XmlSchemaSimpleTypeRestriction;
      expect(content).toBeInstanceOf(XmlSchemaSimpleTypeRestriction);

      const baseTypeName = content.getBaseTypeName();
      expect(baseTypeName?.getLocalPart()).toBe('BaseProductCode');
      expect(baseTypeName?.getNamespaceURI()).toBe('http://www.example.com/BASE');

      const baseType = collection.getTypeByQName(baseTypeName!);
      expect(baseType).toBeTruthy();
      expect(baseType).toBeInstanceOf(XmlSchemaSimpleType);
    });

    it('should correctly populate fields when extension base is in another schema', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCrossSchemaBaseTypesXsd(), () => {});
      const derivedSchema = collection.read(getCrossSchemaDerivedTypesXsd(), () => {});

      const employeeElement = derivedSchema.getElements().get(new QName('http://www.example.com/DERIVED', 'Employee'));

      expect(employeeElement).toBeTruthy();

      const employeeType = employeeElement!.getSchemaType() as XmlSchemaComplexType;
      const extension = employeeType.getContentModel()!.getContent() as XmlSchemaComplexContentExtension;

      const particle = extension.getParticle() as XmlSchemaSequence;
      expect(particle).toBeTruthy();
      expect(particle.getItems().length).toBe(2);

      const employeeIdElem = particle.getItems()[0] as XmlSchemaElement;
      expect(employeeIdElem.getWireName()?.getLocalPart()).toBe('employeeId');

      const deptElem = particle.getItems()[1] as XmlSchemaElement;
      expect(deptElem.getWireName()?.getLocalPart()).toBe('department');

      expect(extension.getAttributes().length).toBe(1);
      const hireDateAttr = extension.getAttributes()[0] as XmlSchemaAttribute;
      expect(hireDateAttr.getName()).toBe('hireDate');
    });
  });

  describe('getUserSchemas', () => {
    it('should return only user-defined schemas, excluding standard namespaces', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCamelSpringXsd(), () => {});

      const userSchemas = collection.getUserSchemas();
      const allSchemas = collection.getXmlSchemas();

      expect(userSchemas.length).toBeLessThan(allSchemas.length);

      const standardNamespaces = ['http://www.w3.org/2001/XMLSchema', 'http://www.w3.org/XML/1998/namespace'];

      for (const schema of userSchemas) {
        const targetNs = schema.getTargetNamespace();
        expect(standardNamespaces).not.toContain(targetNs);
      }
    });

    it('should include camel-spring schema in user schemas', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCamelSpringXsd(), () => {});

      const userSchemas = collection.getUserSchemas();

      const camelSchema = userSchemas.find((s) => s.getTargetNamespace() === 'http://camel.apache.org/schema/spring');

      expect(camelSchema).toBeDefined();
    });

    it('should exclude built-in XSD schema from user schemas', () => {
      const collection = new XmlSchemaCollection();
      collection.read(getCamelSpringXsd(), () => {});

      const userSchemas = collection.getUserSchemas();

      const xsdSchema = userSchemas.find((s) => s.getTargetNamespace() === 'http://www.w3.org/2001/XMLSchema');

      expect(xsdSchema).toBeUndefined();
    });
  });

  describe('setBaseUri', () => {
    it('should set base URI on collection and resolver', () => {
      const collection = new XmlSchemaCollection();
      const testUri = 'http://example.com/schemas';

      collection.setBaseUri(testUri);

      expect(collection.baseUri).toBe(testUri);
      expect(collection.getSchemaResolver().getCollectionBaseURI()).toBe(testUri);
    });
  });

  describe('Derivation method parsing', () => {
    it('should parse final="extension restriction" on complexType in camel-spring', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getCamelSpringXsd(), () => {});
      const constantsType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://camel.apache.org/schema/spring', 'constants')) as XmlSchemaComplexType;
      expect(constantsType).toBeTruthy();
      const finalMethod = constantsType.getFinal();
      expect(finalMethod.isExtension()).toBe(true);
      expect(finalMethod.isRestriction()).toBe(true);
      expect(finalMethod.isAll()).toBe(false);
    });

    it('should parse abstract="true" on complexType in ExtensionComplex schema', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getExtensionComplexXsd(), () => {});
      const baseRequestType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/TEST', 'BaseRequest')) as XmlSchemaComplexType;
      expect(baseRequestType).toBeTruthy();
      expect(baseRequestType.isAbstract()).toBe(true);
    });

    it('should parse final="#all" as all derivation methods on complexType', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getDerivationMethodsXsd(), () => {});
      const finalAllType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/DERIVATION', 'FinalAllType')) as XmlSchemaComplexType;
      expect(finalAllType).toBeTruthy();
      expect(finalAllType.getFinal().isAll()).toBe(true);
    });

    it('should parse block="extension restriction" on complexType', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getDerivationMethodsXsd(), () => {});
      const blockType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/DERIVATION', 'BlockExtensionRestrictionType')) as XmlSchemaComplexType;
      expect(blockType).toBeTruthy();
      const blockMethod = blockType.getBlock();
      expect(blockMethod.isExtension()).toBe(true);
      expect(blockMethod.isRestriction()).toBe(true);
      expect(blockMethod.isAll()).toBe(false);
    });
  });

  describe('XmlSchema QName lookup methods', () => {
    it('should find element by QName using getElementByQName', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getShipOrderXsd(), () => {});
      const ns = xmlSchema.getTargetNamespace();
      const el = xmlSchema.getElementByQName(new QName(ns, 'ShipOrder'));
      expect(el).toBeInstanceOf(XmlSchemaElement);
    });

    it('should return null for unknown element QName', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getShipOrderXsd(), () => {});
      const el = xmlSchema.getElementByQName(new QName('http://unknown', 'nope'));
      expect(el).toBeNull();
    });

    it('should find type by QName using getTypeByQName', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getNamedTypesXsd(), () => {});
      const ns = xmlSchema.getTargetNamespace();
      const type = xmlSchema.getTypeByQName(new QName(ns, 'complexType1'));
      expect(type).toBeInstanceOf(XmlSchemaComplexType);
    });

    it('should return null for attribute QName not in schema using getAttributeByQName', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});
      const attr = xmlSchema.getAttributeByQName(new QName('http://www.example.com/CONSTRAINTS', 'nope'));
      expect(attr).toBeNull();
    });

    it('should find group by QName using getGroupByQName', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});
      const group = xmlSchema.getGroupByQName(new QName('http://www.example.com/CONSTRAINTS', 'AddressGroup'));
      expect(group).not.toBeNull();
      expect(group).toBeInstanceOf(XmlSchemaGroup);
    });

    it('should find attribute group by QName using getAttributeGroupByQName', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getSchemaTestXsd(), () => {});
      const attrGroup = xmlSchema.getAttributeGroupByQName(
        new QName('http://www.example.com/test', 'ExtendedAttributes'),
      );
      expect(attrGroup).not.toBeNull();
      expect(attrGroup).toBeInstanceOf(XmlSchemaAttributeGroup);
    });
  });

  describe('Constraints XSD parsing', () => {
    it('should parse xs:group ref as direct particle of complexType', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});

      const addressType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/CONSTRAINTS', 'AddressType')) as XmlSchemaComplexType;
      expect(addressType).toBeTruthy();
      expect(addressType.getParticle()).toBeInstanceOf(XmlSchemaGroupRef);
    });

    it('should parse xs:key constraint on element', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});

      const catalogEl = xmlSchema
        .getElements()
        .get(new QName('http://www.example.com/CONSTRAINTS', 'Catalog')) as XmlSchemaElement;
      expect(catalogEl).toBeTruthy();
      const constraints = catalogEl.getConstraints();
      const key = constraints.find((c) => c instanceof XmlSchemaKey);
      expect(key).toBeTruthy();
      expect((key as XmlSchemaKey).getName()).toBe('PersonKey');
    });

    it('should parse xs:unique constraint on element', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});

      const catalogEl = xmlSchema
        .getElements()
        .get(new QName('http://www.example.com/CONSTRAINTS', 'Catalog')) as XmlSchemaElement;
      const constraints = catalogEl.getConstraints();
      const unique = constraints.find((c) => c instanceof XmlSchemaUnique);
      expect(unique).toBeTruthy();
      expect((unique as XmlSchemaUnique).getName()).toBe('PersonNameUnique');
    });

    it('should parse xs:keyref constraint on element', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});

      const orderEl = xmlSchema
        .getElements()
        .get(new QName('http://www.example.com/CONSTRAINTS', 'Order')) as XmlSchemaElement;
      expect(orderEl).toBeTruthy();
      const constraints = orderEl.getConstraints();
      const keyref = constraints.find((c) => c instanceof XmlSchemaKeyref);
      expect(keyref).toBeTruthy();
      expect((keyref as XmlSchemaKeyref).getName()).toBe('OrderPersonRef');
    });

    it('should parse mixed="true" on complexType', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});

      const personType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/CONSTRAINTS', 'PersonType')) as XmlSchemaComplexType;
      expect(personType).toBeTruthy();
      expect(personType.isMixed()).toBe(true);
    });

    it('should collect non-reserved extension attributes on xs:attribute', () => {
      const collection = new XmlSchemaCollection();
      const xmlSchema = collection.read(getConstraintsXsd(), () => {});

      const personType = xmlSchema
        .getSchemaTypes()
        .get(new QName('http://www.example.com/CONSTRAINTS', 'PersonType')) as XmlSchemaComplexType;
      expect(personType).toBeTruthy();
      const roleAttr = personType
        .getAttributes()
        .find((a) => a instanceof XmlSchemaAttribute && a.getName() === 'role') as XmlSchemaAttribute;
      expect(roleAttr).toBeTruthy();
      expect(roleAttr.getUnhandledAttributes()).not.toBeNull();
      expect(roleAttr.getUnhandledAttributes()!.length).toBeGreaterThan(0);
    });
  });
});
