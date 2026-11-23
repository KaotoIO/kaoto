import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { describe, expect, it } from 'vitest';

import { filePathFromSplat, fileUrl } from './file-url';

const ShowPath = () => <p data-testid="path">{String(filePathFromSplat(useParams()['*']))}</p>;

describe('fileUrl', () => {
  it.each([
    ['a.yaml', '/workspace/file/a.yaml'],
    ['routes/my route.camel.yaml', '/workspace/file/routes/my%20route.camel.yaml'],
    ['a#b/c?.yaml', '/workspace/file/a%23b/c%3F.yaml'],
  ])('builds the URL of %s', (path, url) => {
    expect(fileUrl(path)).toBe(url);
  });

  it.each(['a.yaml', 'my folder/a#b.camel.yaml', 'x/100%/y?.yaml', 'ä/ö ü.yaml'])(
    'gets %s back from the route of its URL',
    (path) => {
      render(
        <MemoryRouter initialEntries={[fileUrl(path)]}>
          <Routes>
            <Route path="/workspace/file/*" element={<ShowPath />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('path')).toHaveTextContent(path, { normalizeWhitespace: false });
    },
  );

  it.each([undefined, ''])('has no path for the splat %j', (splat) => {
    expect(filePathFromSplat(splat)).toBeUndefined();
  });
});
