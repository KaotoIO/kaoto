import {
  ConditionItem,
  FieldItem,
  IFieldItem,
  IForEach,
  IFunctionCall,
  IFunctionCallArgumentType,
  IMapping,
  ITransformation,
  MappingTree,
  MappingItem,
} from '../models/mapping';
import { DocumentType, IDocument, IField } from '../models/document';
import { DocumentService } from './document.service';
import { TransformationService } from './transformation.service';
import { XPathParserService } from './xpath/xpath-parser.service';
import { IMappingLink } from '../models/visualization';

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

  static getMappingsFor(mappingTree: MappingTree, field: IField) {
    if (field.ownerDocument.documentType !== DocumentType.TARGET_BODY) return;
    DocumentService.return;
    allMappings.filter((m) => m.targetFields.indexOf(field) !== -1);
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

  static removeAllMappingsForDocument(mappingTree: MappingTree, documentType: DocumentType, documentId: string) {
    if (documentType === DocumentType.TARGET_BODY) {
      MappingService.doRemoveAllMappingsForTargetDocument(mappingTree, documentId);
    } else {
      MappingService.doRemoveAllMappingsForSourceDocument(mappingTree, documentType, documentId);
    }
    return mappingTree;
  }

  private static doRemoveAllMappingsForTargetDocument(item: MappingTree | MappingItem, documentId: string) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveAllMappingsForTargetDocument(child, documentId);
      if (child instanceof FieldItem && documentId !== child.field.ownerDocument.documentId) {
        acc.push(child);
      } else if (!('isCondition' in child) || child.children.length > 0) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static doRemoveAllMappingsForSourceDocument(
    item: MappingTree | MappingItem,
    documentType: DocumentType,
    documentId: string,
  ) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveAllMappingsForSourceDocument(child, documentType, documentId);
      if (
        'expression' in child &&
        !MappingService.hasStaleSourceDocument(child.expression as string, documentType, documentId)
      ) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceDocument(expression: string, documentType: DocumentType, documentId: string) {
    const stalePath = XPathParserService.extractFieldPaths(expression).find((xpath) => {
      const parsedPath = XPathParserService.parsePath(xpath);
      return (
        (documentType === DocumentType.SOURCE_BODY && !parsedPath.paramName) ||
        (documentType === DocumentType.PARAM && parsedPath.paramName === documentId)
      );
    });
    return !!stalePath;
  }

  static removeStaleMappingsForDocument(mappingTree: MappingTree, document: IDocument) {
    if (document.documentType === DocumentType.TARGET_BODY) {
      MappingService.doRemoveStaleMappingsForTargetDocument(mappingTree, document);
    } else {
      MappingService.doRemoveStaleMappingsForSourceDocument(mappingTree, document);
    }
    return mappingTree;
  }

  private static doRemoveStaleMappingsForTargetDocument(item: MappingTree | MappingItem, document: IDocument) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForTargetDocument(child, document);
      if (child instanceof FieldItem && DocumentService.hasField(document, child.field)) {
        acc.push(child);
      } else if (!('isCondition' in child) || child.children.length > 0) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static doRemoveStaleMappingsForSourceDocument(item: MappingTree | MappingItem, document: IDocument) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForSourceDocument(child, document);
      if ('expression' in child && !MappingService.hasStaleSourceField(child.expression as string, document)) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceField(expression: string, document: IDocument) {
    const stalePath = XPathParserService.extractFieldPaths(expression).find((xpath) => {
      const parsedPath = XPathParserService.parsePath(xpath);
      if (
        (document.documentType === DocumentType.SOURCE_BODY && !parsedPath.paramName) ||
        (document.documentType === DocumentType.PARAM && parsedPath.paramName === document.documentId)
      ) {
        return !DocumentService.getFieldFromPathSegments(document, parsedPath.segments);
      }
    });
    return !!stalePath;
  }

  static wrapWithIf() {
    alert('TODO');
  }

  static wrapWithChoose() {
    alert('TODO');
  }

  static extractMappingLinks(item: MappingTree | MappingItem) {
    const answer = [] as IMappingLink[];
    if ('expression' in item) {
      const targetPath = item.nodeIdentifier.toString();
      XPathParserService.extractFieldPaths(item.expression as string).map((sourcePath) =>
        answer.push({ sourceTreePath: sourcePath, targetTreePath: targetPath }),
      );
    }
    if ('children' in item) {
      item.children.map((child) => {
        answer.push(...MappingService.extractMappingLinks(child));
      });
    }
    return answer;
  }
}
