# Citrus action templates

This Storybook example supplies a native Citrus template through Kaoto's host callback, `getResourcesContentByType`. It uses the production designer and the installed Citrus catalog. No Studio, Runner Agent, or separate catalog server is required.

## Try it

From the repository root, after `yarn install`:

```sh
yarn workspace @kaoto/kaoto build:lib
yarn workspace @kaoto/kaoto-tests storybook
```

Open [Canvas / Citrus templates / Host Provided](http://localhost:6006/?path=/story/canvas-citrus-templates--host-provided).

1. The designer starts with [`order.citrus.test.yaml`](order.citrus.test.yaml). Append a step after **print**, search for **prepare-order**, and select its template tile.
2. Select the new **applyTemplate** node. Its `name` is `prepare-order`, and its **Parameters** list contains `region` with the literal value `${region}`.
3. Change the parameter value to `eu-central`. **Generated YAML** should match [`order.expected.citrus.test.yaml`](order.expected.citrus.test.yaml).
4. Click **Reopen YAML** to parse that generated source again. Select **applyTemplate** and confirm that `name: prepare-order` and the edited parameter remain intact.

## Host callback

The [story](../../packages/ui-tests/stories/canvas/CitrusTemplates.stories.tsx) imports [`prepare-order.citrus.yaml`](prepare-order.citrus.yaml) as raw text and passes this callback to `CatalogLoaderProvider`:

```ts
const getResourcesContentByType = async (fileType: FileTypes): Promise<FileTypesResponse[]> =>
  fileType === FileTypes.CitrusTemplates
    ? [{ filename: 'prepare-order.citrus.yaml', content: templateSourceCode }]
    : [];
```

An embedding application implements the same callback on `KaotoEditorChannelApi`; the editor forwards it to `CatalogLoaderProvider`. Each response contains a filename and the native YAML content. The template's `name`, `description`, and ordered `parameters` supply its catalog metadata and initial call parameters. Selecting the tile inserts an ordinary `applyTemplate` action with the template name and parameter values; its body stays in the separate template file.

Each declared parameter must contain a nonblank `name` and a scalar `value` (string, number, boolean, or null). Parameters are optional; Kaoto does not infer them from expressions in the template body. The existing parameter form edits values as strings.

Return the complete current template set on each request. Kaoto refreshes it when the catalog opens and fetches the selected template again before insertion. Invalid resources are skipped with a console diagnostic; the last resource wins when names are duplicated. A removed or unavailable template is not inserted, and refreshing the catalog does not rewrite existing calls.

This demonstrates discovery and editing. Executing the resulting test requires the host's Citrus runtime to load the template by name. The design-time callback does not register runtime templates.
