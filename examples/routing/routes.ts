import { Home } from "./src/home";
import { Detail } from "./src/detail";
import type { RouteDefinition } from "pelelajs";

export const routes: RouteDefinition[] = [
  { path: "/", component: Home },
  { path: "/users/:id", component: Detail },
  { path: "*", component: Home }, // Catch-all
];
