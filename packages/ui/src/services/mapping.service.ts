import { DocumentType, IDocument, IField, IMapping } from '../models';
import { DocumentService } from './document.service';

type MappingFieldPairReturnType = {
  sourceField?: IField;
  targetField?: IField;
};

export class MappingService {
  static mappingExists(mappings: IMapping[], sourceField: IField, targetField: IField) {
    return (
      !!mappings &&
      !!mappings.find((mapping) => {
        return (
          mapping.sourceFields[0]?.fieldIdentifier.toString() === sourceField.fieldIdentifier.toString() &&
          mapping.targetFields[0]?.fieldIdentifier.toString() === targetField.fieldIdentifier.toString()
        );
      })
    );
  }

  static validateFieldPairForNewMapping(
    mappings: IMapping[],
    fromField: IField,
    toField: IField,
  ): MappingFieldPairReturnType {
    const answer: MappingFieldPairReturnType = {};
    const fromDocType = fromField.fieldIdentifier.documentType;
    const toDocType = toField.fieldIdentifier.documentType;
    if (
      fromDocType !== toDocType &&
      (fromDocType === DocumentType.TARGET_BODY || toDocType === DocumentType.TARGET_BODY)
    ) {
      const sourceField = fromDocType !== DocumentType.TARGET_BODY ? fromField : toField;
      const targetField = fromDocType !== DocumentType.TARGET_BODY ? toField : fromField;
      if (sourceField && targetField && !MappingService.mappingExists(mappings, sourceField, targetField)) {
        answer.sourceField = sourceField;
        answer.targetField = targetField;
      }
    }
    return answer;
  }

  static createNewMapping(sourceField: IField, targetField: IField) {
    return {
      id: 'mapping-' + Math.floor(Math.random() * 10000),
      name: '',
      sourceFields: [sourceField],
      targetFields: [targetField],
    } as IMapping;
  }

  static getMappingsFor(allMappings: IMapping[], field: IField) {
    if (field.ownerDocument.documentType === DocumentType.TARGET_BODY) {
      return allMappings.filter((m) => m.targetFields.indexOf(field) !== -1);
    } else {
      return allMappings.filter((m) => m.sourceFields.indexOf(field) !== -1);
    }
  }

  static removeAllMappingsForDocument(allMappings: IMapping[], documentType: DocumentType, documentId: string) {
    if (documentType === DocumentType.TARGET_BODY) {
      return allMappings.reduce((acc, mapping) => {
        const staleField = mapping.targetFields.find(
          (targetField) => targetField.fieldIdentifier.documentId === documentId,
        );
        if (!staleField) {
          acc.push(mapping);
        }
        return acc;
      }, [] as IMapping[]);
    } else {
      return allMappings.reduce((acc, mapping) => {
        const staleField = mapping.sourceFields.find(
          (sourceField) =>
            sourceField.fieldIdentifier.documentType === documentType &&
            sourceField.fieldIdentifier.documentId === documentId,
        );
        if (!staleField) {
          acc.push(mapping);
        }
        return acc;
      }, [] as IMapping[]);
    }
  }

  static removeStaleMappingsForDocument(allMappings: IMapping[], document: IDocument) {
    if (document.documentType === DocumentType.TARGET_BODY) {
      return allMappings.reduce((acc, mapping) => {
        const staleField = mapping.targetFields.find((targetField) => !DocumentService.hasField(document, targetField));
        if (!staleField) {
          acc.push(mapping);
        }
        return acc;
      }, [] as IMapping[]);
    } else {
      return allMappings.reduce((acc, mapping) => {
        const staleField = mapping.sourceFields.find(
          (sourceField) =>
            sourceField.ownerDocument.documentType === document.documentType &&
            sourceField.ownerDocument.documentId === document.documentId &&
            !DocumentService.hasField(document, sourceField),
        );
        if (!staleField) {
          acc.push(mapping);
        }
        return acc;
      }, [] as IMapping[]);
    }
  }
}
