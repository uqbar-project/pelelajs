import * as fs from "node:fs";
import path from "node:path";

function escapeTemplate(html: string): string {
  return html.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function getCssImport(pelelaFilePath: string): string {
  const cssFile = pelelaFilePath.replace(/\.pelela$/, ".css");
  if (fs.existsSync(cssFile)) {
    const cssBase = path.basename(cssFile);
    return `import "./${cssBase}";\n`;
  }
  return "";
}

function validatePelelaStructure(
  code: string,
  id: string,
  errorFn: (msg: string) => void,
): void {
  const openTags = code.match(/<pelela\b[^>]*>/g) || [];
  const closeTags = code.match(/<\/pelela>/g) || [];

  if (openTags.length === 0) {
    errorFn(
      `Pelela template "${id}" debe contener exactamente un <pelela ...> como raíz.`,
    );
  }

  if (openTags.length > 1) {
    errorFn(
      `Pelela template "${id}" tiene ${openTags.length} etiquetas <pelela>. Solo se permite una raíz.`,
    );
  }

  if (closeTags.length === 0) {
    errorFn(`Pelela template "${id}" no tiene etiqueta de cierre </pelela>.`);
  }

  if (closeTags.length !== openTags.length) {
    errorFn(
      `Pelela template "${id}" tiene un número desbalanceado de <pelela> y </pelela>.`,
    );
  }
}

function extractViewModelName(
  code: string,
  id: string,
  errorFn: (msg: string) => void,
): string {
  const viewModelMatch = code.match(
    /<pelela[^>]*view-model\s*=\s*"([^"]+)"/,
  );
  const viewModelName = viewModelMatch ? viewModelMatch[1] : null;

  if (!viewModelName) {
    errorFn(`Pelela template "${id}" debe contener <pelela view-model="...">`);
  }

  return viewModelName as string;
}

export interface PelelaVitePlugin {
  name: string;
  enforce?: "pre" | "post";
  load?(this: any, id: string): string | null | Promise<string | null>;
}

export function pelelajsPlugin(): PelelaVitePlugin {
  return {
    name: "vite-plugin-pelelajs",
    enforce: "pre",

    load(id) {
      if (!id.endsWith(".pelela")) return null;

      const code = fs.readFileSync(id, "utf-8");
      const cssImport = getCssImport(id);

      validatePelelaStructure(code, id, this.error.bind(this));
      const viewModelName = extractViewModelName(code, id, this.error.bind(this));

      const escaped = escapeTemplate(code);

      const js = `
${cssImport}export const viewModelName = ${JSON.stringify(viewModelName)};
const template = \`${escaped}\`;
export default template;
`;

      return js;
    },
  };
}