import { Draggable } from '@carbon/icons-react';
import { Meta, StoryFn } from '@storybook/react';
import { useMemo, useState } from 'react';

import { FieldContextMenu } from './FieldContextMenu';
import { OverrideBadge } from './OverrideBadge';
import { availableSchemaFiles, mockFields, mockFieldTypes, SchemaFile } from './type-override.stub';
import { TypeOverrideModal } from './TypeOverrideModal';

export default {
  title: 'UI Mockups/DataMapper/Field Type Override',
} as Meta;

export const InteractiveWorkflow: StoryFn = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [selectedField, setSelectedField] = useState<(typeof mockFields)[keyof typeof mockFields] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [attachedSchemas, setAttachedSchemas] = useState<SchemaFile[]>([
    availableSchemaFiles.find((s) => s.name === 'common-schema.xsd')!,
    availableSchemaFiles.find((s) => s.name === 'shiporder-extended.xsd')!,
    availableSchemaFiles.find((s) => s.name === 'customer-schema.xsd')!,
  ]);
  const [isForceOverride, setIsForceOverride] = useState(false);

  const handleContextMenu = (event: React.MouseEvent, field: (typeof mockFields)[keyof typeof mockFields]) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedField(field);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleOverrideType = () => {
    setShowMenu(false);
    setIsForceOverride(false);
    setShowModal(true);
  };

  const handleForceOverrideType = () => {
    setShowMenu(false);
    setIsForceOverride(true);
    setShowModal(true);
  };

  const handleConfirm = (type: string) => {
    if (selectedField) {
      setOverrides({ ...overrides, [selectedField.path]: type });
    }
    setShowModal(false);
  };

  const handleReset = () => {
    if (selectedField) {
      const newOverrides = { ...overrides };
      delete newOverrides[selectedField.path];
      setOverrides(newOverrides);
    }
    setShowMenu(false);
  };

  const hasOverride = (field: (typeof mockFields)[keyof typeof mockFields]) => {
    return field.path in overrides;
  };

  const getOverriddenType = (field: (typeof mockFields)[keyof typeof mockFields]) => {
    return overrides[field.path];
  };

  const handleAttachSchema = (schema: SchemaFile) => {
    if (!attachedSchemas.find((s) => s.path === schema.path)) {
      setAttachedSchemas([...attachedSchemas, schema]);
    }
  };

  const customTypes = useMemo(() => {
    return attachedSchemas.flatMap((schema) => schema.types.map((type) => ({ ...type, schemaFile: schema.name })));
  }, [attachedSchemas]);

  const getAvailableTypes = () => {
    if (!selectedField) return { xmlSchemaTypes: [], customTypes: [] };

    const allStandardTypes = mockFieldTypes.xmlSchemaStandardTypes;
    const allCustomTypes = customTypes;

    if (isForceOverride) {
      return { xmlSchemaTypes: allStandardTypes, customTypes: allCustomTypes };
    }

    if (selectedField.compatibleTypes === 'all') {
      return { xmlSchemaTypes: allStandardTypes, customTypes: allCustomTypes };
    }

    const compatibleTypeValues = selectedField.compatibleTypes as string[];
    const filteredStandardTypes = allStandardTypes.filter((type) => compatibleTypeValues.includes(type.value));
    const filteredCustomTypes = allCustomTypes.filter((type) => compatibleTypeValues.includes(type.value));

    return { xmlSchemaTypes: filteredStandardTypes, customTypes: filteredCustomTypes };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableTypes = useMemo(() => getAvailableTypes(), [selectedField, isForceOverride, customTypes]);

  return (
    <div style={{ padding: '20px', minHeight: '400px' }}>
      <h3>Interactive Type Override Workflow</h3>
      <p style={{ marginBottom: '20px', color: '#6a6e73' }}>
        Three schemas are pre-attached for demonstration. Right-click on any field to override its type. Safe override
        shows only compatible types, while force override shows all types:
        <br />
        &nbsp;&nbsp;• <strong>data</strong> (xs:anyType) - Safe override: all standard types + all attached schema types
        <br />
        &nbsp;&nbsp;• <strong>shipTo</strong> (ShipToType) - Safe override: only ShipToExtended; Force override: all
        types
        <br />
        &nbsp;&nbsp;• <strong>name</strong> (xs:string) - Safe override: only NonEmptyString; Force override: all types
        <br />
        <br />
        You can upload additional schema files from within the modal.
      </p>

      <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 600 }}>Fields</h4>

      <div
        style={{
          border: '1px solid #d2d2d2',
          borderRadius: '8px',
          padding: '10px',
          backgroundColor: '#fff',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
          onContextMenu={(e) => handleContextMenu(e, mockFields.anyTypeField)}
        >
          <span style={{ marginRight: '8px' }}>
            <Draggable />
          </span>
          <span style={{ fontWeight: 500 }}>{mockFields.anyTypeField.name}</span>
          <span style={{ marginLeft: '8px', color: '#6a6e73', fontSize: '12px' }}>
            {hasOverride(mockFields.anyTypeField)
              ? getOverriddenType(mockFields.anyTypeField)
              : mockFields.anyTypeField.type}
          </span>
          {hasOverride(mockFields.anyTypeField) && (
            <OverrideBadge
              originalType={mockFields.anyTypeField.type}
              overriddenType={getOverriddenType(mockFields.anyTypeField)}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
          onContextMenu={(e) => handleContextMenu(e, mockFields.baseTypeField)}
        >
          <span style={{ marginRight: '8px' }}>
            <Draggable />
          </span>
          <span style={{ fontWeight: 500 }}>{mockFields.baseTypeField.name}</span>
          <span style={{ marginLeft: '8px', color: '#6a6e73', fontSize: '12px' }}>
            {hasOverride(mockFields.baseTypeField)
              ? getOverriddenType(mockFields.baseTypeField)
              : mockFields.baseTypeField.type}
          </span>
          {hasOverride(mockFields.baseTypeField) && (
            <OverrideBadge
              originalType={mockFields.baseTypeField.type}
              overriddenType={getOverriddenType(mockFields.baseTypeField)}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
          onContextMenu={(e) => handleContextMenu(e, mockFields.regularField)}
        >
          <span style={{ marginRight: '8px' }}>
            <Draggable />
          </span>
          <span style={{ fontWeight: 500 }}>{mockFields.regularField.name}</span>
          <span style={{ marginLeft: '8px', color: '#6a6e73', fontSize: '12px' }}>
            {hasOverride(mockFields.regularField)
              ? getOverriddenType(mockFields.regularField)
              : mockFields.regularField.type}
          </span>
          {hasOverride(mockFields.regularField) && (
            <OverrideBadge
              originalType={mockFields.regularField.type}
              overriddenType={getOverriddenType(mockFields.regularField)}
            />
          )}
        </div>
      </div>

      {showMenu && selectedField && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            style={{
              position: 'absolute',
              left: menuPosition.x,
              top: menuPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <FieldContextMenu
              fieldName={selectedField.name}
              hasOverride={hasOverride(selectedField)}
              isAnyType={selectedField.isAnyType}
              position={{ x: 0, y: 0 }}
              onOverrideType={handleOverrideType}
              onForceOverrideType={handleForceOverrideType}
              onResetOverride={handleReset}
              onClose={() => setShowMenu(false)}
            />
          </div>
        </div>
      )}

      {showModal && selectedField && (
        <TypeOverrideModal
          isOpen={showModal}
          fieldPath={selectedField.path}
          fieldName={selectedField.name}
          originalType={selectedField.type}
          isForceOverride={isForceOverride}
          xmlSchemaTypes={availableTypes.xmlSchemaTypes}
          customTypes={availableTypes.customTypes}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
          onAttachSchema={handleAttachSchema}
        />
      )}
    </div>
  );
};
