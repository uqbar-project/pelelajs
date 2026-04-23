import "./src/styles.css";
import { bootstrap, defineComponent } from "pelelajs";

import { Home } from "./src/home";
import homeTemplate from "./src/home.pelela";

import { PersonaRow } from "./src/persona";
import personaTemplate from "./src/persona.pelela";

import { Contador } from "./src/contador";
import contadorTemplate from "./src/contador.pelela";

defineComponent("Home", Home, homeTemplate);
defineComponent("PersonaRow", PersonaRow, personaTemplate);
defineComponent("Contador", Contador, contadorTemplate);

const root = document.getElementById("app") ?? document.body;
root.innerHTML = `<pelela view-model="Home"></pelela>`;

bootstrap({ root });
