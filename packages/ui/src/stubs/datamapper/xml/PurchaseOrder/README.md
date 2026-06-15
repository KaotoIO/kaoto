# PurchaseOrder to ShipOrder DataMapper Demo

## Overview

Enterprise XML schema suite demonstrating Kaoto DataMapper's XSLT transformation capabilities. Features a 5-source-to-1-target mapping with 4-level type hierarchies, substitution groups, xs:choice, and cross-document joins.
This demo is introduced to demonstrate Kaoto DataMapper features as many as possible at once, as well as to verify DataMapper UI keeps rendering large and complex mappings without performance degradation. Expand XSD files and XSLT mappings as we get more features to test. 

## File Structure

```text
schemas/
├── common/                          # Shared enterprise schemas
│   ├── common-types.xsd            # UUIDs, monetary amounts, weights
│   ├── common-address.xsd          # Address substitution group
│   ├── common-party.xsd            # Person/Organization types
│   ├── common-financial.xsd        # Payment terms, tax details
│   └── common-datetime.xsd         # Date/time types, schedules
│
├── PurchaseOrder.xsd               # Source body
├── BillingInfo.xsd                 # Source param: billingInfoDoc
├── AccountInfo.xsd                 # Source param: accountInfoDoc
├── LogisticsInfo.xsd               # Source param: logisticsInfoDoc
├── StockInfo.xsd                   # Source param: stockInfoDoc
│
├── ShipOrder.xsd                   # Target root + type hierarchy
├── ShipOrder-core.xsd              # Core types: OrderID, Metadata, Customer
├── ShipOrder-delivery.xsd          # Delivery/Payment substitution groups
├── ShipOrder-containers.xsd        # Container substitution group
└── ShipOrder-enumerations.xsd      # Enum types for validation

purchaseorder-to-shiporder.xsl      # DataMapper-generated XSLT 3.0
.kaoto                              # DataMapper configuration
route.camel.yaml                    # Camel route definition
__tests__/
├── validation.test.ts              # Source + target structure validation
└── validation-utils.ts             # XPath/XSLT/schema test infrastructure
```

## ShipOrder Type Hierarchy

The target schema uses 4-level xs:extension:

```text
Level 1: AbstractShippingOrderType    → OrderIdentification, OrderMetadata, CustomerInformation
Level 2: BaseShippingOrderType        → ShipmentDetails, PackagingInformation, DeliveryAddress, BillingAddress?, ReturnAddress?
Level 3: StandardShippingOrderType    → CarrierSelection, DeliveryPreferences?, SpecialHandling?, ShippingCosts
Level 4: ShipOrderType               → TrackingInformation?, CustomsInformation?, FulfillmentTracking?
```

Root attributes (accumulated across levels):
- `orderVersion` (required), `schemaVersion` (required, fixed="1.0")
- `totalWeight` (optional), `totalPackages` (optional)
- `signatureRequired`, `allowPartialShipment`, `priorityProcessing`

## Substitution Groups in Target Schema

**DeliveryMethod** (in CarrierSelection):
StandardDelivery, ExpressDelivery, ScheduledDelivery, WhiteGloveDelivery

**PaymentMethod** (in ShippingCosts):
CashPayment, CheckPayment, CardPayment, DigitalWalletPayment

**ShippingContainer** (in PackagingInformation, CustomsInformation):
StandardBox, PaddedEnvelope, WoodenCrate, Pallet, CustomContainer

## XSLT Transformation

### purchaseorder-to-shiporder.xsl (DataMapper-generated)

Single `xsl:template match="/"` with all logic inlined — no named templates, no XSLT functions, no template modes. This is the format Kaoto DataMapper generates.

