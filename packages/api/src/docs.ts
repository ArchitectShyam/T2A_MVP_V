/**
 * Minimal, dependency-free Scalar API reference page. It loads the Scalar
 * standalone bundle from a CDN and points it at the generated OpenAPI document.
 */
export function scalarDocsHtml(specUrl: string): string {
  return `<!doctype html>
<html>
  <head>
    <title>LifeOS API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="${specUrl}"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
}
