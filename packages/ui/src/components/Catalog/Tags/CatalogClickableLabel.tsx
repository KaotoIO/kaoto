import { Label, LabelProps } from '@patternfly/react-core';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode } from 'react';

interface ICatalogClickableLabelProps {
  color?: LabelProps['color'];
  variant?: LabelProps['variant'];
  icon?: ReactNode;
  /** Extra class names appended to the PatternFly label content class of the inner button */
  buttonClassName?: string;
  'data-testid'?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Compact, clickable PatternFly label whose content is rendered as a native `<button type="button">`.
 * Callers own the click semantics (e.g. stopping propagation) through `onClick` / `onMouseDown`.
 */
export const CatalogClickableLabel: FunctionComponent<PropsWithChildren<ICatalogClickableLabelProps>> = ({
  color,
  variant,
  icon,
  buttonClassName,
  'data-testid': dataTestId,
  onClick,
  onMouseDown,
  children,
}) => {
  return (
    <Label
      isCompact
      isClickable
      color={color}
      variant={variant}
      icon={icon}
      render={({ className, content }) => (
        <button
          type="button"
          className={buttonClassName ? `${className} ${buttonClassName}` : className}
          data-testid={dataTestId}
          onMouseDown={onMouseDown}
          onClick={onClick}
        >
          {content}
        </button>
      )}
    >
      {children}
    </Label>
  );
};
