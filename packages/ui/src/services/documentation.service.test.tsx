import { act, renderHook } from '@testing-library/react';
import JSZip from 'jszip';
import { PropsWithChildren, useContext } from 'react';

import { PipeVisualEntity } from '../models';
import { CamelRouteResource } from '../models/camel';
import { KaotoResource } from '../models/kaoto-resource';
import { EntitiesContext, EntitiesProvider } from '../providers/entities.provider';
import { KaotoResourceProvider } from '../providers/kaoto-resource.provider';
import { camelRouteYaml, kameletYaml, mockRandomValues, pipeYaml } from '../stubs';
import { beansYaml } from '../stubs/beans';
import { kameletAwsCloudtailSourceYaml } from '../stubs/kamelet-aws-cloudtail-source';
import { kameletWithMultilineXmlPropYaml } from '../stubs/kamelet-with-multiline-xml-prop';
import { restStub } from '../stubs/rest';
import { restConfigurationStub } from '../stubs/rest-configuration';
import { restOperationsYaml } from '../stubs/rest-operations';
import { routeConfigurationFullYaml } from '../stubs/route-configuration-full';
import { EventNotifier, IVisibleFlows } from '../utils';
import { DocumentationService } from './documentation.service';

describe('DocumentationService', () => {
  let eventNotifier: EventNotifier;
  beforeEach(() => {
    eventNotifier = EventNotifier.getInstance();
  });

  // EntitiesProvider now derives its resource from KaotoResourceContext, which also owns the
  // `code:updated` subscription that recreates the resource — so both providers are needed here.
  const wrapper = ({ children }: PropsWithChildren) => (
    <KaotoResourceProvider>
      <EntitiesProvider>{children}</EntitiesProvider>
    </KaotoResourceProvider>
  );

  const createDocumentationEntitiesFromYaml = async (yaml: string) => {
    const { result: entitiesContext } = renderHook(() => useContext(EntitiesContext), { wrapper });

    act(() => {
      eventNotifier.next('code:updated', { code: yaml });
    });

    if (entitiesContext.current === null) {
      throw new Error('EntitiesContext is null');
    }

    // initialize() is async and re-runnable; await it on the context's resource so the
    // entities/visual entities are fully built before we read them (the EntitiesProvider
    // also initializes it, but asynchronously — this guarantees completion here).
    await entitiesContext.current.camelResource.initialize();

    const visibleFlows = entitiesContext.current.camelResource.getVisualEntities().reduce((acc, entity) => {
      acc[entity.id] = true;
      return acc;
    }, {} as IVisibleFlows);

    return DocumentationService.getDocumentationEntities(entitiesContext.current.camelResource, visibleFlows);
  };

  const createDocumentationEntitiesFromCamelResource = (camelResource: KaotoResource) => {
    const visibleFlows = camelResource.getVisualEntities().reduce((acc, entity) => {
      acc[entity.id] = true;
      return acc;
    }, {} as IVisibleFlows);

    return DocumentationService.getDocumentationEntities(camelResource, visibleFlows);
  };

  describe('getDocumentationEntities()', () => {
    it('should generate route and beans documentation entities', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(camelRouteYaml + beansYaml);

      expect(documentationEntities).toHaveLength(2);
      expect(documentationEntities[0].isVisualEntity).toBeTruthy();
      expect(documentationEntities[0].isVisible).toBeTruthy();
      expect(documentationEntities[0].label).toBe('route-8888');
      expect(documentationEntities[0].entity!.type).toBe('route');
      expect(documentationEntities[1].isVisualEntity).toBeFalsy();
      expect(documentationEntities[1].isVisible).toBeTruthy();
      expect(documentationEntities[1].label).toBe('Beans');
      expect(documentationEntities[1].entity!.type).toBe('beans');
    });

    it('should generate kamelet documentation entities', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(kameletYaml);

      expect(documentationEntities).toHaveLength(2);
      expect(documentationEntities[0].isVisualEntity).toBeTruthy();
      expect(documentationEntities[0].label).toBe('Steps');
      expect(documentationEntities[0].entity!.type).toBe('kamelet');
      expect(documentationEntities[1].isVisualEntity).toBeFalsy();
      expect(documentationEntities[1].label).toBe('Metadata');
      expect(documentationEntities[1].entity!.type).toBe('metadata');
    });

    it('should generate pipe documentation entities', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(pipeYaml);

      expect(documentationEntities).toHaveLength(3);
      expect(documentationEntities[0].isVisualEntity).toBeTruthy();
      expect(documentationEntities[0].label).toBe('Steps');
      expect(documentationEntities[0].entity!.type).toBe('pipe');
      expect(documentationEntities[1].isVisualEntity).toBeFalsy();
      expect(documentationEntities[1].label).toBe('Metadata');
      expect(documentationEntities[1].entity!.type).toBe('metadata');
      expect(documentationEntities[2].isVisualEntity).toBeFalsy();
      expect(documentationEntities[2].label).toBe('Error Handler');
      expect(documentationEntities[2].entity!.type).toBe('pipeErrorHandler');
    });

    it('should generate rest documentation entities', async () => {
      mockRandomValues();

      const camelResource = new CamelRouteResource([restStub, restConfigurationStub]);
      await camelResource.initialize();
      const documentationEntities = createDocumentationEntitiesFromCamelResource(camelResource);

      expect(documentationEntities).toHaveLength(2);
      expect(documentationEntities[0].isVisualEntity).toBeFalsy();
      expect(documentationEntities[0].label).toBe('restConfiguration-1234');
      expect(documentationEntities[0].entity!.type).toBe('restConfiguration');
      expect(documentationEntities[1].isVisualEntity).toBeFalsy();
      expect(documentationEntities[1].label).toBe('rest-1234');
      expect(documentationEntities[1].entity!.type).toBe('rest');
    });

    it('should generate route configuration documentation entities', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(routeConfigurationFullYaml);

      expect(documentationEntities).toHaveLength(1);
      expect(documentationEntities[0].isVisualEntity).toBeTruthy();
      expect(documentationEntities[0].label).toBe('routeConfiguration-1956');
      expect(documentationEntities[0].entity!.type).toBe('routeConfiguration');
    });
  });

  describe('generateMarkdown()', () => {
    it('should generate route and beans markdown', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(camelRouteYaml + beansYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# route-8888');
      expect(markdown).toContain(
        '|         | from       | timer           | timerName          | tutorial                |',
      );
      expect(markdown).toContain('# Beans');
      expect(markdown).toContain('| myBean  | io.kaoto.MyBean | p1            |                | p1v   |');
    });

    it('should generate kamelet markdown', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(kameletYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# Steps');
      expect(markdown).toContain(
        '|         | from | timer        | period         | {{period}}                        |',
      );

      expect(markdown).toContain('# Definition');
      expect(markdown).toContain('# Types');
      expect(markdown).toContain('# Dependencies');
      expect(markdown).toContain('## Metadata : Labels');
      expect(markdown).toContain('## Metadata : Annotations');
    });

    it('should generate markdown for kamelet with multiline property and XML', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(kameletWithMultilineXmlPropYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('<strong>sample</strong>');
      expect(markdown).toContain('foo&#10;<Some>aaa</Some>&#10;bbb');
    });

    it('should generate aws-cloudtail-source kamelet markdown', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(kameletAwsCloudtailSourceYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');
      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# Steps');
      expect(markdown).toContain('# Definition');
      expect(markdown).toContain('# Data Types');
      expect(markdown).toContain('## OUT');
      expect(markdown).toContain('## OUT : Headers');
      expect(markdown).toContain('### OUT : text');
      expect(markdown).toContain('### OUT : cloudevents');
      expect(markdown).toContain('### OUT : cloudevents : Headers');
      expect(markdown).toContain('# Dependencies');
      expect(markdown).toContain('## Metadata : Labels');
      expect(markdown).toContain('## Metadata : Annotations');
    });

    it('should generate pipe markdown', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(pipeYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# Steps');
      expect(markdown).toContain('# Metadata');
      expect(markdown).toContain('## Metadata : Annotations');
      expect(markdown).toContain('# Error Handler');
      expect(markdown).toContain('| log  | maximumRedeliveries | 3     |');

      const pipeEntity = documentationEntities[0].entity as PipeVisualEntity;
      pipeEntity.pipe.spec!.errorHandler = { none: '' };
      const markdownNone = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdownNone).toContain('# Error Handler');
      expect(markdownNone).toContain('| none |');

      pipeEntity.pipe.spec!.errorHandler = {
        sink: {
          endpoint: {
            ref: { kind: 'kamelet', apiVersion: 'camel.apache.org/v1', name: 'error-handler' },
            properties: { message: 'ERROR!' },
          },
          parameters: { maximumRedeliveries: 1 },
        },
      };
      const markdownSink = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdownSink).toContain('# Error Handler');
      expect(markdownSink).toContain('| sink | REF Kind        |                     | kamelet             |');
    });

    it('should generate rest markdown', async () => {
      const camelResource = new CamelRouteResource([restStub, restConfigurationStub]);
      await camelResource.initialize();
      const documentationEntities = createDocumentationEntitiesFromCamelResource(camelResource);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# rest-1234');
      expect(markdown).toContain('# restConfiguration-1234');
    });

    it('should generate rest operations markdown', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(restOperationsYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# rest-1234 [Path : /api/v3]');
      expect(markdown).toContain(
        '| GET    | findPetsByStatus          | /pet/findByStatus        | direct:findPetsByStatus          |',
      );
    });

    it('should generate route configuration markdown', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(routeConfigurationFullYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');

      expect(markdown).toContain('![Diagram](route.png)');
      expect(markdown).toContain('# routeConfiguration-1956');
      expect(markdown).toContain('## defaultErrorHandler');
      expect(markdown).toContain('## Intercept');
      expect(markdown).toContain('## Intercept From');
      expect(markdown).toContain('## Intercept Send To Endpoint');
      expect(markdown).toContain('## Intercept');
      expect(markdown).toContain('## On Exception');
      expect(markdown).toContain('## On Completion');
    });
  });

  describe('generateDocumentationZip()', () => {
    it('should generate a zip file', async () => {
      const documentationEntities = await createDocumentationEntitiesFromYaml(camelRouteYaml + beansYaml);
      const markdown = DocumentationService.generateMarkdown(documentationEntities, 'route.png');
      let zipfile: Blob;
      await act(async () => {
        zipfile = await DocumentationService.generateDocumentationZip(new Blob(), markdown, 'route');
      });

      const jszip = new JSZip();
      const unzipped = await jszip.loadAsync(zipfile!);
      expect(Object.keys(unzipped.files)).toHaveLength(2);
      expect(unzipped.files['route.png']).toBeDefined();
      expect(unzipped.files['route.md']).toBeDefined();
      const routeMd = await unzipped.files['route.md'].async('string');
      expect(routeMd).toContain('![Diagram](route.png)');
    });
  });
});