**Input documents** (5):
1. **Body**: PurchaseOrder (main input)
2. **billingInfoDoc**: BillingInfo (tax rates, credit rating, invoice, payment terms)
3. **accountInfoDoc**: AccountInfo (customer details, contact info, loyalty)
4. **logisticsInfoDoc**: LogisticsInfo (shipping preferences, carrier, delivery)
5. **stockInfoDoc**: StockInfo (product weights, warehouses, hazmat/perishable data)

**Key XSLT patterns demonstrated**:
- `xsl:for-each` + `xsl:sequence` to build typed sequences (replaces FLWOR)
- `xsl:copy-of` for same-namespace subtree copying — conditional (addr:* choose/when) and static (addr:StandardAddress direct)
- `xsl:choose` selecting concrete substitution group members by condition
- Cross-document joins via XPath predicates (`ai:AccountInfo[ai:AccountHeader/ai:AccountID = ...]`)
- Template-level variables for computed values shared across sections
- `xsl:if` for optional schema sections (SpecialHandling, CustomsInformation)

**Source document usage**:

| Document | Used For |
|----------|----------|
| PurchaseOrder | Order IDs, line items (incl. ProductDescription, Dimensions), shipping address, delivery requirements |
| BillingInfo | External ref, billing address (xsl:copy-of), tax rate, credit rating, insurance cost, payment method, invoice |
| AccountInfo | Customer details (xsl:copy-of party:Person), contact info (incl. AlternatePhone), preferences |
| LogisticsInfo | Carrier selection (incl. CarrierAccountNumber), delivery method, DeliveryTimeWindow, TrackingURL, notifications |
| StockInfo | Product weights, warehouse location/manager, return address (static xsl:copy-of), hazmat/perishable handling |

**Output section order** (matches schema xs:sequence):
1. OrderIdentification — cross-system references from all 5 sources (incl. ReferenceType)
2. OrderMetadata — timestamps, processing status
3. CustomerInformation — AccountInfo join by Buyer PartyID, xsl:copy-of, AlternatePhone
4. ShipmentDetails — line items with StockInfo weight lookup, ProductDescription, Dimensions
5. PackagingInformation — container selection by weight (substitution group), PackagingMaterials, SpecialPackaging
6. DeliveryAddress — conditional xsl:copy-of addr:* from PurchaseOrder
7. BillingAddress — conditional xsl:copy-of addr:* from BillingInfo
8. ReturnAddress — static xsl:copy-of addr:StandardAddress from StockInfo warehouse
9. CarrierSelection — delivery method (substitution group), CarrierAccountNumber
10. DeliveryPreferences — LogisticsInfo preferences, DeliveryTimeWindow
11. SpecialHandling — conditional: hazmat/perishable from StockInfo
12. ShippingCosts — cost calculation with BillingInfo tax rate + payment method, Surcharge descriptions
13. TrackingInformation — initial tracking event, TrackingURL from LogisticsInfo
14. CustomsInformation — conditional: international with BillingInfo invoice
15. FulfillmentTracking — warehouse assignment from StockInfo, PerformedBy

## Validation Tests

Tests in `__tests__/validation.test.ts` verify XSLT integrity without running the transformation:

- **XSLT Structure**: well-formed XML, valid root element, version, namespaces
- **Namespace Validation**: all prefixes declared, URI correctness
- **Parameter Validation**: all 4 parameter docs declared and used
- **XPath Syntax**: balanced brackets/parens, no dead links
- **Source Field Resolution**: every XPath field path resolves against parsed XSD schemas
- **Target Document Structure**: output element names match target schema, required sections present, schema-defined ordering

## Schema Patterns Demonstrated

- **Substitution groups**: Abstract elements with concrete implementations
- **xs:choice**: Mutually exclusive element groups (nested, unbounded)
- **xs:extension**: 4-level type hierarchy inheritance
- **xs:restriction**: Pattern-restricted types (tracking numbers, postal codes)
- **Cross-namespace imports**: Common schemas shared between source and target
- **elementFormDefault="qualified"**: Namespace-qualified child elements (common-address, common-party)
