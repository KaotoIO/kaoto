import { render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useSafeParams } from './useSafeParams';

// Helper component: renders the param value or redirects to / on invalid params
const Consumer = ({ keys }: { keys: string[] }) => {
  const params = useSafeParams(keys);
  if (!params) return <Navigate to="/" replace />;
  return <div data-testid="result">{JSON.stringify(params)}</div>;
};

const renderInRoute = (path: string, url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={path} element={<Consumer keys={['projectId']} />} />
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('useSafeParams', () => {
  it('returns valid params as a typed record', () => {
    renderInRoute('/projects/:projectId', '/projects/my-project');
    expect(screen.getByTestId('result')).toHaveTextContent('{"projectId":"my-project"}');
  });

  it('allows alphanumeric, hyphen, and underscore characters', () => {
    renderInRoute('/projects/:projectId', '/projects/proj_123-ABC');
    expect(screen.getByTestId('result')).toHaveTextContent('{"projectId":"proj_123-ABC"}');
  });

  it('redirects to / when a param contains invalid characters', () => {
    renderInRoute('/projects/:projectId', '/projects/%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.queryByTestId('result')).not.toBeInTheDocument();
  });

  it('redirects to / when a param contains path traversal sequences', () => {
    renderInRoute('/projects/:projectId', '/projects/..%2F..%2Fetc');
    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.queryByTestId('result')).not.toBeInTheDocument();
  });
});
