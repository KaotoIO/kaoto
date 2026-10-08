# Citrus action templates

These files show how a host application can provide native Citrus templates to Kaoto at design time:

- [`prepare-order.citrus.yaml`](prepare-order.citrus.yaml) is a reusable template supplied by the host.
- [`order.citrus.test.yaml`](order.citrus.test.yaml) is the test before inserting a template call.
- [`order.expected.citrus.test.yaml`](order.expected.citrus.test.yaml) shows the result after inserting `prepare-order` and changing its `region` parameter to `eu-central`.

The host returns template files through its existing `getResourcesContentByType` callback when Kaoto requests `FileTypes.CitrusTemplates`:

```ts
const getResourcesContentByType = async (fileType: FileTypes): Promise<FileTypesResponse[]> =>
  fileType === FileTypes.CitrusTemplates
    ? [{ filename: 'prepare-order.citrus.yaml', content: templateSourceCode }]
    : [];
```

Each response contains a filename and the native YAML content. Kaoto reads the template's `name`, `description`, and ordered `parameters` to create its catalog tile. Selecting the tile inserts an `applyTemplate` action with the template name and parameter values; the template body stays in the separate file.

Each declared parameter must contain a nonblank `name` and a scalar `value` (string, number, boolean, or null). Parameters are optional. Kaoto does not infer them from expressions in the template body. The existing parameter form edits values as strings.

The host should return the complete current template set on each request. Kaoto refreshes the catalog when it opens and fetches the selected template again before insertion. Invalid resources are skipped with a console diagnostic; the last resource wins when names are duplicated. A removed or unavailable template is not inserted, and refreshing the catalog does not rewrite existing calls.

Executing the resulting test requires the host's Citrus runtime to load the template by name. The design-time callback does not register runtime templates.
