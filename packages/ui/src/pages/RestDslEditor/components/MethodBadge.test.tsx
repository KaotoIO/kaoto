import { render, screen } from '@testing-library/react';

import { MethodBadge } from './MethodBadge';

describe('MethodBadge', () => {
  it('renders GET with blue type when type is get', () => {
    render(<MethodBadge type="get" />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('renders POST with cyan type when type is post', () => {
    render(<MethodBadge type="post" />);
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('renders PUT with green type when type is put', () => {
    render(<MethodBadge type="put" />);
    expect(screen.getByText('PUT')).toBeInTheDocument();
  });

  it('renders DELETE with red type when type is delete', () => {
    render(<MethodBadge type="delete" />);
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('renders HEAD with teal type when type is head', () => {
    render(<MethodBadge type="head" />);
    expect(screen.getByText('HEAD')).toBeInTheDocument();
  });

  it('renders unknown type uppercased with gray when type is not get/post/put/delete/head', () => {
    render(<MethodBadge type="patch" />);
    expect(screen.getByText('PATCH')).toBeInTheDocument();
  });
});
