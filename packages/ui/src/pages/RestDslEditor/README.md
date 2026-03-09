# REST DSL Editor

The REST DSL Editor provides a visual interface for creating and managing Camel REST DSL configurations and services.

## Overview

This module enables users to:

- Create and configure REST configurations (global REST settings)
- Define REST services with multiple HTTP methods
- Edit REST method properties and routing
- Visualize REST DSL structure in a tree view

## Architecture

### Main Components

#### `RestDslEditorPage.tsx`

The main page component that provides a split-panel interface:

- **Left Panel**: Tree view of REST configurations and services
- **Right Panel**: Form editor for selected REST entity

Key features:

- Add/edit REST configurations
- Add/edit REST services
- Add/edit REST methods (GET, POST, PUT, DELETE, PATCH, HEAD)
- Delete REST entities and methods

#### `RestTree.tsx`

Tree view component that displays the hierarchical structure of REST DSL entities:

- REST Configuration nodes
- REST Service nodes with expandable method children
- Visual badges for HTTP method types
- Selection handling for editing

#### `RestTreeToolbar.tsx`

Toolbar component providing actions:

- **Add Configuration**: Create a new REST configuration (limited to one)
- **Add Service**: Create a new REST service
- **Add Operation**: Add a new HTTP method to selected REST service
- **Delete**: Remove selected entity or method

#### `AddMethodModal.tsx`

Modal dialog for adding new REST methods with fields:

- HTTP Method type (GET, POST, PUT, DELETE, PATCH, HEAD)
- Path (e.g., `/users/{id}`)
- Optional ID

#### `MethodBadge.tsx`

Visual badge component displaying HTTP method types with color coding:

- GET: Blue
- POST: Cyan
- PUT: Green
- DELETE: Red
- HEAD: Teal
- PATCH: Gray

#### `RestRouteEndpointField.tsx`

Custom form field component for REST method routing endpoints:

- Abstracts the `to` property to show only the route URI name
- Provides autocomplete suggestions from existing direct routes
- Allows creating new direct routes on-the-fly
- Preserves existing parameters when updating the endpoint name

### Utilities

#### `get-rest-entities.ts`

Utility function that filters REST-related entities from a collection:

- Filters `CamelRestVisualEntity` instances
- Filters `CamelRestConfigurationVisualEntity` instances
- Excludes non-REST entities (routes, beans, etc.)
- Preserves entity order

#### `restFormFieldFactory.ts`

Custom field factory for REST DSL form rendering:

- Provides `RestRouteEndpointField` for `To` object fields
- Provides `MediaTypeField` for `Consumes` and `Produces` fields
- Returns `undefined` for standard fields (uses default rendering)

#### `rest-to-tree.ts`

Converts visual entities into a tree structure for display:

- Processes `CamelRestConfigurationVisualEntity` instances
- Processes `CamelRestVisualEntity` instances with their methods
- Generates unique IDs and paths for tree navigation

#### `add-method-schema.ts`

JSON Schema definition for the Add Method form, including:

- Method type validation
- Path field requirements
- Optional ID field

#### `test-utils.ts`

Testing utilities for interacting with the REST tree toolbar in tests.

## Data Flow

1. **Loading**: Visual entities are loaded from the Camel resource
2. **Tree Generation**: `restToTree()` converts entities into tree nodes
3. **Selection**: User selects a node in the tree
4. **Form Display**: Selected entity's schema and model are displayed in the form
5. **Editing**: User modifies properties via the form
6. **Persistence**: Changes are saved back to the entity and resource

## File Structure

```
RestDslEditor/
├── README.md                           # This file
├── index.ts                            # Module exports
├── router-exports.tsx                  # Router element export
├── RestDslEditorPage.tsx               # Main page component
├── RestDslEditorPage.test.tsx          # Page tests
├── RestDslEditorPage.scss              # Page styles
├── rest-to-tree.ts                     # Tree conversion utility
├── rest-to-tree.test.ts                # Tree conversion tests
├── test-utils.ts                       # Testing utilities
└── components/
    ├── RestTree.tsx                    # Tree view component
    ├── RestTree.test.tsx               # Tree tests
    ├── RestTree.scss                   # Tree styles
    ├── RestTreeToolbar.tsx             # Toolbar component
    ├── RestTreeToolbar.test.tsx        # Toolbar tests
    ├── AddMethodModal.tsx              # Add method dialog
    ├── AddMethodModal.test.tsx         # Modal tests
    ├── MethodBadge.tsx                 # HTTP method badge
    ├── MethodBadge.test.tsx            # Badge tests
    ├── MethodBadge.scss                # Badge styles
    ├── RestRouteEndpointField.tsx      # Custom endpoint field
    ├── RestRouteEndpointField.test.tsx # Endpoint field tests
    ├── add-method-schema.ts            # Form schema definition
    ├── get-rest-entities.ts            # Entity filtering utility
    ├── get-rest-entities.test.ts       # Entity filtering tests
    └── restFormFieldFactory.ts         # Custom field factory
```

## Key Concepts

### REST Configuration

Global REST settings that apply to all REST services in the Camel context. Only one REST configuration is allowed per resource.

### REST Service

A REST service definition that can contain multiple HTTP methods. Each service has a base path and can define multiple operations.

### REST Method

An individual HTTP operation (GET, POST, etc.) within a REST service. Each method has:

- HTTP verb (method type)
- Path (can include path parameters like `/{id}`)
- Routing configuration (typically to a direct endpoint)

## Dependencies

- `@kaoto/forms`: Form rendering and validation
- `@carbon/react`: UI components (TreeView, Modal, Buttons)
- Camel Catalog types for REST DSL definitions
- Visual entity models for Camel resources
