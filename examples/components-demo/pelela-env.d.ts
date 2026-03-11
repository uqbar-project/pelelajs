declare module "*.pelela" {
  const template: string;
  export default template;
  export const viewModelName: string;
}

declare module "pelela:components" {
  export function registerAllComponents(): void;
}

