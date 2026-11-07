# Toast Notifications

The toast service is a small imperative view service. It is not a Pelela component, it does not need a view model or a layout, and it does not add state to the commands that use it.

## Public API

Import the service and the constants from Pelela:

```typescript
import { toast, ToastAlignment, ToastSeverity } from 'pelelajs'
```

Show a toast with `toast.message`:

```typescript
toast.message('Compra guardada', ToastSeverity.success)
toast.message(String(error), ToastSeverity.error)
toast.message('Revisá los datos', ToastSeverity.warning)
toast.message('Cargando...', ToastSeverity.info)
```

The first argument is the message, the second is an optional `ToastSeverity`, and the third is an optional `ToastOptions` object:

```typescript
toast.message('No se pudo conectar', ToastSeverity.error, { duration: 0 })
```

Clear all visible toasts with:

```typescript
toast.clear()
```

## Severities

| Constant | Value | Role |
| --- | --- | --- |
| `ToastSeverity.info` | `info` | `status` |
| `ToastSeverity.success` | `success` | `status` |
| `ToastSeverity.warning` | `warning` | `alert` |
| `ToastSeverity.error` | `error` | `alert` |

Warning and error use `role="alert"`. Info and success use `role="status"`. Every toast also sets `aria-atomic="true"`.

## Duration

Toasts stay visible for `4000 ms` by default. This is useful for success and info messages. A duration of `0` disables auto-dismiss:

```typescript
toast.message('No se pudo conectar', ToastSeverity.error, { duration: 0 })
```

With `duration: 0`, the toast stays on screen until the user clicks its close button or the app calls `toast.clear()`.

## Positioning

The same `ToastAlignment` constants are used for both axes:

| Constant | Value |
| --- | --- |
| `ToastAlignment.start` | `start` |
| `ToastAlignment.center` | `center` |
| `ToastAlignment.end` | `end` |

Configure the global default with `toast.configure`:

```typescript
toast.configure({
  horizontal: ToastAlignment.center,
  vertical: ToastAlignment.start,
})
toast.message('Hola')
```

A single toast can override that default with its own position:

```typescript
toast.message('Hola', ToastSeverity.info, {
  horizontal: ToastAlignment.start,
  vertical: ToastAlignment.start,
})
```

`toast.configure` only changes the default for later toasts. Toasts that are already visible do not move. If a region was removed from the DOM, the next toast recreates it.

## Regions and stacking

The service creates one full-screen region per position that is actually used and appends it to `document.body`. The region has `pointer-events: none`, so it does not block the page; each toast has `pointer-events: auto`.

The toast size adapts to its content. A short message uses a minimum width of `min(18rem, 100%)` and grows up to `min(28rem, 100%)`. Multiple toasts in one region stack with `gap` and do not overlap.

The default position is `End` for both axes, which shows toasts at the bottom right.

## Animation

The toast enters with a 150 ms fade, slide, and scale animation. On dismiss it receives the `pelela-toast--leaving` class and is removed after another 150 ms. The animation uses a CSS variable that depends on the vertical alignment: toasts entering from the bottom slide up, toasts entering from the top slide down, and centered toasts use no vertical offset.

`prefers-reduced-motion` disables the animation.

## Security

The service never uses `innerHTML` for a toast message. The message element is created with `document.createElement('span')` and the message is assigned with `textContent`. The close button is created as a button element and its label is set with `setAttribute('aria-label', …)`.

That means a message like this is displayed as literal text: no `<img>`, `<script>` or `onerror` element is created from it.

```typescript
toast.message('<img src=x onerror="alert(1)">', ToastSeverity.error)
```

The injected stylesheet is a trusted constant string. It is not assembled from the toast message.

## Internationalization

The only user-facing word rendered by the framework is the dismiss button label. It uses the `errors.ui.toast.dismiss` message:

- `en`: `Dismiss notification`
- `es`: `Cerrar notificación`

The message passed by the application is application content, so the framework does not translate it.

## DOM requirements

`toast.message` fails fast with `DOMEnvironmentError` when there is no DOM environment. `toast.configure` and `toast.clear` do not require a DOM.

## Tests

The toast behavior is covered in `packages/core/src/toast/toast.test.ts`. It verifies severity roles, text insertion, style and region creation, default and custom positions, auto-dismiss timing, persistent toasts, `clear`, localization, and the missing-DOM error.

## Example

```typescript
export class Checkout {
  async save(): Promise<void> {
    try {
      await this.repository.save()
      toast.message('Compra guardada', ToastSeverity.success)
    } catch (error) {
      toast.message(String(error), ToastSeverity.error)
    }
  }
}
```
