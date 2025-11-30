import "./styles.css";
import { defineViewModel, mountTemplate } from "pelelajs";
import { App } from "./src/app";
import template from "./src/app.pelela";

defineViewModel("App", App);

const root =
  document.getElementById("app") ?? document.body;
mountTemplate(root, template);