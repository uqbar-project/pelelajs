const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  
  // --- 1. Leer la VERSIÓN y el NOMBRE de la EXTESIÓN ---
  const src = path.join(repoRoot, "tools", "pelela-vscode"); 
  const extensionPackageJsonPath = path.join(src, "package.json");
  
  if (!fs.existsSync(extensionPackageJsonPath)) {
    console.error(`❌ Error: No se encontró el package.json de la extensión en: ${extensionPackageJsonPath}`);
    process.exit(1);
  }
  
  const extensionPackageJson = JSON.parse(fs.readFileSync(extensionPackageJsonPath, 'utf8'));
  
  // ¡USAMOS LA VERSIÓN Y EL NOMBRE DE LA EXTENSIÓN!
  const version = extensionPackageJson.version; // <--- Leerá 0.0.1
  const name = extensionPackageJson.name;       // <--- Leerá pelela-vscode
  
  // Validamos si la carpeta fuente existe
  if (!fs.existsSync(src)) {
    console.error(`❌ No se encontró la carpeta de la extensión en: ${src}`);
    process.exit(1);
  }
  
  // Construcción dinámica del nombre del archivo VSIX (Sin el publisher, como lo genera vsce)
  const vsixFileName = `${name}-${version}.vsix`; // <-- Coincidirá con pelela-vscode-0.0.1.vsix
  const vsixPath = path.join(src, vsixFileName);

  console.log(`📦 Generando paquete VSIX (v${version}) en ${src}...`);
  
  if (fs.existsSync(vsixPath)) {
    console.log(`   - Eliminando VSIX anterior: ${vsixPath}`);
    fs.unlinkSync(vsixPath);
  }
  
  try {
    // Usamos el flag para evitar que el script se cuelgue por warnings de publicación
    execSync(`vsce package --allow-missing-repository`, { cwd: src, stdio: 'inherit' });
    console.log(`✅ Paquete ${vsixFileName} creado correctamente.`);
    
  } catch (error) {
    console.error(`\n❌ Error al generar el paquete VSIX. Asegúrate de tener 'vsce' instalado.`);
    process.exit(1);
  }

  console.log(`📥 Hacé click derecho > Install Extension VSIX para instalar la extensión Pelela en VSCode...`);
}

main();