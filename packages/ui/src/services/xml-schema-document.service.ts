import {
  XmlSchema,
  XmlSchemaAll,
  XmlSchemaAny,
  XmlSchemaAllMember,
  XmlSchemaAttribute,
  XmlSchemaAttributeGroup,
  XmlSchemaAttributeGroupMember,
  XmlSchemaAttributeGroupRef,
  XmlSchemaAttributeOrGroupRef,
  XmlSchemaChoice,
  XmlSchemaChoiceMember,
  XmlSchemaCollection,
  XmlSchemaComplexType,
  XmlSchemaElement,
  XmlSchemaGroup,
  XmlSchemaGroupParticle,
  XmlSchemaGroupRef,
  XmlSchemaObjectBase,
  XmlSchemaParticle,
  XmlSchemaRef,
  XmlSchemaSequence,
  XmlSchemaSequenceMember,
  XmlSchemaSimpleType,
} from '@datamapper-poc/xml-schema-ts';
import { BaseDocument, BaseField } from '../models';

export class XmlSchemaDocument extends BaseDocument {
  rootElement: XmlSchemaElement;
  fields: XmlSchemaField[] = [];

  constructor(public xmlSchema: XmlSchema) {
    super();
    if (this.xmlSchema.getElements().size == 0) {
      throw Error("There's no top level Element in the schema");
    }
    // TODO let user choose the root element from top level elements if there're multiple
    this.rootElement = XmlSchemaDocumentService.getFirstElement(this.xmlSchema);
    XmlSchemaDocumentService.populateElement(this.fields, this.rootElement);
    this.type = 'XML';
  }
}

export class XmlSchemaField extends BaseField {
  fields: XmlSchemaField[] = [];
  namespaceURI: string | null = '';
  namespacePrefix: string | null = '';
}

export class XmlSchemaDocumentService {
  static parseXmlSchema(content: string): XmlSchemaDocument {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(content, () => {});
    return new XmlSchemaDocument(xmlSchema);
  }

  static getFirstElement(xmlSchema: XmlSchema) {
    return xmlSchema.getElements().values().next().value;
  }

  /**
   * @deprecated
   */
  static throwNotYetSupported(object: XmlSchemaObjectBase) {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const cache: any[] = [];
    throw Error(
      `Not yet supported: ${JSON.stringify(object, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.includes(value)) return;
          cache.push(value);
        }
        if (typeof value === 'bigint') return value.toString();
      })}`,
    );
  }

  static populateElement(fields: XmlSchemaField[], element: XmlSchemaElement) {
    const field: XmlSchemaField = new XmlSchemaField();
    field.name = element.getWireName()!.getLocalPart()!;
    field.namespaceURI = element.getWireName()!.getNamespaceURI();
    field.namespacePrefix = element.getWireName()!.getPrefix();
    fields.push(field);

    const schemaType = element.getSchemaType();
    if (schemaType == null) {
      field.type = element.getSchemaTypeName()?.getLocalPart() || 'string';
      return;
    }
    field.type = 'container';
    if (schemaType instanceof XmlSchemaSimpleType) {
      XmlSchemaDocumentService.throwNotYetSupported(element);
    } else if (schemaType instanceof XmlSchemaComplexType) {
      const complex = schemaType as XmlSchemaComplexType;
      const attributes: XmlSchemaAttributeOrGroupRef[] = complex.getAttributes();
      attributes.forEach((attr) => {
        XmlSchemaDocumentService.populateAttributeOrGroupRef(field.fields, attr);
      });
      XmlSchemaDocumentService.populateParticle(field.fields, complex.getParticle());
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(element);
    }
  }

  static populateAttributeOrGroupRef(fields: XmlSchemaField[], attr: XmlSchemaAttributeOrGroupRef) {
    if (attr instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(fields, attr);
    } else if (attr instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(fields, attr);
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(attr);
    }
  }

  static populateAttribute(fields: XmlSchemaField[], attr: XmlSchemaAttribute) {
    const field = new XmlSchemaField();
    field.isAttribute = true;
    field.name = attr.getWireName()!.getLocalPart()!;
    field.namespaceURI = attr.getWireName()!.getNamespaceURI();
    field.namespacePrefix = attr.getWireName()!.getPrefix();
    fields.push(field);
  }

