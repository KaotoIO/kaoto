import {
  DocumentType,
  IDocument,
  IField,
  IFieldItem,
  IForEach,
  IFunctionCall,
  IFunctionCallArgumentType,
  IMapping,
  ITransformation,
} from '../models';
import { DocumentService } from './document.service';
import { TransformationService } from './transformation.service';

type MappingFieldPairReturnType = {
  existing?: IMapping;
  sourceField?: IField;
  targetField?: IField;
};

export class MappingService {
  static validateNewFieldPairForMapping(
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
      const existingMappings = MappingService.getMappingsFor(mappings, targetField);
      if (existingMappings.length > 0) {
        answer.existing = existingMappings[0];
      }
      if (sourceField && targetField) {
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
      source: TransformationService.createTransformationWithField(sourceField),
      targetFields: [targetField],
    } as IMapping;
  }

  static getMappingsFor(allMappings: IMapping[], field: IField) {
    if (field.ownerDocument.documentType === DocumentType.TARGET_BODY) {
      return allMappings.filter((m) => m.targetFields.indexOf(field) !== -1);
    } else {
      return allMappings.filter((m) => MappingService.isFieldInTransformation(m.source, field));
    }
  }

  static extractSourceFields(transformation: ITransformation) {
    return transformation.elements.reduce((acc, element) => {
      if ('arguments' in element) {
        acc.push(...MappingService.extractSourceFieldsFromArguments((element as IFunctionCall).arguments));
      } else if ('transformation' in element) {
        acc.push(...MappingService.extractSourceFields((element as IForEach).transformation));
      } else if ('field' in element) {
        acc.push((element as IFieldItem).field);
      }
      return acc;
    }, [] as IField[]);
  }

  static extractSourceFieldsFromArguments(args: IFunctionCallArgumentType[]) {
    return args.reduce((acc, arg) => {
      if ('arguments' in arg) {
        acc.push(...MappingService.extractSourceFieldsFromArguments((arg as IFunctionCall).arguments));
      } else if ('field' in arg) {
        acc.push((arg as IFieldItem).field);
      }
      return acc;
    }, [] as IField[]);
  }

  static isFieldInTransformation(transformation: ITransformation, field: IField) {
    return MappingService.extractSourceFields(transformation).find((f) => f === field) !== undefined;
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
        const staleField = MappingService.extractSourceFields(mapping.source).find(
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
        const staleField = MappingService.extractSourceFields(mapping.source).find(
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
