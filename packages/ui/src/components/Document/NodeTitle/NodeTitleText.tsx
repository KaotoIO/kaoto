import clsx from 'clsx';
import { FunctionComponent } from 'react';

export const NodeTitleText: FunctionComponent<{ className?: string; rank: number; title: string }> = ({
  className,
  rank,
  title,
}) => (
  <span className={clsx('node-title__text', className)} data-rank={rank}>
    {title}
  </span>
);
