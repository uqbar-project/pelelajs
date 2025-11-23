import * as fs from "fs";
import type { Plugin } from "vite";

function escapeTemplate(html: string): string {
  return html.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export function pelelajsPlugin(): Plugin {
  return {
    name: "vite-plugin-pelelajs",
    enforce: "pre",

    load(id) {
      if (!id.endsWith(".pelela")) return null;

      const code = fs.readFileSync(id, "utf-8");

      const openTags = code.match(/<pelela\b[^>]*>/g) || [];
      const closeTags = code.match(/<\/pelela>/g) || [];

      // Ningún <pelela>
      if (openTags.length === 0) {
        this.error(
          `Pelela template "${id}" debe contener exactamente un <pelela ...> como raíz.`,
        );
      }

      // Más de uno
      if (openTags.length > 1) {
        this.error(
          `Pelela template "${id}" tiene ${openTags.length} etiquetas <pelela>. Solo se permite una raíz.`,
        );
      }

      // Cierre faltante o desbalanceado
      if (closeTags.length === 0) {
        this.error(
          `Pelela template "${id}" no tiene etiqueta de cierre </pelela>.`,
        );
      }

      if (closeTags.length !== openTags.length) {
        this.error(
          `Pelela template "${id}" tiene un número desbalanceado de <pelela> y </pelela>.`,
        );
      }

      const viewModelMatch = code.match(
        /<pelela[^>]*view-model\s*=\s*"([^"]+)"/,
      );
      const viewModelName = viewModelMatch ? viewModelMatch[1] : null;

      if (!viewModelName) {
        this.error(
          `Pelela template "${id}" debe contener <pelela view-model="...">`,
        );
      }

      const escaped = escapeTemplate(code);

      const js = `
export const viewModelName = ${JSON.stringify(viewModelName)};
const template = \`${escaped}\`;
export default template;
`;

      return js;
    },
  };
}