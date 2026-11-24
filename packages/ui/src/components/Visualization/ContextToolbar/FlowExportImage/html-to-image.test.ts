/**
 * The image export renders the canvas with html-to-image, which draws a copy of it without the stylesheets of the page:
 * every element needs its computed style written inline. The canvas is an SVG whose nodes and groups are HTML inside
 * `foreignObject`s, so this must hold inside an SVG as well. html-to-image 1.11.12 and 1.11.13 copy an SVG as a whole
 * and skip that, which exports the route group black (#2162). This checks the real library, which the other tests mock.
 */
type HtmlToImage = typeof import('html-to-image');

/** The computed style each probe element gets, which the export has to write inline */
const PROBE_STYLES: Record<string, string> = {
  'probe-rect': 'color: rgb(1, 2, 3);',
  'probe-box': 'background-color: rgb(4, 5, 6);',
};

describe('html-to-image, as the image export uses it', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // jsdom has no SVGImageElement, which html-to-image looks for when it embeds the images
    if (!('SVGImageElement' in globalThis)) vi.stubGlobal('SVGImageElement', class extends SVGElement {});
    /*
     * html-to-image reads every computed property of every element and of its ::before and ::after. jsdom computes
     * them so slowly that this took over a minute with coverage on the CI runners, so each element gets a small
     * computed style of its own instead: the probes theirs, everything else none.
     */
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
      const style = document.createElement('div').style;
      style.cssText = PROBE_STYLES[element.getAttribute('class') ?? ''] ?? '';
      return style;
    });

    container = document.createElement('div');
    container.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect class="probe-rect" width="10" height="10" />
        <foreignObject width="50" height="50">
          <div xmlns="http://www.w3.org/1999/xhtml" class="probe-box">step</div>
        </foreignObject>
      </svg>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Exports the container as html-to-image does for the image, and returns the opening tag of the element with the
   * class in the SVG it draws. The tag is read from the text, as the SVG repeats an `xmlns` in jsdom, which an XML
   * parser rejects.
   */
  const exportedTag = async (className: string) => {
    const { toSvg } = await vi.importActual<HtmlToImage>('html-to-image');
    const dataUrl = await toSvg(container, { fontEmbedCSS: '' });
    const svg = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1));
    return new RegExp(`<[a-zA-Z]+ [^>]*class="${className}"[^>]*>`).exec(svg)?.[0];
  };

  it('writes the style of an SVG shape inline', async () => {
    const tag = await exportedTag('probe-rect');

    expect(tag).toMatch(/style="[^"]*rgb\(1, 2, 3\)/);
  });

  it('writes the style of HTML inside a foreignObject of an SVG inline', async () => {
    const tag = await exportedTag('probe-box');

    expect(tag).toMatch(/style="[^"]*rgb\(4, 5, 6\)/);
  });
});
