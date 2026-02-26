import "./styles.css";
import { defineViewModel, mountTemplate } from "pelelajs";
import { registerAllComponents } from "pelela:components";
import { App } from "./src/app";
import template from "./src/app.pelela";

registerAllComponents();

defineViewModel("App", App);

const root = document.getElementById("app") ?? document.body;
mountTemplate(root, template);
