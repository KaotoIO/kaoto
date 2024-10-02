import { useNavigate } from 'react-router-dom';
import { CodeEditor, CodeEditorControl, Language } from '@patternfly/react-code-editor';
import {
  HelperText,
  HelperTextItem,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Form,
  FormGroup,
  InputGroup,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useState, useEffect } from 'react';
import styles from '@patternfly/react-styles/css/components/Form/form';
import { BaseVisualCamelEntity, CamelRouteVisualEntity } from '../../models';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import HelpIcon from '@patternfly/react-icons/dist/esm/icons/help-icon';
import { EntitiesContext } from '../../providers/entities.provider';
import { OpenApi } from '../../models/camel/openapi-resource';
import { RouteDefinition, RestDefinition } from '@kaoto/camel-catalog/types';
import { Rest } from '@kaoto/camel-catalog/types';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { Links } from '../../router/links.models';
import { parse } from 'yaml';
import { EntityType } from '../../models/camel/entities';

export const OpenApiForm: FunctionComponent = () => {
  const [openApiError, setOpenApiError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadSpecificationOpen, setDownloadSpecificationOpen] = useState(false);
  const [specification, setSpecification] = useState('');
  const [specificationTypeLanguage, setSpecificationTypeLanguage] = useState(Language.json);
  const entitiesContext = useContext(EntitiesContext);
  const navigate = useNavigate();

  const onEditorDidMount = (editor, monaco) => {
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0].updateOptions({ tabSize: 5 });
  };

  const updateDownloadUrl = (url: string) => {
    setDownloadUrl(url);
  };

  const showDownloadSpecification = () => {
    setDownloadSpecificationOpen(true);
  };

  const downloadFromUrl = () => {
    console.log('Downloading from URL ' + downloadUrl);

    fetch(downloadUrl, { method: 'GET', mode: 'cors' })
      .then((res) => res.text())
      .then((content) => {
        changeSpecification(content);
      })
      .catch((error) => {
        changeSpecification('');
        setOpenApiError(error);
      });

    setDownloadSpecificationOpen(false);
  };

  const customControl = (
    <CodeEditorControl
      icon={<DownloadIcon />}
      aria-label="Download specification"
      tooltipProps={{ content: 'Download specification' }}
      onClick={showDownloadSpecification}
      isVisible={specification === ''}
    />
  );

  const changeSpecification = (value: string) => {
    console.log('Changing specification ' + value);

    setSpecification(value);
    checkLanguage(value);
  };

  const checkLanguage = (value: string) => {
    console.log('Checking language ...');

    if (value.length > 0) {
      if (value.startsWith('openapi:')) {
        setSpecificationTypeLanguage(Language.yaml);
        setOpenApiError('');
      } else if (value.match('.*"openapi":.*')) {
        setSpecificationTypeLanguage(Language.json);
        setOpenApiError('');
      } else {
        setOpenApiError('Invalid specification provided');
        setSpecification('');
      }
    }
  };

  useEffect(() => {}, [specification, downloadSpecificationOpen, specificationTypeLanguage, openApiError]);

  const createOpenApiElements = (spec: string) => {
    setOpenApiError('');

    const openApi: OpenApi = JSON.parse(spec);

    for (const path in openApi.paths) {
      for (const method in openApi.paths[path]) {
        const operationId = openApi.paths[path][method]['operationId'];

        const route: RouteDefinition = {
          from: {
            uri: 'direct:' + operationId,
            steps: [{ log: 'Operation ' + operationId + ' not yet implemented' }],
          },
        };

        let routeExists: boolean = false;
        entitiesContext?.camelResource.getVisualEntities().forEach((entity: BaseVisualCamelEntity) => {
          if (
            entity.type === EntityType.Route &&
            (entity as CamelRouteVisualEntity).route?.from?.uri === 'direct:' + operationId
          ) {
            routeExists = true;
          }
        });

        if (!routeExists) {
          const entity = new CamelRouteVisualEntity(route);
          entitiesContext?.camelResource.addExistingEntity(entity);
        }
      }
    }

    const rest: Rest = {
      openApi: {
        specification: downloadUrl,
      },
    };

    let restExists: boolean = false;

    entitiesContext?.camelResource.getVisualEntities().forEach((entity: BaseVisualCamelEntity) => {
      if (entity.type === EntityType.Rest) {
        if ((entity as CamelRestVisualEntity).rest.rest?.openApi?.specification === downloadUrl) {
            restExists = true;
        }
      }
    });

    if (!restExists) {
      const entity = new CamelRestVisualEntity(rest);
      entitiesContext?.camelResource.addExistingEntity(entity);
    }

    entitiesContext?.updateSourceCodeFromEntities();
    entitiesContext?.updateEntitiesFromCamelResource();
  };

  const onCreate = () => {
    console.log('Specification: ' + specification);

    if (specification !== '') {
      if (specificationTypeLanguage === Language.json) {
        createOpenApiElements(specification);
      } else if (specificationTypeLanguage === Language.yaml) {
        createOpenApiElements(JSON.stringify(parse(specification)));
      }

      navigate(Links.Home);
    } else {
      setOpenApiError('No specification provided');
    }
  };

  const onCancel = () => {
    navigate(Links.Home);
  };

  return (
    <Card>
      <CardTitle>Open API</CardTitle>
      <CardBody>
        <Form onSubmit={onCreate}>
          {downloadSpecificationOpen && (
            <FormGroup label="Download URL" isRequired onSubmit={downloadFromUrl}>
              <InputGroup>
                <TextInput id="operation-name" type="url" onChange={(_event, value) => updateDownloadUrl(value)} />
              </InputGroup>
              <InputGroup>
                <Button key="download_url" variant="primary" id="download_url" onClick={downloadFromUrl}>
                  Download
                </Button>
              </InputGroup>
            </FormGroup>
          )}
          {!downloadSpecificationOpen && (
            <FormGroup
              label="Specification"
              labelIcon={
                <Popover
                  headerContent={<div>The Open API Specification</div>}
                  bodyContent={
                    <div>
                      The Open API specification according to{' '}
                      <a href="https://spec.openapis.org/oas/v3.1.0">Open API 3.1.0 (JSON/YAML)</a>
                    </div>
                  }
                >
                  <button
                    type="button"
                    aria-label="More info for the service name field"
                    onClick={(e) => e.preventDefault()}
                    className={styles.formGroupLabelHelp}
                  >
                    <HelpIcon />
                  </button>
                </Popover>
              }
            >
              <CodeEditor
                isLineNumbersVisible={true}
                isLanguageLabelVisible
                isReadOnly
                isUploadEnabled
                isCopyEnabled
                customControls={customControl}
                code={specification}
                onCodeChange={(value) => changeSpecification(value)}
                language={specificationTypeLanguage}
                onEditorDidMount={onEditorDidMount}
                height="400px"
              />
            </FormGroup>
          )}
        </Form>
      </CardBody>
      {!downloadSpecificationOpen && (
        <CardFooter>
          {openApiError !== '' && (
            <HelperText>
              <HelperTextItem variant="error">{openApiError}</HelperTextItem>
            </HelperText>
          )}

          <Button data-testid="openapi-form-create-btn" variant="primary" onClick={onCreate}>
            Create
          </Button>
          <Button data-testid="openapi-form-cancel-btn" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