  static populateAttributeGroupRef(fields: XmlSchemaField[], groupRef: XmlSchemaAttributeGroupRef) {
    const ref: XmlSchemaRef<XmlSchemaAttributeGroup> = groupRef.getRef();
    XmlSchemaDocumentService.populateAttributeGroup(fields, ref.getTarget());
  }

  static populateAttributeGroupMember(fields: XmlSchemaField[], member: XmlSchemaAttributeGroupMember) {
    if (member instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(fields, member);
    } else if (member instanceof XmlSchemaAttributeGroup) {
      XmlSchemaDocumentService.populateAttributeGroup(fields, member);
    } else if (member instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(fields, member);
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(member);
    }
  }

  static populateAttributeGroup(fields: XmlSchemaField[], group: XmlSchemaAttributeGroup | null) {
    if (group == null) {
      return;
    }
    group
      .getAttributes()
      .forEach((member: XmlSchemaAttributeGroupMember) =>
        XmlSchemaDocumentService.populateAttributeGroupMember(fields, member),
      );
  }

  static populateParticle(fields: XmlSchemaField[], particle: XmlSchemaParticle | null) {
    if (particle == null) {
      return;
    }
    if (particle instanceof XmlSchemaAny) {
      XmlSchemaDocumentService.populateAny(fields, particle);
    } else if (particle instanceof XmlSchemaElement) {
      XmlSchemaDocumentService.populateElement(fields, particle);
    } else if (particle instanceof XmlSchemaGroupParticle) {
      XmlSchemaDocumentService.populateGroupParticle(fields, particle);
    } else if (particle instanceof XmlSchemaGroupRef) {
      XmlSchemaDocumentService.populateGroupRef(fields, particle);
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(particle);
    }
  }

  static populateAny(_fields: XmlSchemaField[], schemaAny: XmlSchemaAny) {
    /* TODO - xs:any allows arbitrary elements */
    XmlSchemaDocumentService.throwNotYetSupported(schemaAny);
  }

  static populateGroupParticle(fields: XmlSchemaField[], groupParticle: XmlSchemaGroupParticle | null) {
    if (groupParticle == null) {
      return;
    }
    if (groupParticle instanceof XmlSchemaChoice) {
      const choice = groupParticle as XmlSchemaChoice;
      choice
        .getItems()
        .forEach((member: XmlSchemaChoiceMember) => XmlSchemaDocumentService.populateChoiceMember(fields, member));
    } else if (groupParticle instanceof XmlSchemaSequence) {
      const sequence = groupParticle as XmlSchemaSequence;
      sequence
        .getItems()
        .forEach((member: XmlSchemaSequenceMember) => XmlSchemaDocumentService.populateSequenceMember(fields, member));
    } else if (groupParticle instanceof XmlSchemaAll) {
      const all = groupParticle as XmlSchemaAll;
      all
        .getItems()
        .forEach((member: XmlSchemaAllMember) => XmlSchemaDocumentService.populateAllMember(fields, member));
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(groupParticle);
    }
  }

  static populateGroupRef(_fields: XmlSchemaField[], groupRef: XmlSchemaGroupRef) {
    XmlSchemaDocumentService.throwNotYetSupported(groupRef);
  }

  static populateChoiceMember(fields: XmlSchemaField[], member: XmlSchemaChoiceMember) {
    if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(fields, member);
    } else if (member instanceof XmlSchemaGroup) {
      XmlSchemaDocumentService.populateGroup(fields, member);
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(member);
    }
  }

  static populateSequenceMember(fields: XmlSchemaField[], member: XmlSchemaSequenceMember) {
    if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(fields, member);
    } else if (member instanceof XmlSchemaGroup) {
      XmlSchemaDocumentService.populateGroup(fields, member);
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(member);
    }
  }

  static populateAllMember(fields: XmlSchemaField[], member: XmlSchemaAllMember) {
    if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(fields, member);
    } else if (member instanceof XmlSchemaGroup) {
      XmlSchemaDocumentService.populateGroup(fields, member);
    } else {
      XmlSchemaDocumentService.throwNotYetSupported(member);
    }
  }

  static populateGroup(fields: XmlSchemaField[], group: XmlSchemaGroup) {
    XmlSchemaDocumentService.populateParticle(fields, group.getParticle());
  }
}
