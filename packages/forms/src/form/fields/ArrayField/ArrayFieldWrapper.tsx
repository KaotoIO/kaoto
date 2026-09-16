import { Tile, Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';
import { Information } from '@carbon/icons-react';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import './ArrayFieldWrapper.scss';

interface FieldWrapperProps {
  propName: string;
  type: 'array' | 'object' | 'expression';
  title: string;
  description?: string;
  defaultValue?: unknown;
  actions?: ReactNode;
  required?: boolean;
}

export const ArrayFieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
  propName,
  type,
  title,
  description,
  defaultValue,
  actions,
  children,
  required,
}) => {
  const shouldRenderChildren = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <Tile data-testid={`${propName}__field-wrapper`} className="array-field-wrapper-tile">
      <div
        className={`array-field-wrapper-header ${
          shouldRenderChildren ? 'array-field-wrapper-header--with-children' : ''
        }`}
      >
        <div className="array-field-wrapper-title-section">
          <h4 className="cds--tile-heading array-field-wrapper-heading">
            {required && <span className="array-field-wrapper-required">*</span>}
            {title}
          </h4>
          <Toggletip align="top">
            <ToggletipButton label={`More info for ${title} field`}>
              <Information />
            </ToggletipButton>
            <ToggletipContent>
              <p>
                <strong>
                  {title} {`<${type}>`}
                </strong>
              </p>
              <p>{description}</p>
              <p>Default: {defaultValue?.toString() ?? 'no default value'}</p>
            </ToggletipContent>
          </Toggletip>
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {shouldRenderChildren && (
        <div data-testid={`${propName}__children`} className="kaoto-form kaoto-form__label">
          {children}
        </div>
      )}
    </Tile>
  );
};
