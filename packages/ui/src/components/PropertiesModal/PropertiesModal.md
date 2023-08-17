### PropertiesModal

This folder contains `PropertiesModalTable` component and its subcomponent (`CamelComponentTable`,`KameletTable`) which define of which properties' columns should be shown in the properties table according to CatalogKind type.

`PropertiesModalTable` component decides which columns are shown according to `CatalogKind` enum (from the tile).

```
IPropertiesModalTableProps.tsx
├── CamelComponentTable.tsx ( for CatalogKind.Component and  CatalogKind.Processor since they have the same structure of properties, can be separated in the future if needed )
│   └── EmptyTableState.tsx (If no properties are found)
└── KameletTable.tsx ( for CatalogKind.Kamelet)
    └── EmptyTableState.tsx (If no properties are found)
```
