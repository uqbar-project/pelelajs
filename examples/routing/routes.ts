import { Home } from "./src/home";
import { Detail } from "./src/detail";
import { DetailSpecial } from "./src/detail-special";
import type { RouteDefinition } from "pelelajs";

export const routes: RouteDefinition[] = [
  { path: "/", component: Home },
  { path: "/users/:id", component: Detail },
  { path: "/special-users/:id", component: DetailSpecial },
  { path: "*", component: Home }, // Catch-all
];
