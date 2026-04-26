import "./src/styles.css";
import { bootstrap, defineComponent } from "pelelajs";

import { Home } from "./src/home";
import homeTemplate from "./src/home.pelela";

import { PersonRow } from "./src/persona";
import personaTemplate from "./src/persona.pelela";

import { Counter } from "./src/contador";
import contadorTemplate from "./src/contador.pelela";

defineComponent("Home", Home, homeTemplate);
defineComponent("PersonRow", PersonRow, personaTemplate);
defineComponent("Counter", Counter, contadorTemplate);

const root = document.getElementById("app") ?? document.body;
root.innerHTML = `<pelela view-model="Home"></pelela>`;

bootstrap({ root });
