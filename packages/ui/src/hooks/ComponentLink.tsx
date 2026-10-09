import { useState } from 'react';
import { Link } from 'react-router';

export const useComponentLink = (to: string) => {
  const [link] = useState(() => (props: Record<string, unknown>) => <Link {...props} to={to} />);

  return link;
};
