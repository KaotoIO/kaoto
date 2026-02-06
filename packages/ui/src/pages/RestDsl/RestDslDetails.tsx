import {
  CanvasFormTabsContext,
  CanvasFormTabsContextResult,
  FieldWrapper,
  KaotoForm,
  Typeahead,
  TypeaheadItem,
} from '@kaoto/forms';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  EmptyStateBody,
  Popover,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';
import { FunctionComponent, RefObject } from 'react';

import { customFieldsFactoryfactory } from '../../components/Visualization/Canvas/Form/fields/custom-fields-factory';
import { SuggestionRegistrar } from '../../components/Visualization/Canvas/Form/suggestions/SuggestionsProvider';
import { RestEditorSelection, SelectedFormState, ToUriSchema } from './restDslTypes';

type RestDslDetailsProps = {
  formKey: string;
  selectedFormState?: SelectedFormState;
  selection: RestEditorSelection | undefined;
  formTabsValue: CanvasFormTabsContextResult;
  toUriSchema?: ToUriSchema;
  toUriFieldRef: RefObject<HTMLDivElement | null>;
  selectedToUriItem?: TypeaheadItem<string>;
  directEndpointItems: TypeaheadItem<string>[];
  toUriValue: string;
  directRouteExists: boolean;
  onToUriChange: (item?: TypeaheadItem<string>) => void;
  onToUriClear: () => void;
  onCreateDirectRoute: () => void;
  onChangeProp: (path: string, value: unknown) => void;
};

export const RestDslDetails: FunctionComponent<RestDslDetailsProps> = ({
  formKey,
  selectedFormState,
  selection,
  formTabsValue,
  toUriSchema,
  toUriFieldRef,
  selectedToUriItem,
  directEndpointItems,
  toUriValue,
  directRouteExists,
  onToUriChange,
  onToUriClear,
  onCreateDirectRoute,
  onChangeProp,
}) => {
  return (
    <SplitItem className="rest-dsl-page-pane rest-dsl-page-pane-form" isFilled>
      <Card className="rest-dsl-page-panel">
        <CardHeader className="rest-dsl-page-panel-header">
          <Title headingLevel="h2" size="md" className="rest-dsl-page-panel-title">
            {selectedFormState?.title ?? 'Details'}
          </Title>
        </CardHeader>
        <CardBody className="rest-dsl-page-panel-body">
          {selectedFormState ? (
            <CanvasFormTabsContext.Provider value={formTabsValue}>
              <SuggestionRegistrar>
                {selection?.kind === 'operation' && (
                  <FieldWrapper
                    propName="to.uri"
                    required={toUriSchema?.required ?? false}
                    title={toUriSchema?.title ?? 'To URI'}
                    type="string"
                    description={toUriSchema?.description}
                    defaultValue={toUriSchema?.defaultValue?.toString()}
                  >
                    <div className="rest-dsl-page-to-uri-row" ref={toUriFieldRef}>
                      <Typeahead
                        aria-label={toUriSchema?.title ?? 'To URI'}
                        data-testid="rest-operation-to-uri"
                        selectedItem={selectedToUriItem}
                        items={directEndpointItems}
                        placeholder="Select or write a direct endpoint"
                        id="rest-operation-to-uri"
                        onChange={onToUriChange}
                        onCleanInput={onToUriClear}
                        allowCustomInput
                      />
                      <Popover
                        bodyContent={
                          directRouteExists
                            ? 'A route with this direct endpoint already exists.'
                            : 'Create a new route that uses this direct endpoint as its input.'
                        }
                        triggerAction="hover"
                        withFocusTrap={false}
                      >
                        <span>
                          <Button
                            variant="secondary"
                            onClick={onCreateDirectRoute}
                            isDisabled={!toUriValue || directRouteExists}
                          >
                            Create Route
                          </Button>
                        </span>
                      </Popover>
                    </div>
                  </FieldWrapper>
                )}
                <KaotoForm
                  key={formKey}
                  schema={selectedFormState.entity.getNodeSchema(selectedFormState.path) ?? {}}
                  model={selectedFormState.entity.getNodeDefinition(selectedFormState.path) ?? {}}
                  onChangeProp={onChangeProp}
                  omitFields={selectedFormState.omitFields}
                  customFieldsFactory={customFieldsFactoryfactory}
                />
              </SuggestionRegistrar>
            </CanvasFormTabsContext.Provider>
          ) : (
            <Bullseye>
              <EmptyState headingLevel="h3" icon={CodeIcon} titleText="Nothing selected">
                <EmptyStateBody>Select a Rest element to start editing.</EmptyStateBody>
              </EmptyState>
            </Bullseye>
          )}
        </CardBody>
      </Card>
    </SplitItem>
  );
};
