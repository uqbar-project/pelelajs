# 🪴 Ejemplo de PelelaJS

¡Bienvenido a tu nuevo proyecto generado con Pelela CLI! Este esqueleto básico está listo para que empieces a programar, e incluye configuraciones modernas (linter con biome, TypeScript) y routing por defecto.

## 🚀 Cómo ejecutarlo

> **Nota sobre Node.js:** Ejecutá `nvm install` y `nvm use` antes de continuar.
> Estos comandos instalan y seleccionan Node.js según lo indicado en `.nvmrc`.

1. **Instalar las dependencias:**

Este proyecto utiliza `pnpm` como gestor de paquetes. Para instalar todo lo necesario, ejecutá:

```bash
pnpm install
```

1. **Levantar el servidor de desarrollo:**

Una vez instaladas las dependencias, arrancá el entorno con:

```bash
pnpm dev
```

1. **Ver la aplicación:**

Abrí tu navegador e ingresá a [http://localhost:5173](http://localhost:5173) para ver la aplicación funcionando en vivo.

## 🔎 Explorando el código

Para familiarizarte con el sistema de binding (binding) de PelelaJS, te invitamos a investigar la tríada de archivos iniciales en la carpeta `src/`:

- `base.ts`: Contiene la lógica, el estado y el comportamiento (View-Model).
- `base.pelela`: Es la vista (HTML) donde ocurre la magia visual.
- `base.css`: Los estilos dedicados para este componente.

💡 **Tip:** Podés renombrar estos tres archivos en cualquier momento (por ejemplo, a `home.ts`, `home.pelela` y `home.css`) y el framework automáticamente tomará los cambios gracias a su registro dinámico.

## 🔔 Mostrar mensajes con toast

Pelela incluye un servicio de notificaciones breves llamado `toast`. Podés importar la constante `ToastSeverity` para elegir el tipo de mensaje:

```typescript
import { toast, ToastSeverity } from 'pelelajs'

toast.message('Conversión realizada', ToastSeverity.success)
toast.message('Revisá los datos', ToastSeverity.warning)
toast.message(String(error), ToastSeverity.error)
toast.message('Cargando...', ToastSeverity.info)
```

Los toasts se cierran solos a los 4 segundos. Si querés que uno quede visible hasta que lo cierres, pasá `duration: 0`:

```typescript
toast.message('No se pudo conectar', ToastSeverity.error, { duration: 0 })
```

Podés cambiar la posición por defecto con `toast.configure` y `ToastAlignment`:

```typescript
import { toast, ToastAlignment } from 'pelelajs'

toast.configure({
  horizontal: ToastAlignment.center,
  vertical: ToastAlignment.start,
})
```

También podés pasar `horizontal` y `vertical` a un toast puntual para ubicarlo en otro lugar. Para borrar todos los toasts de la pantalla, usá `toast.clear()`.

## 📦 Versionado (Git)

Para inicializar un repositorio para este proyecto, te recordamos los pasos por consola:

```bash
# 1. Inicializar Git y preparar el primer commit
git init
git add .
git commit -m "commit inicial"

# 2. Vincularlo con tu repositorio remoto (GitHub, GitLab, etc.)
# git remote add origin <TU_URL_DEL_REPOSITORIO>
# git push -u origin main
```

---

## 🛠️ Extensiones Recomendadas

Si utilizás VSCode o similares (Cursor, VSCodium, Windsurf, Antigravity), te recomendamos instalar las siguientes extensiones para aprovechar al máximo el entorno:

- **PelelaJS** (`pelelajs.pelela-vscode`): Autocompletado, resaltado de sintaxis y diagnóstico para archivos `.pelela`.
- **Biome** (`biomejs.biome`): Linter y formateador ultrarrápido configurado por defecto en este proyecto.

---

## 📝 TODOs Pendientes

- [ ] Agregar enlace a la documentación oficial para estudiantes de PelelaJS.
- [ ] Detallar instrucciones para renombrar y organizar el componente base usando el CLI.
