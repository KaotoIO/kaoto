# Kaoto 2.8 released

We are happy to announce that new version of extension was released!

## Key highlights of this release

This release represents a major step forward in DataMapper maturity, with extensive XML Schema support improvements, better visual feedback, and numerous stability fixes. We've also enhanced the canvas experience with contextual menus and improved the forms system for better configuration management.

### VS Code

#### Getting started with Kaoto in VS Code

<img src="./kaoto-walkthrough.png" alt="Kaoto first steps walkthrough" width="30%">

---

### Kaoto UI

#### Canvas enhancements

- **Contextual Menu**: Right-click on canvas nodes to access relevant actions directly where you need them
- **Keyboard Support**: Delete steps quickly by selecting them and pressing the Delete key
- **Improved Drag Feedback**: Different mouse pointer styles clearly indicate which nodes are draggable and which are not

<p align="center">
    <img src="./drag-enabled.png" alt="Enabled drag" width="5%" position="center">
    <img src="./drag-disabled.png" alt="Disabled drag" width="5%" position="center">
</p>

#### Forms and Configuration

- **Enum Field Support**: Improved component’s options when enum type is available

<p align="center">
    <img src="./salesforce-component-enum.png.png" alt="Salesforce component" width="35%" position="center">
    <img src="./snmp-component-enum.png.png" alt="SNMP component" width="35%" position="center">
</p>

- **Beans EIP**: The beans EIP now shows a list of defined beans in the Camel route

<p align="center">
    <img src="./beans-eip-ref.png" alt="Beans EIP" width="35%" position="center">
</p>

- **JDBC component**: The JDBC now shows the default and dataSource options and offers a list of beans to pick a dataSource from

<p align="center">
    <img src="./jdbc-component-datasource.png" alt="JDBC component" width="35%" position="center">
</p>

- **OnException Validation**: Enhanced validation for exception handling configurations

<p align="center">
    <img src="./on-exception-validation.png" alt="OnException validation" width="20%" position="center">
</p>

---

### DataMapper

#### XML schema support enhancements

Kaoto 2.8 brings improvements to XML Schema handling in the DataMapper:

- **Advanced Schema Features**: Full support for xs:extension, xs:restriction, allowing you to work with sophisticated XML schemas
- **Field Type Visualization**: Field type icons now appear in the tree view, making it easier to identify data types at a glance

<p align="center">
    <img src="./datamapper-field-type-icons-highlighted.png" alt="Datamapper: Icons highlighted" width="20%" position="center">
    <img src="./datamapper-field-type-hover-container.png" alt="Datamapper: Container icon tooltip" width="20%" position="center">
    <img src="./datamapper-field-type-hover-decimal.png" alt="Datamapper: Decimal icon tooltip" width="20%" position="center">
</p>

- **Occurrence Indicators**: Display of minOccurs and maxOccurs attributes helps you understand cardinality requirements directly in the UI

<p align="center">
    <img src="./datamapper-occurence-indicator.png" alt="Datamapper: Field minimun and maximum occurrences" width="20%" position="center">
</p>

- **Improved XPath Handling**: Better support for relative xpath with parent (..) notation and current() function in expressions

<p align="center">
    <img src="./datamapper-xpath-parent-current.png" alt="Datamapper: XPath with current() function" width="45%" position="center">
</p>

- **Parameter Renaming**: Rename parameters directly within the DataMapper interface

<p align="center">
    <img src="./datamapper-rename-parameter-button.png" alt="Datamapper: Rename parameter button" width="20%" position="center">
    <img src="./datamapper-rename-parameter.png" alt="Datamapper: Rename parameter" width="20%" position="center">
</p>

- **Smart Deletion**: Warning prompts when deleting mappings with child mappings to prevent accidental data loss

<p align="center">
    <img src="./datamapper-delete-child-mappings-warn.png" alt="Datamapper: Delete child" width="25%" position="center">
</p>

---

### Bug Fixes

- **URI Serialization**: Improved component parameter handling in XML URI serialization when no syntax is present
- **Route Ordering**: Fixed the order of Intercept\* elements to ensure correct processing sequence

### Camel Catalog Version

This release includes:

- Camel main: 4.16.0
- Camel extensions for Quarkus: 3.29.0
- Camel Spring-boot: 4.14.1
