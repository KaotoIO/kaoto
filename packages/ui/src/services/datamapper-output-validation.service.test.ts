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

    it('should also append the problems to the list given by the caller', async () => {
      api.saveResourceContent.mockRejectedValue(new Error('read only'));
      const reported: string[] = [];

      await resolveValidationResource(
        api as unknown as IMetadataApi,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd', 'B.xsd'] },
        XSLT_PATH,
        twoUnconnected,
        reported,
      );

      expect(reported).toHaveLength(1);
      expect(reported[0]).toContain('read only');
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

    it('should return the problems found while resolving the schema', async () => {
      api.getMetadata.mockResolvedValue(metadata(['A.xsd', 'B.xsd']));
      api.saveResourceContent.mockRejectedValue(new Error('read only'));
      files = { ...twoUnconnected };
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      const warnings = await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('read only');
    });

    it('should return no problems when there is nothing to report', async () => {
      api.getMetadata.mockResolvedValue(metadata(['A.xsd']));
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      const warnings = await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(warnings).toEqual([]);
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

    it('should refuse to enable validation for a JSON target and report why', async () => {
      api.getMetadata.mockResolvedValue({
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['A.json', 'B.json'] },
      } as IDataMapperMetadata);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      const warnings = await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(addSpy).not.toHaveBeenCalled();
      expect(warnings).toEqual(['Output validation for JSON schemas is not supported yet.']);
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

    it('should repoint the step before deleting the now-stale wrapper, not after', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const callOrder: string[] = [];
      vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {
        callOrder.push('updateValidationStep');
      });
      const realDeleteResource = api.deleteResource.getMockImplementation()! as (path: string) => Promise<boolean>;
      api.deleteResource.mockImplementation((path: string) => {
        callOrder.push('deleteResource');
        return realDeleteResource(path);
      });

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd']),
        xmlDefinition({ 'A.xsd': schema('urn:a', 'A') }),
        DocumentDefinitionType.XML_SCHEMA,
      );

      // A step pointing at a since-deleted wrapper is worse than a harmless orphan wrapper file.
      expect(callOrder).toEqual(['updateValidationStep', 'deleteResource']);
    });

    it('should remove the step through removeValidationStep and delete the wrapper for a Primitive target', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});

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

      expect(removeSpy).toHaveBeenCalledWith(vizNode, entitiesContext);
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should remove the step and delete the wrapper when the target becomes an unsupported JSON schema', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        {
          xsltPath: XSLT_PATH,
          targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['schema.json'] },
        } as unknown as IDataMapperMetadata,
        {
          definitionType: DocumentDefinitionType.JSON_SCHEMA,
          filePath: ['schema.json'],
        } as unknown as DocumentDefinition,
        DocumentDefinitionType.XML_SCHEMA,
      );

      expect(removeSpy).toHaveBeenCalledWith(vizNode, entitiesContext);
      expect(updateSpy).not.toHaveBeenCalled();
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should not auto-add the validator when the target goes from Primitive to an unsupported JSON schema', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        {
          xsltPath: XSLT_PATH,
          targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['A.json'] },
        } as unknown as IDataMapperMetadata,
        { definitionType: DocumentDefinitionType.JSON_SCHEMA, filePath: ['A.json'] } as unknown as DocumentDefinition,
        DocumentDefinitionType.Primitive,
      );

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('should auto-add the validator when the target goes from an unsupported JSON schema to XML', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['A.xsd']),
        xmlDefinition({ 'A.xsd': schema('urn:a', 'A') }),
        DocumentDefinitionType.JSON_SCHEMA,
      );

      expect(addSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['A.xsd'] }),
        entitiesContext,
        'A.xsd',
      );
    });

    it('documents: a detach then re-attach re-enables a validator the user turned off (accepted until #4408)', async () => {
      // previousType only reflects the target right before *this* change. A user can turn validation off on a
      // schema target, detach it (XML_SCHEMA -> Primitive, previousType becomes Primitive), then attach a schema
      // again: the intermediate Primitive makes this second attach look "newly attached", so it re-enables
      // validation even though the user disabled it. There is no persisted opt-out to tell the two cases apart
      // (see shouldEnableOnTargetChange's TSDoc); #4408 will let the user choose explicitly at attach time instead.
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      await syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        xmlMetadata(['B.xsd']),
        xmlDefinition({ 'B.xsd': schema('urn:b', 'B') }),
        DocumentDefinitionType.Primitive,
      );

      expect(addSpy).toHaveBeenCalledWith(
        vizNode,
        expect.objectContaining({ filePath: ['B.xsd'] }),
        entitiesContext,
        'B.xsd',
      );
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
  describe('short-circuit of an enable', () => {
    it('should do no work, and read no metadata, when enabling an already enabled step', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});

      const warnings = await setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext);

      expect(warnings).toEqual([]);
      expect(api.getMetadata).not.toHaveBeenCalled();
      expect(api.saveResourceContent).not.toHaveBeenCalled();
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('should still delete the stale wrapper when disabling a step without validator', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
      api.getMetadata.mockResolvedValue({ xsltPath: XSLT_PATH } as IDataMapperMetadata);

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, false, entitiesContext);

      expect(files[WRAPPER_PATH]).toBeUndefined();
    });
  });

  describe('skipIfUnchanged', () => {
    it('should do no work, and read no metadata, when disabling a step without validator', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});

      const warnings = await setOutputValidation(api as unknown as IMetadataApi, vizNode, false, entitiesContext, true);

      expect(warnings).toEqual([]);
      expect(api.getMetadata).not.toHaveBeenCalled();
      expect(api.isResourceExist).not.toHaveBeenCalled();
      expect(removeSpy).not.toHaveBeenCalled();
      // The stale wrapper is left for the explicit toggle-off, a Save that changed nothing does not probe for it
      expect(files[WRAPPER_PATH]).toBeDefined();
    });

    it('should still disable a step that has a validator', async () => {
      files[WRAPPER_PATH] = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
      api.getMetadata.mockResolvedValue({ xsltPath: XSLT_PATH } as IDataMapperMetadata);

      await setOutputValidation(api as unknown as IMetadataApi, vizNode, false, entitiesContext, true);

      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(files[WRAPPER_PATH]).toBeUndefined();
    });

    it('should read the state when its turn comes, not when it was called', async () => {
      let validator = false;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockImplementation(() => validator);
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {
        validator = true;
      });
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {
        validator = false;
      });
      let release!: (value: IDataMapperMetadata) => void;
      api.getMetadata.mockImplementation(
        () =>
          new Promise<IDataMapperMetadata>((resolve) => {
            release = resolve;
          }),
      );

      // The step has no validator when both calls are made; the second one only sees the first one's result
      const enable = setOutputValidation(api as unknown as IMetadataApi, vizNode, true, entitiesContext, true);
      const disable = setOutputValidation(api as unknown as IMetadataApi, vizNode, false, entitiesContext, true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      release({
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd'] },
      } as IDataMapperMetadata);
      await enable;
      await new Promise((resolve) => setTimeout(resolve, 0));
      release({ xsltPath: XSLT_PATH } as IDataMapperMetadata);
      await disable;

      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(validator).toBe(false);
    });
  });

  describe('per-step serialisation', () => {
    const nodeA = { id: 'a' } as unknown as IVisualizationNode;
    const nodeB = { id: 'b' } as unknown as IVisualizationNode;
    const singleFile = {
      xsltPath: XSLT_PATH,
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd'] },
    };
    const queues = () => (DataMapperOutputValidationService as unknown as { queues: Map<string, unknown> }).queues;
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const deferred = <T>() => {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
    let pending: Array<ReturnType<typeof deferred<IDataMapperMetadata | undefined>>>;
    let added: string[];

    const enable = (node: IVisualizationNode) =>
      setOutputValidation(api as unknown as IMetadataApi, node, true, entitiesContext);

    beforeEach(() => {
      pending = [];
      added = [];
      vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockImplementation(
        (node) => (node as unknown as { id: string }).id,
      );
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation((node) => {
        added.push((node as unknown as { id: string }).id);
      });
      api.getMetadata.mockImplementation(() => {
        const next = deferred<IDataMapperMetadata | undefined>();
        pending.push(next);
        return next.promise;
      });
    });

    afterEach(async () => {
      // The queue is module state: never leave a call pending. Releasing one call starts the next, which pushes
      // another deferred, so drain until nothing is left.
      for (let i = 0; i < 10 && queues().size > 0; i++) {
        for (const next of pending) next.resolve(undefined);
        await flush();
      }
      expect(queues().size).toBe(0);
    });

    it('should run two calls for the same step one after the other, in call order', async () => {
      const first = enable(nodeA);
      const second = enable(nodeA);
      await flush();

      expect(api.getMetadata).toHaveBeenCalledTimes(1);

      pending[0].resolve(singleFile as IDataMapperMetadata);
      await first;
      await flush();
      expect(api.getMetadata).toHaveBeenCalledTimes(2);
      pending[1].resolve(singleFile as IDataMapperMetadata);
      await second;

      expect(added).toEqual(['a', 'a']);
    });

    it('should read the metadata of the second call only after the first one finished, and complete in call order', async () => {
      const first = enable(nodeA);
      const second = enable(nodeA);
      await flush();
      // Without the queue both calls would be waiting for their own read here
      expect(pending).toHaveLength(1);
      const order: string[] = [];
      void first.then(() => order.push('first'));
      void second.then(() => order.push('second'));

      pending[0].resolve(singleFile as IDataMapperMetadata);
      await flush();
      expect(pending).toHaveLength(2);
      pending[1].resolve(singleFile as IDataMapperMetadata);
      await Promise.all([first, second]);

      expect(order).toEqual(['first', 'second']);
    });

    it('should not block a different step', async () => {
      const blocked = enable(nodeA);
      const other = enable(nodeB);
      await flush();

      expect(api.getMetadata).toHaveBeenCalledTimes(2);
      pending[1].resolve(singleFile as IDataMapperMetadata);
      await other;
      expect(added).toEqual(['b']);

      pending[0].resolve(singleFile as IDataMapperMetadata);
      await blocked;
    });

    it('should run the next call after a failed one, and give the failure to its own caller', async () => {
      const first = enable(nodeA);
      const second = enable(nodeA);
      await flush();

      pending[0].reject(new Error('read failed'));
      await expect(first).rejects.toThrow('read failed');
      await flush();
      pending[1].resolve(singleFile as IDataMapperMetadata);

      await expect(second).resolves.toEqual([]);
      expect(added).toEqual(['a']);
    });

    it('should not keep an entry for a step once its last call settled', async () => {
      const first = enable(nodeA);
      const second = enable(nodeA);
      await flush();
      expect(queues().size).toBe(1);

      pending[0].resolve(undefined);
      await first;
      await flush();
      pending[1].resolve(undefined);
      await second;
      await flush();

      expect(queues().size).toBe(0);
    });

    it('should leave no wrapper when a toggle-off is queued behind a target change', async () => {
      // Real model state of the validator, so "nothing left behind" is asserted on state
      let validator = true;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockImplementation(() => validator);
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {
        validator = false;
      });
      vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
      const syncSave = deferred<void>();
      files = { ...twoUnconnected };
      api.saveResourceContent.mockImplementation(async (path: string, content: string) => {
        await syncSave.promise;
        files[path] = content;
      });
      const metadata = {
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: Object.keys(twoUnconnected) },
      } as IDataMapperMetadata;

      const sync = syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        nodeA,
        entitiesContext,
        metadata,
        {
          definitionType: DocumentDefinitionType.XML_SCHEMA,
          definitionFiles: twoUnconnected,
        } as unknown as DocumentDefinition,
      );
      const toggleOff = setOutputValidation(api as unknown as IMetadataApi, nodeA, false, entitiesContext);
      await flush();
      expect(api.getMetadata).not.toHaveBeenCalled();

      syncSave.resolve();
      await sync;
      await flush();
      pending[0].resolve(metadata);
      await toggleOff;

      expect(files[WRAPPER_PATH]).toBeUndefined();
      expect(validator).toBe(false);
    });

    it('should not let a target change write a wrapper after a toggle-off deleted it', async () => {
      let validator = true;
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockImplementation(() => validator);
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {
        validator = false;
      });
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
      files = { ...twoUnconnected };
      const metadata = {
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: Object.keys(twoUnconnected) },
      } as IDataMapperMetadata;

      const toggleOff = setOutputValidation(api as unknown as IMetadataApi, nodeA, false, entitiesContext);
      await flush();
      const sync = syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        nodeA,
        entitiesContext,
        metadata,
        {
          definitionType: DocumentDefinitionType.XML_SCHEMA,
          definitionFiles: twoUnconnected,
        } as unknown as DocumentDefinition,
        DocumentDefinitionType.XML_SCHEMA,
      );
      await flush();
      // The toggle-off holds the queue at its metadata read: the sync has not started
      expect(api.saveResourceContent).not.toHaveBeenCalled();

      pending[0].resolve(metadata);
      await toggleOff;
      await expect(sync).resolves.toBe(false);

      expect(files[WRAPPER_PATH]).toBeUndefined();
      expect(api.saveResourceContent).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(validator).toBe(false);
    });

    it('should throw synchronously, and leave no queue entry, when the step has no metadata id', async () => {
      vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockImplementation(() => {
        throw new Error('no id');
      });

      expect(() => enable(nodeA)).toThrow('no id');
      expect(queues().size).toBe(0);
    });

    it('should sync with the target body it was called with, not one changed while queued', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
      const metadata = {
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['A.xsd'] },
      } as IDataMapperMetadata;
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
      // A disable is never short-circuited, so it holds the queue until its metadata read is released
      const blocked = setOutputValidation(api as unknown as IMetadataApi, nodeA, false, entitiesContext);
      await flush();

      const sync = syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        nodeA,
        entitiesContext,
        metadata,
        { definitionType: DocumentDefinitionType.XML_SCHEMA, definitionFiles: {} } as unknown as DocumentDefinition,
      );
      // The host reassigns the target body of its shared metadata object for the next target change
      metadata.targetBody = { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['B.xsd'] };

      pending[0].resolve(undefined);
      await blocked;
      await sync;

      expect(updateSpy).toHaveBeenCalledWith(
        nodeA,
        expect.objectContaining({ filePath: ['A.xsd'] }),
        entitiesContext,
        'A.xsd',
      );
    });
  });

  describe('write-if-changed on a target change', () => {
    const definitionOf = (definitionFiles: Record<string, string>) =>
      ({ definitionType: DocumentDefinitionType.XML_SCHEMA, definitionFiles }) as unknown as DocumentDefinition;
    const metadataOf = (definitionFiles: Record<string, string>) =>
      ({
        xsltPath: XSLT_PATH,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: Object.keys(definitionFiles) },
      }) as IDataMapperMetadata;
    const sync = (definitionFiles: Record<string, string>) =>
      syncOutputValidationOnTargetChange(
        api as unknown as IMetadataApi,
        vizNode,
        entitiesContext,
        metadataOf(definitionFiles),
        definitionOf(definitionFiles),
      );

    beforeEach(() => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);
      vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    });

    // The target sync runs for the field override, choice selection and abstract substitution actions of the
    // Field Context Menu as well, because each of them fires a TARGET_BODY update.
    it('should write no file again for a repeated sync (field override, choice selection, abstract substitution)', async () => {
      await sync(twoUnconnected);
      expect(files[WRAPPER_PATH]).toBeDefined();
      api.saveResourceContent.mockClear();

      await sync(twoUnconnected);

      expect(api.saveResourceContent).not.toHaveBeenCalled();
    });

    it('should write the wrapper when the schema content changed', async () => {
      await sync(twoUnconnected);
      api.saveResourceContent.mockClear();

      await sync({ 'A.xsd': schema('urn:a2', 'A'), 'B.xsd': twoUnconnected['B.xsd'] });

      expect(api.saveResourceContent).toHaveBeenCalledTimes(1);
      expect(api.saveResourceContent).toHaveBeenCalledWith(WRAPPER_PATH, expect.any(String));
    });

    describe('with an aggregator', () => {
      const connected = {
        'root.xsd': schema('urn:root', 'Root'),
        'ext1.xsd': schema('urn:ext', 'E1'),
        'ext2.xsd': schema('urn:ext', 'E2'),
      };
      const AGGREGATOR_PATH = 'mapping-validation-wrapper-1.xsd';

      it('should write nothing for a repeated sync and only the aggregator when its content changed', async () => {
        await sync(connected);
        expect(files[AGGREGATOR_PATH]).toBeDefined();
        api.saveResourceContent.mockClear();

        await sync(connected);
        expect(api.saveResourceContent).not.toHaveBeenCalled();

        await sync({ ...connected, 'ext3.xsd': schema('urn:ext', 'E3') });
        expect(api.saveResourceContent).toHaveBeenCalledWith(AGGREGATOR_PATH, expect.stringContaining('ext3.xsd'));
        expect(files[AGGREGATOR_PATH]).toContain('ext3.xsd');
      });
    });
  });
});
