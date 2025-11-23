import "./style.css";
// import { bootstrap, defineViewModel } from "pelelajs";
import { defineViewModel, mountTemplate } from "pelelajs";
import { Conversor } from "./Conversor";
import template from "./Conversor.pelela";

defineViewModel("Conversor", Conversor);

// bootstrap();

const root = document.getElementById("app") ?? document.body;
mountTemplate(root, template);