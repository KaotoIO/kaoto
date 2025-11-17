import './FloatingCircle.scss';

import clsx from 'clsx';
import { FunctionComponent, PropsWithChildren } from 'react';

export const FloatingCircle: FunctionComponent<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return <div className={clsx('floating-circle', className)}>{children}</div>;
};
