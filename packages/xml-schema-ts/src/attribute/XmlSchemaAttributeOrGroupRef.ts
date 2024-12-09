import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

/**
 * Several objects in the model allow either an XmlSchemaAttribute or
 * an XmlSchemaAttributeGroupRef. This type is here only allow
 * tight type specifications for them.
 */
export class XmlSchemaAttributeOrGroupRef extends XmlSchemaAnnotated {}
