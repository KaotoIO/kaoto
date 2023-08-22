### PropertiesModal

This folder contains `PropertiesModal` component which defines how the properties detail modal with the table is rendered. The table is rendered according to `IPropertiesTable` object. `PropertiesModal` component decides which columns are shown according to `CatalogKind` enum (from the input tile) and use `camel-to-table.adapter.ts` util to get corresponding `IPropertiesTable` model for render.

To add a new column, extend `PropertiesTable.models.ts`, update `camel-to-table.adapter.ts` if the column is needed also for that definition, and update the table in `PropertiesModal`.
To add a new type of catalog definition, extend the switch in `PropertiesModal` which will cover that new type case.

__Make sure__ that orders of headers in the `IPropertiesTable.headers` match with the orders of element in a particular row `IPropertiesRow`

e.g.
```
{
    headers: [
      PropertiesHeaders.Name,
      PropertiesHeaders.Type,
      PropertiesHeaders.Required
    ],
    rows: [{
        name: "xyz",
        type: "xyz",
        required: "xyz",
    }],
  }


```
