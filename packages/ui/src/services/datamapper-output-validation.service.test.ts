import { IVisualizationNode } from '../models';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { IDataMapperMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import { DataMapperOutputValidationService } from './datamapper-output-validation.service';
import { DataMapperStepService } from './datamapper-step.service';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';
import { XmlSchemaWrapperGeneratorService } from './document/xml-schema/xml-schema-wrapper-generator.service';
import {
  GENERATED_WRAPPER_MARKER,
  GENERATED_WRAPPER_NOTICE,
} from './document/xml-schema/xml-schema-wrapper-generator.service';

const resolveValidationResource = DataMapperOutputValidationService.resolveValidationResource.bind(
  DataMapperOutputValidationService,
);
const setOutputValidation = DataMapperOutputValidationService.setOutputValidation.bind(
  DataMapperOutputValidationService,
);
const syncOutputValidationOnTargetChange = DataMapperOutputValidationService.syncOnTargetChange.bind(
  DataMapperOutputValidationService,
);

const schema = (ns: string, element: string) => `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}">
  <xs:element name="${element}" type="xs:string"/>
</xs:schema>`;

const XSLT_PATH = 'mapping.xsl';
const WRAPPER_PATH = 'mapping-validation-wrapper.xsd';

describe('DataMapperOutputValidationService', () => {
  let files: Record<string, string>;
  let api: { [K in keyof IMetadataApi]: ReturnType<typeof vi.fn> };
  const vizNode = {} as IVisualizationNode;
  let canAdd = true;
  const entitiesContext = {} as EntitiesContextResult;

  const twoUnconnected = { 'A.xsd': schema('urn:a', 'A'), 'B.xsd': schema('urn:b', 'B') };

  beforeEach(() => {
    files = {};
    api = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      isResourceExist: vi.fn((path: string) => Promise.resolve(files[path] !== undefined)),
      getResourceContent: vi.fn((path: string) => Promise.resolve(files[path])),
      saveResourceContent: vi.fn((path: string, content: string) => {
        files[path] = content;
        return Promise.resolve();
      }),
      deleteResource: vi.fn((path: string) => {
        delete files[path];
        return Promise.resolve(true);
      }),
      askUserForFileSelection: vi.fn(),
      shouldSaveSchema: false,
    } as unknown as typeof api;
    vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockReturnValue('id');
    canAdd = true;
    vi.spyOn(DataMapperValidationStepService, 'canAddValidationStep').mockImplementation(() => canAdd);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveValidationResource', () => {
    it('should use the single file and not create a wrapper', async () => {
      const uri = await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd'] },
        XSLT_PATH,
        { 'A.xsd': schema('urn:a', 'A') },
      );

      expect(uri).toBe('A.xsd');
      expect(api.saveResourceContent).not.toHaveBeenCalled();
    });

    it('should write a wrapper and return its URI for two unconnected files', async () => {
      const uri = await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd', 'B.xsd'] },
        XSLT_PATH,
        twoUnconnected,
      );

      expect(uri).toBe(WRAPPER_PATH);
      expect(XmlSchemaWrapperGeneratorService.isGeneratedWrapper(files[WRAPPER_PATH])).toBe(true);
    });

    it('should fall back to the first file when saving the wrapper fails', async () => {
      api.saveResourceContent.mockRejectedValue(new Error('read only'));

      const uri = await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd', 'B.xsd'] },
        XSLT_PATH,
        twoUnconnected,
      );

      expect(uri).toBe('A.xsd');
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('read only'));
    });

    it('should delete a stale generated wrapper when a single file remains', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;

      await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd'] },
        XSLT_PATH,
        { 'A.xsd': schema('urn:a', 'A') },
      );

      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should not delete a user file with the wrapper name', async () => {
      files[WRAPPER_PATH] = '<xs:schema/>';

      await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd'] },
        XSLT_PATH,
        { 'A.xsd': schema('urn:a', 'A') },
      );

      expect(files[WRAPPER_PATH]).toBe('<xs:schema/>');
    });

    it('should report missing files with console.warn', async () => {
      await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd', 'B.xsd'] },
        XSLT_PATH,
        { 'A.xsd': schema('urn:a', 'A') },
      );

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('B.xsd'));
    });

    it('should return the file path for a JSON schema', async () => {
      const uri = await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['s.json'] },
        XSLT_PATH,
        {},
      );

      expect(uri).toBe('s.json');
    });
  });

  describe('setOutputValidation', () => {
    const metadata = (filePath: string[]): IDataMapperMetadata =>
      ({
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath },
      }) as IDataMapperMetadata;

    it('should add the validator pointing to the single file', async () => {
      api.getMetadata.mockResolvedValue(metadata(['A.xsd']));
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(addSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['A.xsd'] }),
        entitiesContext,
        'A.xsd',
      );
    });

    it('should add the validator pointing to the wrapper for two unconnected files', async () => {
      files = { ...twoUnconnected };
      api.getMetadata.mockResolvedValue(metadata(['A.xsd', 'B.xsd']));
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(addSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['A.xsd', 'B.xsd'] }),
        entitiesContext,
        WRAPPER_PATH,
      );
      expect(files[WRAPPER_PATH]).toBeDefined();
    });

    it('should do nothing without metadata when enabling', async () => {
      api.getMetadata.mockResolvedValue(undefined);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('should remove the step and the generated wrapper when disabling', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      api.getMetadata.mockResolvedValue(metadata(['A.xsd', 'B.xsd']));
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, false, entitiesContext);

      expect(removeSpy).toHaveBeenCalledWith(vizNode, entitiesContext);
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should not delete a user file with the wrapper name when disabling', async () => {
      files[WRAPPER_PATH] = '<xs:schema/>';
      api.getMetadata.mockResolvedValue(metadata(['A.xsd']));
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, false, entitiesContext);

      expect(files[WRAPPER_PATH]).toBe('<xs:schema/>');
    });
  });

  describe('syncOutputValidationOnTargetChange', () => {
    const xmlDefinition = (definitionFiles: Record<string, string>) =>
      ({
        definitionType: DocumentDefinitionType.XML_SCHEMA,
        filePath: Object.keys(definitionFiles),
        definitionFiles,
      }) as unknown as DocumentDefinition;
    const xmlMetadata = (filePath: string[]): IDataMapperMetadata =>
      ({
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath },
      }) as IDataMapperMetadata;

    it('should update the validator with the wrapper URI when enabled and several files are unconnected', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd', 'B.xsd']),
        xmlDefinition(twoUnconnected),
        DocumentDefinitionType.XML_SCHEMA,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['A.xsd', 'B.xsd'] }),
        entitiesContext,
        WRAPPER_PATH,
      );
      expect(files[WRAPPER_PATH]).toBeDefined();
    });

    it('should delete a stale wrapper when going from several files to one', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd']),
        xmlDefinition({ 'A.xsd': schema('urn:a', 'A') }),
        DocumentDefinitionType.XML_SCHEMA,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['A.xsd'] }),
        entitiesContext,
        'A.xsd',
      );
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should remove the step through updateValidationStep and delete the wrapper for a Primitive target', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        {
          xsltPath: XSLT_PATH,
          targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        } as unknown as IDataMapperMetadata,
        { definitionType: DocumentDefinitionType.Primitive, filePath: [] } as unknown as DocumentDefinition,
        DocumentDefinitionType.XML_SCHEMA,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ type: DocumentDefinitionType.Primitive }),
        entitiesContext,
      );
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should auto-add the validator when the target goes from Primitive to a schema', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd']),
        xmlDefinition({ 'A.xsd': schema('urn:a', 'A') }),
        DocumentDefinitionType.Primitive,
      );

      expect(addSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['A.xsd'] }),
        entitiesContext,
        'A.xsd',
      );
    });

    it('should keep validation disabled when the user disabled it on a schema target', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});

      const result = await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd']),
        xmlDefinition({ 'A.xsd': schema('urn:a', 'A') }),
        DocumentDefinitionType.XML_SCHEMA,
      );

      expect(addSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return the validation state read after the sync', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      const result = await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd']),
        xmlDefinition({ 'A.xsd': schema('urn:a', 'A') }),
        undefined,
      );

      expect(result).toBe(true);
    });
  });

  describe('without an XSLT step', () => {
    it('should not write a wrapper when enabling validation', async () => {
      canAdd = false;
      files = { ...twoUnconnected };
      api.getMetadata.mockResolvedValue({
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd', 'B.xsd'] },
      } as IDataMapperMetadata);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(addSpy).not.toHaveBeenCalled();
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should not write a wrapper on target change', async () => {
      canAdd = false;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
      const definitionFiles = twoUnconnected;
      const metadata = {
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: Object.keys(definitionFiles) },
      } as IDataMapperMetadata;

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        metadata,
        { definitionType: DocumentDefinitionType.XML_SCHEMA, definitionFiles } as unknown as DocumentDefinition,
        DocumentDefinitionType.Primitive,
      );

      expect(addSpy).not.toHaveBeenCalled();
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });
  });
});
