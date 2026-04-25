import "./styles.css";
import { defineViewModel, mountTemplate } from "pelelajs";
import { Converter } from "./src/Converter";
import template from "./src/Converter.pelela";

defineViewModel("Converter", Converter);

const root =
  document.getElementById("app") ?? document.body;
mountTemplate(root, template);