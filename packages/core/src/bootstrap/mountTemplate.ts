import { bootstrap } from "./bootstrap";

export function mountTemplate(
  container: HTMLElement,
  templateHtml: string,
): void {
  container.innerHTML = templateHtml;
  bootstrap({ root: container });
}

