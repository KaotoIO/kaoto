import type { MockInstance } from 'vitest';

import { IVisualizationNode } from '../models';
import { DocumentDefinition, DocumentDefinitionType } from '../models/datamapper/document';
import { IDataMapperMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import { DataMapperMetadataService } from './datamapper-metadata.service';
import { DataMapperOutputValidationService } from './datamapper-output-validation.service';
import { DataMapperStepService } from './datamapper-step.service';
import { DataMapperStepSettingsService } from './datamapper-step-settings.service';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';

describe('DataMapperStepSettingsService', () => {
  const api = {} as IMetadataApi;
  const vizNode = {} as IVisualizationNode;
  const entitiesContext = {} as EntitiesContextResult;
  let outputVariable: string | undefined;
  let validationEnabled: boolean;

  beforeEach(() => {
    outputVariable = undefined;
    validationEnabled = false;
    vi.spyOn(DataMapperStepService, 'getOutputVariable').mockImplementation(() => outputVariable);
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockImplementation(() => validationEnabled);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStepSettings', () => {
    it('should return what the step holds', () => {
      outputVariable = 'myVar';
      validationEnabled = true;

      expect(DataMapperStepSettingsService.getStepSettings(vizNode)).toEqual({
        outputVariable: 'myVar',
        isOutputValidationEnabled: true,
      });
    });
  });

  describe('updateStepSettings', () => {
    let setOutputVariableSpy: MockInstance<typeof DataMapperStepService.setOutputVariable>;
    let setOutputValidationSpy: MockInstance<typeof DataMapperOutputValidationService.setOutputValidation>;

    beforeEach(() => {
      setOutputVariableSpy = vi.spyOn(DataMapperStepService, 'setOutputVariable').mockImplementation((_n, name) => {
        outputVariable = name;
      });
      setOutputValidationSpy = vi
        .spyOn(DataMapperOutputValidationService, 'setOutputValidation')
        .mockImplementation((_api, _node, enabled) => {
          validationEnabled = enabled;
          return Promise.resolve([]);
        });
    });

    it('should write the output variable and the validation and return the model state', async () => {
      const result = await DataMapperStepSettingsService.updateStepSettings(api, vizNode, entitiesContext, {
        outputVariable: 'out',
        isOutputValidationEnabled: true,
      });

      expect(setOutputVariableSpy).toHaveBeenCalledWith(vizNode, 'out', entitiesContext);
      expect(setOutputValidationSpy).toHaveBeenCalledWith(api, vizNode, true, entitiesContext, true);
      expect(result).toEqual({ settings: { outputVariable: 'out', isOutputValidationEnabled: true }, warnings: [] });
    });

    it('should hand a disable to the validation service as well, which decides whether it changes anything', async () => {
      validationEnabled = true;

      const result = await DataMapperStepSettingsService.updateStepSettings(api, vizNode, entitiesContext, {
        outputVariable: undefined,
        isOutputValidationEnabled: false,
      });

      expect(setOutputValidationSpy).toHaveBeenCalledWith(api, vizNode, false, entitiesContext, true);
      expect(result.settings.isOutputValidationEnabled).toBe(false);
    });

    it('should forward the warnings of the validation service', async () => {
      setOutputValidationSpy.mockResolvedValue(['validating a part only']);

      const result = await DataMapperStepSettingsService.updateStepSettings(api, vizNode, entitiesContext, {
        outputVariable: undefined,
        isOutputValidationEnabled: true,
      });

      expect(result.warnings).toEqual(['validating a part only']);
      expect(result.error).toBeUndefined();
    });

    it.each([
      [true, 'enable'],
      [false, 'disable'],
    ])('should return the error, not reject, when the toggle to %s fails', async (enabled, verb) => {
      setOutputValidationSpy.mockRejectedValue(new Error('no access'));
      outputVariable = 'kept';

      const result = await DataMapperStepSettingsService.updateStepSettings(api, vizNode, entitiesContext, {
        outputVariable: 'kept',
        isOutputValidationEnabled: enabled,
      });

      expect(result.error).toBe(`Could not ${verb} output validation: no access`);
      // The settings are the real model state, not the requested ones
      expect(result.settings).toEqual({ outputVariable: 'kept', isOutputValidationEnabled: false });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(`${verb} output validation`),
        expect.any(Error),
      );
    });

    it('should describe a thrown value that is not an Error', async () => {
      setOutputValidationSpy.mockRejectedValue('plain text');

      const result = await DataMapperStepSettingsService.updateStepSettings(api, vizNode, entitiesContext, {
        outputVariable: undefined,
        isOutputValidationEnabled: true,
      });

      expect(result.error).toBe('Could not enable output validation: plain text');
    });

    it('should end with the settings of the newest call when two updates overlap', async () => {
      setOutputValidationSpy.mockRestore();
      vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockReturnValue('step-id');
      vi.spyOn(DataMapperValidationStepService, 'canAddValidationStep').mockReturnValue(true);
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {
        validationEnabled = true;
      });
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {
        validationEnabled = false;
      });
      vi.spyOn(DataMapperMetadataService, 'deleteValidationWrapper').mockResolvedValue(undefined);

      const pending: Array<() => void> = [];
      const queueApi = {
        getMetadata: vi.fn(
          () =>
            new Promise((resolve) => {
              pending.push(() => {
                resolve({
                  xsltPath: 'a.xsl',
                  targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd'] },
                });
              });
            }),
        ),
      } as unknown as IMetadataApi;

      const enable = DataMapperStepSettingsService.updateStepSettings(queueApi, vizNode, entitiesContext, {
        outputVariable: 'first',
        isOutputValidationEnabled: true,
      });
      const disable = DataMapperStepSettingsService.updateStepSettings(queueApi, vizNode, entitiesContext, {
        outputVariable: 'second',
        isOutputValidationEnabled: false,
      });

      // Only the first call reached the metadata read, the second one waits for it
      await vi.waitFor(() => {
        expect(pending).toHaveLength(1);
      });
      pending[0]();
      await enable;
      await vi.waitFor(() => {
        expect(pending).toHaveLength(2);
      });
      pending[1]();
      const last = await disable;

      expect(last.settings).toEqual({ outputVariable: 'second', isOutputValidationEnabled: false });
      expect(DataMapperStepSettingsService.getStepSettings(vizNode)).toEqual({
        outputVariable: 'second',
        isOutputValidationEnabled: false,
      });
    });

    it('should reject, and not report a validation failure, when the output variable write throws', async () => {
      setOutputVariableSpy.mockImplementation(() => {
        throw new Error('model broken');
      });

      await expect(
        DataMapperStepSettingsService.updateStepSettings(api, vizNode, entitiesContext, {
          outputVariable: 'out',
          isOutputValidationEnabled: true,
        }),
      ).rejects.toThrow('model broken');
      expect(setOutputValidationSpy).not.toHaveBeenCalled();
    });
  });

  describe('syncOnTargetChange', () => {
    const metadata = { xsltPath: 'a.xsl' } as IDataMapperMetadata;
    const definition = {} as DocumentDefinition;
    let syncSpy: MockInstance<typeof DataMapperOutputValidationService.syncOnTargetChange>;

    beforeEach(() => {
      syncSpy = vi.spyOn(DataMapperOutputValidationService, 'syncOnTargetChange').mockResolvedValue(false);
    });

    it('should return only the validation flag of the model', async () => {
      outputVariable = 'untouched';
      validationEnabled = true;

      const result = await DataMapperStepSettingsService.syncOnTargetChange(
        api,
        vizNode,
        entitiesContext,
        metadata,
        definition,
        undefined,
      );

      expect(result).toEqual({ settings: { isOutputValidationEnabled: true }, warnings: [] });
      expect(syncSpy).toHaveBeenCalledWith(
        api,
        vizNode,
        entitiesContext,
        metadata,
        definition,
        undefined,
        expect.any(Array),
      );
    });

    it('should forward the warnings reported by the validation service', async () => {
      syncSpy.mockImplementation((_api, _node, _ctx, _meta, _def, _previousType, warnings) => {
        warnings?.push('Schema file(s) missing');
        return Promise.resolve(true);
      });

      const result = await DataMapperStepSettingsService.syncOnTargetChange(
        api,
        vizNode,
        entitiesContext,
        metadata,
        definition,
        undefined,
      );

      expect(result.warnings).toEqual(['Schema file(s) missing']);
    });

    it('should return the error, not reject, when the sync fails', async () => {
      syncSpy.mockRejectedValue(new Error('read only'));
      validationEnabled = true;

      const result = await DataMapperStepSettingsService.syncOnTargetChange(
        api,
        vizNode,
        entitiesContext,
        metadata,
        definition,
        undefined,
      );

      expect(result.error).toBe('Could not update output validation: read only');
      expect(result.settings).toEqual({ isOutputValidationEnabled: true });
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('update output validation'), expect.any(Error));
    });
  });
});
