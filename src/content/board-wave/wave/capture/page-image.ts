import { z } from 'zod/mini';

// An image the page itself loads. Firefox gives what a content script loads
// the extension's principal, so a picture it draws taints the page's canvas,
// and WebGL then refuses it: the page's own Image constructor (reached through
// `wrappedJSObject`, Firefox's way past its wrappers) loads it as the page.
// Chrome has no such wrapper, and no such taint.

const PageWindowSchema = z.object({
  Image: z.custom<typeof Image>(value => typeof value === 'function'),
});

/** A new image, loaded as the page's own where the browser tells the two apart. */
export function pageImage(): HTMLImageElement {
  const pageWindow: unknown = Reflect.get(window, 'wrappedJSObject');
  const PageImage = PageWindowSchema.safeParse(pageWindow).data?.Image ?? Image;
  return new PageImage();
}
