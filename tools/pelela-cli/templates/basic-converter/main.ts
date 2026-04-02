import "./styles.css";
import { defineViewModel, mountTemplate } from "pelelajs";
import { Conversor } from "./src/Example";
import template from "./src/Conversor.pelela";

defineViewModel("Conversor", Conversor);

const root =
  document.getElementById("app") ?? document.body;
mountTemplate(root, template);