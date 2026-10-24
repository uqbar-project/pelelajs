# Bug 164: autocomplete dentro de un `for-each`

Ejemplo mínimo para reproducir el [issue #164](https://github.com/uqbar-project/pelelajs/issues/164):
al pedir autocompletado después del punto en el ítem de un `for-each`, la extensión
sugiere los miembros de `Array` (`map`, `filter`, `concat`, etc.) en lugar de los
miembros del elemento iterado.

## Cómo levantarlo

1. Desde la raíz del repo, instalá las dependencias para registrar el nuevo workspace:

    ```bash
    pnpm install
    ```

2. Levantá el ejemplo:

    ```bash
    pnpm --filter eg-bug-164-pelelajs dev
    ```

3. Abrí `examples/bug-164/src/app.pelela` en VS Code con la extensión Pelela instalada.

## Cómo reproducir el bug

1. Ubicate en la línea del `for-each`:

    ```html
    <span bind-content="character.name"></span>
    ```

2. Borrá `name` para que quede `character.`.
3. Pedí autocompletado con `Ctrl` + `Space`.

No hace falta guardar el archivo: con el cambio sin guardar ya se ven las sugerencias. Si lo
guardás, la app puede mostrar un error de binding hasta que repongas `name`.

### Resultado actual (bug)

La lista sugiere `concat`, `filter`, `map` y el resto de `Array.prototype`.

### Resultado esperado

La lista debería sugerir `name`, `house`, `age` y `description`.

## Caso de contraste

En la segunda tarjeta del ejemplo, `selectedCharacter.` está **fuera** del `for-each`.
Ahí el autocompletado sí sugiere los miembros de `Character`. Ese es el caso que se usó
para verificar el issue por error: el problema solo aparece cuando se completa el ítem
iterado, no una propiedad tipada cualquiera.
