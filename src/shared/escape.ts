// Text made safe to put in markup, apart from html.ts so that code without a
// DOM (the build's scripts) can use it.

const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ENTITIES[char] ?? char);
}
