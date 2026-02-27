import './RestDslNav.scss';

import { Button, Card, CardBody, CardHeader, List, ListItem, SplitItem, Title } from '@patternfly/react-core';
import { PlusIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { RestDslOperationList } from './components/RestDslOperationList';
import { RestEditorSelection, RestVerb } from './restDslTypes';

type RestDslNavProps = {
  navWidth: number | string;
  restConfiguration?: CamelRestConfigurationVisualEntity;
  restEntities: CamelRestVisualEntity[];
  restMethods: RestVerb[];
  selection: RestEditorSelection | undefined;
  canAddRestEntities: boolean;
  canDeleteRestEntities: boolean;
  onCreateRestConfiguration: () => void;
  onDeleteRestConfiguration: () => void;
  onSelectRestConfiguration: () => void;
  onCreateRest: () => void;
  onDeleteRest: (restEntity: CamelRestVisualEntity) => void;
  onSelectRest: (restId: string) => void;
  onAddOperation: (restId: string) => void;
  onSelectOperation: (restId: string, verb: RestVerb, index: number) => void;
  onDeleteOperation: (restEntity: CamelRestVisualEntity, verb: RestVerb, index: number) => void;
  getListItemClass: (selection: RestEditorSelection | undefined, target: RestEditorSelection) => string;
};

export const RestDslNav: FunctionComponent<RestDslNavProps> = ({
  navWidth,
  restConfiguration,
  restEntities,
  restMethods,
  selection,
  canAddRestEntities,
  canDeleteRestEntities,
  onCreateRestConfiguration,
  onDeleteRestConfiguration,
  onSelectRestConfiguration,
  onCreateRest,
  onDeleteRest,
  onSelectRest,
  onAddOperation,
  onSelectOperation,
  onDeleteOperation,
  getListItemClass,
}) => {
  return (
    <SplitItem className="rest-dsl-page-pane rest-dsl-page-pane-nav" style={{ flexBasis: navWidth }}>
      <Card className="rest-dsl-nav-panel">
        <CardHeader className="rest-dsl-nav-panel-header">
          <div className="rest-dsl-nav-header">
            <Title headingLevel="h2" size="md" className="rest-dsl-nav-panel-title">
              Rest DSL
            </Title>
          </div>
        </CardHeader>
        <CardBody className="rest-dsl-nav-panel-body">
          <div className="rest-dsl-nav-section-header">
            <Title headingLevel="h3" className="rest-dsl-nav-section-title">
              <span className="rest-dsl-nav-section-title-text">Rest Configuration</span>
            </Title>
            <div className="rest-dsl-nav-section-actions">
              <Button
                variant="secondary"
                icon={<PlusIcon />}
                onClick={onCreateRestConfiguration}
                isDisabled={!canAddRestEntities || Boolean(restConfiguration)}
              >
                Add
              </Button>
            </div>
          </div>
          {restConfiguration ? (
            <List className="rest-dsl-nav-list">
              <ListItem>
                <div className="rest-dsl-nav-rest-header">
                  <Button
                    variant="plain"
                    className={getListItemClass(selection, { kind: 'restConfiguration' })}
                    onClick={onSelectRestConfiguration}
                    aria-label="Select Rest Configuration"
                    aria-pressed={selection?.kind === 'restConfiguration'}
                  >
                    Rest Configuration
                  </Button>
                  <div className="rest-dsl-nav-rest-actions">
                    <Button
                      variant="plain"
                      icon={<TrashIcon />}
                      aria-label="Delete Rest Configuration"
                      onClick={onDeleteRestConfiguration}
                      isDisabled={!canDeleteRestEntities}
                    />
                  </div>
                </div>
              </ListItem>
            </List>
          ) : (
            <p className="rest-dsl-nav-empty-text">No rest configuration found.</p>
          )}

          <div className="rest-dsl-nav-section-header">
            <Title headingLevel="h3" className="rest-dsl-nav-section-title">
              <span className="rest-dsl-nav-section-title-text">Rest Services</span>
            </Title>
            <div className="rest-dsl-nav-section-actions">
              <Button variant="secondary" icon={<PlusIcon />} onClick={onCreateRest} isDisabled={!canAddRestEntities}>
                Add
              </Button>
            </div>
          </div>
          {restEntities.length === 0 ? (
            <p className="rest-dsl-nav-empty-text">No rest elements found.</p>
          ) : (
            <List className="rest-dsl-nav-list">
              {restEntities.map((restEntity) => {
                const restDefinition = restEntity.restDef?.rest ?? {};
                const restLabel =
                  (typeof restDefinition.id === 'string' && restDefinition.id.trim()) ||
                  (typeof restDefinition.path === 'string' && restDefinition.path.trim()) ||
                  restEntity.id ||
                  'rest';
                return (
                  <ListItem key={restEntity.id}>
                    <div className="rest-dsl-nav-rest-group">
                      <div className="rest-dsl-nav-rest-header">
                        <Button
                          variant="plain"
                          className={getListItemClass(selection, { kind: 'rest', restId: restEntity.id })}
                          onClick={() => onSelectRest(restEntity.id)}
                          aria-label={`Select REST service ${restLabel}`}
                          aria-pressed={selection?.kind === 'rest' && selection.restId === restEntity.id}
                        >
                          {restLabel}
                        </Button>
                        <div className="rest-dsl-nav-rest-actions">
                          <Button variant="link" icon={<PlusIcon />} onClick={() => onAddOperation(restEntity.id)}>
                            Add Operation
                          </Button>
                          <Button
                            variant="plain"
                            icon={<TrashIcon />}
                            aria-label="Delete Rest Element"
                            onClick={() => onDeleteRest(restEntity)}
                            isDisabled={!canDeleteRestEntities}
                          />
                        </div>
                      </div>
                      <RestDslOperationList
                        restEntity={restEntity}
                        restDefinition={restDefinition as Record<string, unknown>}
                        restMethods={restMethods}
                        selection={selection}
                        onSelectOperation={onSelectOperation}
                        onDeleteOperation={onDeleteOperation}
                        getListItemClass={getListItemClass}
                      />
                    </div>
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardBody>
      </Card>
    </SplitItem>
  );
};
