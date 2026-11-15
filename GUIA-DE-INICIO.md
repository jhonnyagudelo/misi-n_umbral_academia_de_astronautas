# Guía de instalación y desarrollo

Esta guía corresponde a la versión de entrega del prototipo. El resumen del producto está en [README](README.md) y el recorrido de demostración en [docs/ENTREGA.md](docs/ENTREGA.md).

## Iniciar

Se verificó con Node.js 26. Desde la raíz:

```sh
npm ci
npm run dev
```

Abrir http://localhost:4321/juego. En Windows, usar npm.cmd si PowerShell bloquea npm.ps1.

## Validar

```sh
npm test
npx tsc --noEmit
npm run build
npm run preview
```

La compilación genera `dist/`. No modificar esa carpeta manualmente ni subir dependencias o credenciales.

## Criterios de mantenimiento

- Reglas y recursos se calculan en `src/game/`; la interfaz envía acciones a un único estado.
- Las cifras del entrenamiento deben identificarse como reglas, separadas de hechos científicos.
- El guardado de partida y el logro de dificultad son locales e independientes.
- Los cambios de traje no rellenan gratuitamente reservas; se recarga en los puntos operativos.
- Mantener textos comprensibles, controles accesibles y pausa durante explicaciones.

## Comprobaciones de navegador

`scripts/qa-preparation-service.mjs` comprueba carga/refugio, recarga y desbloqueo. Usa el servidor local 4321 y un Chrome de prueba independiente con depuración en 9223. No ejecutarlo contra el navegador personal. Su fixture de victoria usa el motor real.

Los otros QA conservan recorridos anteriores y pueden requerir ajustes al cambiar reglas, desbloqueos o explicaciones. Las capturas temporales se guardan fuera del repositorio. La imagen en `docs/media/` es una vista seleccionada para presentar el juego.

## Publicación

La web y el repositorio son entregables separados: subir a GitHub no actualiza automáticamente la web. La versión en línea está enlazada en README. Conservar separadas las credenciales y la configuración local del alojamiento.
