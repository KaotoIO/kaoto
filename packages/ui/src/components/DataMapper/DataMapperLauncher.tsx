/*
    Copyright (C) 2024 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import './DataMapperLauncher.scss';

import { Tools } from '@carbon/icons-react';
import { Button, Callout, Checkbox, FormGroup, InlineNotification, Link } from '@carbon/react';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { FieldWrapper, isDefined } from '@kaoto/forms';
import {
  type ChangeEvent,
  FunctionComponent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router';

import { IVisualizationNode, ValidationResult, ValidationStatus } from '../../models';
import { DocumentDefinitionType } from '../../models/datamapper/document';
import { IStepSettingsResult } from '../../models/datamapper/settings';
import { EntitiesContext } from '../../providers';
import { MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperOutputValidationService } from '../../services/datamapper-output-validation.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { DataMapperStepSettingsService } from '../../services/datamapper-step-settings.service';
import { isXSLTComponent } from '../../utils';
import type { XsltComponentDef } from '../../utils/is-xslt-component';
import { OutputVariableField } from './OutputVariableField';
import XsltDocumentRenameInput from './XsltDocumentRenameInput';

const VALIDATE_OUTPUT_DESCRIPTION =
  'Adds a Validator step after this step that checks the output against the target schema at runtime.';

/** Error and warnings are rendered as mutually exclusive, so one state holds at most one of them, never both. */
type ValidationMessage = { kind: 'error'; text: string } | { kind: 'warnings'; items: string[] };

function toValidationMessage(result: IStepSettingsResult): ValidationMessage | undefined {
  if (result.error) return { kind: 'error', text: result.error };
  if (result.warnings.length > 0) return { kind: 'warnings', items: result.warnings };
  return undefined;
}

