import { CreateDocumentResult, DocumentType } from '../../../models/datamapper/document';
import { IMetadataApi } from '../../../providers/metadata.provider';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../../services/datamapper-step.service';
import { SchemaFileItem } from './AttachSchema/SchemaFileDataList';

const VALID_XML_EXTENSIONS = ['.xml', '.xsd'];
const VALID_JSON_EXTENSIONS = ['.json'];
export const VALID_ALL_EXTENSIONS = [...VALID_XML_EXTENSIONS, ...VALID_JSON_EXTENSIONS];

export function getFileExtension(filePath: string): string {
  return filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
}

export function getFileName(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() || filePath;
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

/**
 * Result of picking and validating schema files.
 */
export type PickSchemaFilesResult = {
  /** Selected file paths, or empty array if cancelled or validation failed */
  paths: string[];
  /** Validation error message, or null if no error */
  error: string | null;
};

/**
 * Prompts user to select schema files, normalizes the result to an array,
 * and validates file extensions and type consistency.
 *
 * This consolidates the common pattern used in both FieldOverrideModal and AttachSchemaModal:
 * - Call DataMapperMetadataService.selectDocumentSchema
 * - Normalize result to array
 * - Validate file extension
 * - Validate no mixed types (XML vs JSON)
 *
 * @param api - Metadata API context
 * @param pattern - File name pattern for file picker
 * @param documentType - Document type for validation
 * @param existingPaths - Existing file paths to check for type consistency
 * @returns Promise resolving to paths and error (if any)
 *
 * @example
 * ```ts
 * const { paths, error } = await pickAndValidateSchemaFiles(
 *   api,
 *   SCHEMA_FILE_NAME_PATTERN_XML,
 *   DocumentType.SOURCE_BODY,
 *   existingSchemas
 * );
 * if (error) {
 *   setUploadError(error);
 *   return;
 * }
 * // Process paths...
 * ```
 */
export async function pickAndValidateSchemaFiles(
  api: IMetadataApi,
  pattern: string,
  documentType: DocumentType,
  existingPaths: string[],
): Promise<PickSchemaFilesResult> {
  // Select files
  const paths = await DataMapperMetadataService.selectDocumentSchema(api, pattern);
  if (!paths || (Array.isArray(paths) && paths.length === 0)) {
    return { paths: [], error: null };
  }

  // Normalize to array
  const newPaths = Array.isArray(paths) ? paths : [paths];

  // Validate file extensions for all selected files
  for (const filePath of newPaths) {
    const ext = getFileExtension(filePath);
    const extensionError = validateFileExtension(ext, documentType);
    if (extensionError) {
      return { paths: [], error: extensionError };
    }
  }

  // Validate no mixed types among selected files
  const firstExt = getFileExtension(newPaths[0]);
  if (newPaths.length > 1) {
    for (let i = 1; i < newPaths.length; i++) {
      const ext = getFileExtension(newPaths[i]);
      if (isXmlExtension(firstExt) !== isXmlExtension(ext)) {
        return {
          paths: [],
          error: 'Cannot mix schema types. Please select files of the same type, either XML schema or JSON schema.',
        };
      }
    }
  }

  // Validate no mixed types with existing files
  const mixedTypeError = validateNoMixedTypes(firstExt, existingPaths);
  if (mixedTypeError) {
    return { paths: [], error: mixedTypeError };
  }

  return { paths: newPaths, error: null };
}
