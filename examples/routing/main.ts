import "./src/styles.css";
import { defineComponent, router } from "pelelajs";

import { Home } from "./src/home";
import homeTemplate from "./src/home.pelela";

import { Detail } from "./src/detail";
import detailTemplate from "./src/detail.pelela";

// Registramos los componentes del router
defineComponent("Home", Home, homeTemplate);
defineComponent("Detail", Detail, detailTemplate);

const root = document.getElementById("app") ?? document.body;

// Iniciamos el router con las rutas definidas
router.start(root, [
  { path: "/", component: Home },
  { path: "/users/:id", component: Detail },
  { path: "*", component: Home } // Catch-all
]);
