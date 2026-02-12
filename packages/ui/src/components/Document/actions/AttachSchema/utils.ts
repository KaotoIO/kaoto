import { CreateDocumentResult, DocumentType } from '../../../../models/datamapper/document';
import { DataMapperStepService } from '../../../../services/datamapper-step.service';
import { SchemaFileItem } from './SchemaFileDataList';

const VALID_XML_EXTENSIONS = ['.xml', '.xsd'];
const VALID_JSON_EXTENSIONS = ['.json'];
export const VALID_ALL_EXTENSIONS = [...VALID_XML_EXTENSIONS, ...VALID_JSON_EXTENSIONS];

export function getFileExtension(filePath: string): string {
  return filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
}

export function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

export function isXmlExtension(ext: string): boolean {
  return VALID_XML_EXTENSIONS.includes(ext);
}

export function isJsonExtension(ext: string): boolean {
  return VALID_JSON_EXTENSIONS.includes(ext);
}

export function validateFileExtension(ext: string, documentType: DocumentType): string | undefined {
  if (documentType === DocumentType.SOURCE_BODY) {
    if (isJsonExtension(ext) && !DataMapperStepService.supportsJsonBody()) {
      return 'JSON source body is not supported. The xslt-saxon component requires the useJsonBody parameter which is not available in this Camel version. Please use parameter for JSON source.';
    }
    if (!isXmlExtension(ext) && !isJsonExtension(ext)) {
      return `Unknown file extension '${ext}'. Only XML schema file (.xml, .xsd) is supported.`;
    }
    return undefined;
  }
  if (!VALID_ALL_EXTENSIONS.includes(ext)) {
    return `Unknown file extension '${ext}'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.`;
  }
  return undefined;
}

export function validateNoMixedTypes(ext: string, existingFilePaths: string[]): string | undefined {
  if (existingFilePaths.length === 0) return undefined;
  const existingExt = getFileExtension(existingFilePaths[0]);
  const existingIsXml = isXmlExtension(existingExt);
  const newIsXml = isXmlExtension(ext);
  if (existingIsXml !== newIsXml) {
    return `Cannot mix schema types. Please select files of the same type, either XML schema or JSON schema.`;
  }
  return undefined;
}

const STATUS_ORDER = { error: 0, warning: 1, success: 2 };

export function createSchemaFileItems(
  createDocumentResult: CreateDocumentResult | null,
  filePaths: string[],
): SchemaFileItem[] {
  if (!createDocumentResult) return [];

  const items: SchemaFileItem[] = [];

  for (const fp of filePaths) {
    const fileName = getFileName(fp);
    const matches = (filePath?: string) => filePath === fp || filePath === fileName;
    const fileErrors = createDocumentResult.errors?.filter((e) => matches(e.filePath)) ?? [];
    const fileWarnings = createDocumentResult.warnings?.filter((w) => matches(w.filePath)) ?? [];

    if (fileErrors.length > 0) {
      items.push({
        filePath: fp,
        status: 'error',
        messages: [...fileErrors.map((e) => e.message), ...fileWarnings.map((w) => w.message)],
      });
    } else if (fileWarnings.length > 0) {
      items.push({
        filePath: fp,
        status: 'warning',
        messages: fileWarnings.map((w) => w.message),
      });
    } else {
      items.push({ filePath: fp, status: 'success', messages: [] });
    }
  }

  for (const e of createDocumentResult.errors?.filter((e) => !e.filePath) ?? []) {
    items.push({ status: 'error', messages: [e.message] });
  }
  for (const w of createDocumentResult.warnings?.filter((w) => !w.filePath) ?? []) {
    items.push({ status: 'warning', messages: [w.message] });
  }

  items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return items;
}
