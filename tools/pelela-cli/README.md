# Pelela CLI

Herramienta de línea de comandos para trabajar con proyectos PelelaJS de forma rápida y sencilla.

## Instalación

### Instalación global (recomendada)

```bash
pnpm add -g @pelelajs/cli
```

Después de la instalación, el comando `pelela` estará disponible globalmente.

### Modo desarrollo (dentro de este workspace)

```bash
pnpm -C tools/pelela-cli build
pnpm -C tools/pelela-cli dev
```

## Uso

### Inicializar un nuevo proyecto

Crear un nuevo proyecto con el nombre por defecto "example":

```bash
pelela init
```

> **Nota:** El comando `init` normaliza automáticamente el nombre del proyecto a minúsculas y formato de paquete npm (sin espacios ni caracteres especiales).

Crear un nuevo proyecto con un nombre personalizado:

```bash
pelela init MiProyecto
```

Esto creará un directorio llamado `miproyecto` (nombre normalizado).

Este comando realizará:
1. Crear un nuevo directorio con el nombre de tu proyecto
2. Copiar una plantilla mínima de PelelaJS (basada en `basic-converter`)
3. Actualizar el `package.json` del proyecto con el nombre de tu proyecto
4. Mostrar los siguientes pasos para el desarrollo

### Comandos disponibles

```bash
# Inicializar un nuevo proyecto
pelela init [projectName]

# Mostrar versión
pelela --version

# Mostrar ayuda
pelela --help
```

## Inicio rápido después de la inicialización

Después de ejecutar `pelela init MiProyecto` (que crea el directorio `miproyecto`):

```bash
cd miproyecto
pnpm install
pnpm dev
```

Luego abre `http://localhost:5173` en tu navegador.

## Desarrollo

### Compilar el CLI

```bash
pnpm -C tools/pelela-cli build
```

### Modo watch

```bash
pnpm -C tools/pelela-cli dev
```

### Ejecutar tests

```bash
pnpm -C tools/pelela-cli test:run
```

### Lint y format

```bash
pnpm -C tools/pelela-cli biome:check:fix
```

## Características

- **Scaffolding de proyectos** - Crear rápidamente nuevos proyectos PelelaJS desde una plantilla
- **Configuración automática** - El nombre del proyecto se establece automáticamente en `package.json`
- **Gestión de versiones** - Verifica actualizaciones disponibles desde el registro NPM
- **Retroalimentación clara** - Mensajes útiles te guían a través del proceso

## Arquitectura

El CLI está organizado en módulos lógicos:

- **`commands/init.ts`** - Lógica de inicialización de proyectos
- **`utils/version.ts`** - Verificación de versiones contra el registro NPM
- **`utils/shell.ts`** - Utilidades de shell (operaciones de archivos, gestión de directorios)
- **`utils/templates.ts`** - Copia de plantillas y configuración de proyectos

Cada módulo tiene una única responsabilidad y es independientemente testeable.
