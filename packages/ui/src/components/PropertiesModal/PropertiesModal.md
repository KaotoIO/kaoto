## PropertiesModal

This folder contains `PropertiesModal` component which defines how the properties detail modal with tabs and tables is rendered. The `PropertiesModal` component decides which tabs should be shown according to `CatalogKind` enum (from the input tile). For a particular `CatalogKind`, it uses a particular transform function from `camel-to-tabs.adapter.ts` util to get an array of `IPropertiesTab` for rendering. It passes all that info to the `PropertiesTabs` component which is responsible for rendering tables. The `PropertiesTabs` component renders all tabs from the input array of `IPropertiesTab` and for each tab, it renders all tables which are stored in `IPropertiesTab.tables`. According to a type of table, `Simple` or `Tree` table is rendered.
  
That transformation functions in `camel-to-tabs.adapter.ts` contain a "definition" of tabs for each `CatalogKind` and according to that, it calls particular functions from `camel-to-table.adapter.ts` util to get all `IPropertiesTable` which are related to that `CatalogKind`.

That functions in `camel-to-table.adapter.ts` contain a "definition" of tables.


### How to update table to add a new column

To add a new column, extend models in `PropertiesTable.models.ts` (`PropertiesHeaders` and `IPropertiesRow`), update `camel-to-table.adapter.ts` if the column is needed for a particular definition, and when the data in the cell contins special formation, add new case into `PropertiesTableCommon.tsx`

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

### How to add brand new Catalog type

To add a new type of catalog definition, extend the switch in `PropertiesModal` which will cover that new type case. After that create a tab transformation function into `camel-to-tabs.adapter.ts` where define which tabs will be rendered and which tables will be contained. If you need a new table type, add the table transformation function into `camel-to-table.adapter.ts`

### How to add metadata information into table for existing cell

If you need to pass some metadata information, e.g. for formatting existing cells (e.g. if Required==true => add Required as suffix of text), extend `IPropertiesRowAdditionalInfo` object about new information. That information will be available in `PropertiesTableCommon.tsx` where you can define what should be done according to that data.

### Index

- `PropertiesModal` - modal component
- `PropertiesTabs` - tabs component
- `PropertiesTableCommon` - the functions render headers row or data cells row. They contain cases when cell data needs some special formatting according to row metadata (`IPropertiesRow.rowAdditionalInfo`). The functions are common in both, Simple and Tree tables.
- `PropertiesTableSimple` - simple table which render data by rows
- `PropertiesTableTree` - tree table which render data by rows and childrens
- `camel-to-tabs` - functions which define how many tabs will be rendered for a particular catalog type, how they will look and which tables will be contained
- `camel-to-table` - functions which define what data will be in the table according to properties type
