import { useRef } from 'react';
import { Link } from 'react-router';

export const useComponentLink = (to: string) => {
  const link = useRef((props: Record<string, unknown>) => <Link {...props} to={to} />);

  return link.current;
};
