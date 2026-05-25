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

# Crear un nuevo componente
pelela new [componentName]

# Renombrar un componente existente
pelela rename [oldName] [newName]

# Mostrar versión
pelela --version

# Mostrar ayuda
pelela --help
```

### Crear componentes

Crear un nuevo componente en el directorio `src`:

```bash
pelela new MyComponent
```

Esto creará los siguientes archivos:
- `src/my-component.ts` - Archivo TypeScript con la clase del componente
- `src/my-component.pelela` - Archivo de template Pelela
- `src/my-component.css` - Archivo de estilos CSS

El nombre del archivo se convierte automáticamente a **kebab-case** (`my-component.ts`), mientras que la clase se crea en **PascalCase** (`MyComponent`).

Crear un componente en un subdirectorio:

```bash
pelela new carpeta/MyComponent
```

Esto creará los archivos en `src/carpeta/my-component.*`.

### Renombrar componentes

Renombrar un componente existente:

```bash
pelela rename OldComponent NewComponent
```

Este comando:
- Busca recursivamente el archivo del componente en el proyecto
- Renombra los archivos `.ts`, `.pelela` y `.css` a kebab-case
- Actualiza el nombre de la clase en los archivos
- Actualiza los imports en todo el proyecto

El comando valida que el nuevo nombre sea **PascalCase** y que el componente antiguo exista en el proyecto.

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
- **Gestión de componentes** - Crear y renombrar componentes con convenciones de nombres consistentes
- **Normalización de nombres** - Los nombres de componentes se normalizan automáticamente a PascalCase
- **Convención kebab-case** - Los archivos de componentes se crean en kebab-case (`my-component.ts`)
- **Búsqueda recursiva** - El comando `rename` busca componentes recursivamente en el proyecto
- **Actualización de imports** - Al renombrar componentes, los imports se actualizan automáticamente
- **Configuración automática** - El nombre del proyecto se establece automáticamente en `package.json`
- **Gestión de versiones** - Verifica actualizaciones disponibles desde el registro NPM
- **Retroalimentación clara** - Mensajes útiles te guían a través del proceso

## Arquitectura

El CLI está organizado en módulos lógicos:

- **`commands/init.ts`** - Lógica de inicialización de proyectos
- **`commands/new.ts`** - Lógica de creación de componentes
- **`commands/rename.ts`** - Lógica de renombramiento de componentes
- **`utils/componentFiles.ts`** - Utilidades para gestión de archivos de componentes (creación, renombramiento, normalización de nombres)
- **`utils/version.ts`** - Verificación de versiones contra el registro NPM
- **`utils/shell.ts`** - Utilidades de shell (operaciones de archivos, gestión de directorios)
- **`utils/templates.ts`** - Copia de plantillas y configuración de proyectos

Cada módulo tiene una única responsabilidad y es independientemente testeable.
