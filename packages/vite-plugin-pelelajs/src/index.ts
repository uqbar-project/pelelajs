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