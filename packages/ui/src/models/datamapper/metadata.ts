import { DocumentDefinitionType } from './document';
import { TypeOverrideVariant } from './types';

export interface IFieldTypeOverride {
  path: string;
  type: string;
  originalType: string;
  variant: TypeOverrideVariant.SAFE | TypeOverrideVariant.FORCE;
}

export interface IDocumentMetadata {
  type: DocumentDefinitionType;
  filePath: string[];
  fieldTypeOverrides?: IFieldTypeOverride[];
}

export interface IDataMapperMetadata {
  xsltPath: string;
  sourceParameters: Record<string, IDocumentMetadata>;
  sourceBody: IDocumentMetadata;
  targetBody: IDocumentMetadata;
  namespaceMap?: Record<string, string>;
}