// XSLT filename validation regex
// Valid filename rules:
// - must end with .xsl
// - filename before extension cannot be empty
// - disallow invalid filename characters
// eslint-disable-next-line no-control-regex
const XSLT_FILENAME_REGEX = /^(?!\.)([^<>:"/\\|?*\x00-\x1F]+)\.(xsl)$/i;
const XSLT_FILENAME_REQUIRED = 'XSLT document name is required.';
const XSLT_FILENAME_FORMAT_ERROR = 'XSLT document name must be a valid filename ending with .xsl.';
const XSLT_FILENAME_ALREADY_EXISTS = 'An XSLT document with this name already exists.';
const DATAMAPPER_NOT_CONFIGURABLE_TITLE_ID = 'datamapper-not-configurable-title';

const DataMapperLauncherContent: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const navigate = useNavigate();
  const metadata = useContext(MetadataContext);
  const entitiesContext = useContext(EntitiesContext);

  const [xsltFileExists, setXsltFileExists] = useState<boolean>(false);
  const [currentFileName, setCurrentFileName] = useState<string | undefined>(undefined);
  const [isEditingFilename, setIsEditingFilename] = useState<boolean>(false);
  const [isSavingFile, setIsSavingFile] = useState<boolean>(false);
  const [renameError, setRenameError] = useState<string | undefined>(undefined);
  // useState lazy initializer: a synchronous model read, so a step with validation on never flashes an
  // unchecked box while the async checks below are still running.
  const [isValidationEnabled, setIsValidationEnabled] = useState<boolean>(() =>
    vizNode ? DataMapperStepSettingsService.getStepSettings(vizNode).isOutputValidationEnabled : false,
  );
  const [isValidationTogglePending, setIsValidationTogglePending] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<ValidationMessage | undefined>(undefined);
  // Unknown until the async check below resolves the real target type. Treated as supported in the meantime (see
  // isValidationSupported below), so a step with validation on does not flash unchecked while this is unresolved.
  const [targetType, setTargetType] = useState<DocumentDefinitionType | undefined>(undefined);
  // The async checks decide whether the checkbox can be enabled. Until they, or a later re-check, are done it is
  // rendered disabled. The group itself only depends on the XSLT document being defined (a synchronous, model-only
  // check), so it is never hidden or shown again by the async checks, and nothing in the panel shifts after paint.
  const [isChecking, setIsChecking] = useState<boolean>(true);
  // useState lazy initializer: getOutputVariable is called once at mount, not on every render.
  const [outputVariableName, setOutputVariableName] = useState<string>(
    () => (vizNode ? DataMapperStepService.getOutputVariable(vizNode) : undefined) ?? '',
  );

  const xsltDocumentName = useMemo(() => {
    const defModel = vizNode?.data.definition as Record<string, unknown> | undefined;
    const xsltComponent = (defModel?.steps as ProcessorDefinition[] | undefined)?.find(isXSLTComponent) as
      | XsltComponentDef
      | undefined;
    const fileName = DataMapperStepService.getXsltFileName(xsltComponent);
    // Use local state if set, otherwise use the value from vizNode
    return currentFileName ?? fileName;
  }, [vizNode, currentFileName]);

  const isXsltDocumentDefined = useMemo(() => {
    return isDefined(xsltDocumentName);
  }, [xsltDocumentName]);

  useEffect(() => {
    let cancelled = false;
    // Messages of an earlier toggle must not come back when the Output Validation group is shown again.
    const clearValidationMessages = () => {
      setValidationMessage(undefined);
    };
    const checkFile = async () => {
      if (!xsltDocumentName || !metadata) {
        setXsltFileExists(false);
        clearValidationMessages();
        return;
      }
      const exists = await metadata.isResourceExist(xsltDocumentName);
      if (cancelled) return;
      setXsltFileExists(exists);
      if (!exists) clearValidationMessages();

      if (vizNode) {
        setIsValidationEnabled(DataMapperStepSettingsService.getStepSettings(vizNode).isOutputValidationEnabled);
        const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
        const type = await DataMapperMetadataService.getTargetBodyType(metadata, metadataId);
        if (cancelled) return;
        setTargetType(type);
        if (!DataMapperOutputValidationService.isValidationSupported(type)) clearValidationMessages();
      }
    };
    checkFile()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [xsltDocumentName, metadata, vizNode]);

  const isValidationGroupShown = isXsltDocumentDefined;
  // Assumed supported while targetType is still unknown, so a step with validation on does not flash unchecked.
  const isValidationSupported =
    targetType === undefined || DataMapperOutputValidationService.isValidationSupported(targetType);
  // A pending toggle only gets `aria-disabled`, not `disabled`: the checkbox the user just interacted with keeps
  // keyboard focus instead of dropping it. `handleValidationToggle` itself refuses a second call while pending.
  const isValidationCheckboxDisabled = isChecking || !xsltFileExists || !isValidationSupported || isSavingFile;
  const validationDescription =
    targetType !== undefined && !isValidationSupported
      ? DataMapperOutputValidationService.describeUnsupportedValidation(targetType)
      : VALIDATE_OUTPUT_DESCRIPTION;
  const validationMessageId = useId();

  const validateDocumentName = useCallback(
    async (value: string): Promise<ValidationResult> => {
      // Basic validation first (synchronous)
      if (!value) {
        return { status: ValidationStatus.Error, errMessages: [XSLT_FILENAME_REQUIRED] };
      }

      if (!XSLT_FILENAME_REGEX.test(value)) {
        return { status: ValidationStatus.Error, errMessages: [XSLT_FILENAME_FORMAT_ERROR] };
      }

      // Check for file existence (asynchronous)
      if (value !== xsltDocumentName && metadata) {
        const exists = await metadata.isResourceExist(value);
        if (exists) {
          return { status: ValidationStatus.Error, errMessages: [XSLT_FILENAME_ALREADY_EXISTS] };
        }
      }

      return { status: ValidationStatus.Success, errMessages: [] };
    },
    [xsltDocumentName, metadata],
  );

  const handleChange = useCallback(
    async (newPath: string) => {
      const oldPath = xsltDocumentName;

      if (newPath === oldPath || !vizNode || !metadata || !entitiesContext || !oldPath) {
        return;
      }

      setIsSavingFile(true);
      setRenameError(undefined);
      try {
        // A toggle that is still running could write the wrapper under the old name.
        if (isValidationTogglePending) {
          throw new Error('Output validation is being updated, try again in a moment.');
        }
        const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
        await DataMapperMetadataService.renameXsltFile(metadata, metadataId, newPath, (renames) => {
          DataMapperStepService.applyResourceRenamesToNode(vizNode, renames, entitiesContext);
          // The route points to the new files from here on, whatever happens to the old ones.
          setCurrentFileName(newPath);
          setXsltFileExists(true);
        });
      } catch (error) {
        // The input shows its own generic message; this is the reason.
        setRenameError(error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setIsSavingFile(false);
      }
    },
    [xsltDocumentName, metadata, entitiesContext, vizNode, isValidationTogglePending],
  );

  const handleEditingStateChange = useCallback((isEditing: boolean) => {
    setIsEditingFilename(isEditing);
    // A reason belongs to the edit it came from: cancelling the edit removes it.
    setRenameError(undefined);
  }, []);

  const handleValidationToggle = useCallback(
    async (_event: ChangeEvent<HTMLInputElement>, { checked }: { checked: boolean }) => {
      if (!vizNode || !entitiesContext || !metadata || isValidationTogglePending) return;
      setIsValidationTogglePending(true);
      setValidationMessage(undefined);
      try {
        const result = await DataMapperStepSettingsService.updateStepSettings(metadata, vizNode, entitiesContext, {
          ...DataMapperStepSettingsService.getStepSettings(vizNode),
          isOutputValidationEnabled: checked,
        });
        setValidationMessage(toValidationMessage(result));
      } catch (err) {
        console.warn('[DataMapperLauncher] Failed to toggle output validation:', err);
        setValidationMessage({
          kind: 'error',
          text: `Could not ${checked ? 'enable' : 'disable'} output validation, see the log for details.`,
        });
      } finally {
        setIsValidationEnabled(DataMapperStepSettingsService.getStepSettings(vizNode).isOutputValidationEnabled);
        setIsValidationTogglePending(false);
      }
    },
    [vizNode, entitiesContext, metadata, isValidationTogglePending],
  );

  const handleOutputVariableNameChange = useCallback(
    (value: string) => {
      setOutputVariableName(value);
      if (vizNode && entitiesContext) {
        // Write the valid name immediately; clear the step when empty/blank so an
        // invalid name is never persisted to the route YAML.
        DataMapperStepService.setOutputVariable(
          vizNode,
          DataMapperStepService.isValidOutputVariableName(value) ? value : undefined,
          entitiesContext,
        );
      }
    },
    [vizNode, entitiesContext],
  );

  const onClick = useCallback(async () => {
    await navigate(`${Links.DataMapper}/${(vizNode?.data.definition as Record<string, unknown> | undefined)?.id}`);
  }, [navigate, vizNode]);

  if (!isDefined(metadata)) {
    return (
      <Callout
        className="data-mapper-not-configurable"
        kind="warning"
        lowContrast
        title="The Kaoto DataMapper cannot be configured"
        titleId={DATAMAPPER_NOT_CONFIGURABLE_TITLE_ID}
        subtitle={
          <>
            At the moment, the Kaoto DataMapper cannot be configured using the browser directly. Please use the Kaoto VS
            Code extension for an enhanced experience. The Kaoto extension can be found at the{' '}
            <Link
              href="https://marketplace.visualstudio.com/items?itemName=redhat.vscode-kaoto"
              aria-describedby={DATAMAPPER_NOT_CONFIGURABLE_TITLE_ID}
              inline
            >
              Visual Studio Code Marketplace
            </Link>{' '}
            or in the{' '}
            <Link
              href="https://open-vsx.org/extension/redhat/vscode-kaoto"
              aria-describedby={DATAMAPPER_NOT_CONFIGURABLE_TITLE_ID}
              inline
            >
              Open VSX Registry
            </Link>
            .
          </>
        }
      />
    );
  }

  return (
    <section className="data-mapper-launcher">
      {xsltFileExists && (
        <>
          <FieldWrapper
            propName="xslt-document"
            title="Document"
            description="The name of the XSLT document that is used by the Kaoto DataMapper"
            defaultValue=""
          >
            <XsltDocumentRenameInput
              value={xsltDocumentName}
              onChange={handleChange}
              onEditingStateChange={handleEditingStateChange}
              validator={validateDocumentName}
              textTitle="XSLT document name"
              editTitle="Edit document name"
              data-testid="xslt-document-name"
            />
          </FieldWrapper>
          {renameError && (
            <InlineNotification
              data-testid="xslt-document-rename-error"
              kind="error"
              lowContrast
              hideCloseButton
              title=""
              subtitle={renameError}
            />
          )}
        </>
      )}
      {isValidationGroupShown && (
        <FormGroup legendText="Output validation">
          <Checkbox
            id="validate-output"
            labelText="Validate output"
            helperText={validationDescription}
            checked={isValidationSupported && isValidationEnabled}
            disabled={isValidationCheckboxDisabled}
            aria-disabled={isValidationTogglePending || undefined}
            aria-describedby={validationMessage ? validationMessageId : undefined}
            onChange={handleValidationToggle}
            data-testid="validate-output-checkbox"
          />
          {validationMessage && (
            <div id={validationMessageId} data-testid="validate-output-helper-text">
              {validationMessage.kind === 'error' ? (
                <InlineNotification
                  kind="error"
                  role="alert"
                  lowContrast
                  hideCloseButton
                  title=""
                  subtitle={validationMessage.text}
                />
              ) : (
                validationMessage.items.map((warning) => (
                  <InlineNotification
                    key={warning}
                    kind="warning"
                    lowContrast
                    hideCloseButton
                    title=""
                    subtitle={warning}
                  />
                ))
              )}
            </div>
          )}
        </FormGroup>
      )}
      <OutputVariableField
        value={outputVariableName}
        onChange={handleOutputVariableNameChange}
        isDisabled={!vizNode || !entitiesContext}
      />
      {(!xsltFileExists || !isXsltDocumentDefined) && (
        <InlineNotification
          className="data-mapper-missing-configuration"
          kind="error"
          lowContrast
          hideCloseButton
          title=""
          subtitle="This Kaoto DataMapper step is missing some configuration. Please click the configure button to configure it."
        />
      )}
      <Button
        kind="primary"
        title="Click to launch the Kaoto DataMapper editor"
        aria-label="Launch the Kaoto DataMapper editor"
        onClick={onClick}
        renderIcon={Tools}
        disabled={isSavingFile || isEditingFilename}
      >
        Configure
      </Button>
    </section>
  );
};

/**
 * Canvas form header for a Kaoto DataMapper step.
 *
 * The content is keyed by the DataMapper step id so that its local state, such as the output variable name being
 * edited or a renamed XSLT document name, never carries over to another DataMapper step. The canvas side panel is
 * keyed by the path-based `vizNode.id`, which is only unique within a route, so two DataMapper steps at the same
 * position in different routes would otherwise share one component instance.
 */
export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => (
  <DataMapperLauncherContent
    key={vizNode ? DataMapperStepService.getDataMapperMetadataId(vizNode) : undefined}
    vizNode={vizNode}
  />
);

export default DataMapperLauncher;
