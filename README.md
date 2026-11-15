# Misión Umbral · Academia de Astronautas

**Pequeñas decisiones. Grandes misiones.**

Prototipo educativo web en español para niños desde siete años. Prepara un traje, organiza los suministros y ayuda a una tripulación en una base marciana de entrenamiento. Cada decisión combina una ventaja con un costo.

**[Jugar en línea](https://mision-umbral-academia.jfelipevv-2005.chatgpt.site/juego)** · [Guía para presentar el proyecto](docs/ENTREGA.md) · [Instalación y desarrollo](GUIA-DE-INICIO.md)

![Vista de la base y los sistemas del traje en Misión Umbral](docs/media/juego-base.png)

## La experiencia

1. **Preparar:** elige tres de seis mejoras y compara sus ventajas; selecciona nave, carga y protección del refugio.
2. **Viajar:** sigue pasos numerados, revisa controles y conserva agua y energía.
3. **Rescatar:** recorre cuatro pisos, distribuye cuatro baterías entre seis estaciones, repara equipos y consigue una cosecha.
4. **Investigar y proteger:** compara muestras en AVATAR, completa el informe y supera una alerta solar y una avería.
5. **Comprender:** regresa con la tripulación y responde tres preguntas sobre tus decisiones.

La partida incluye movimiento con teclado y controles táctiles, explicaciones por zona, narración y música con controles independientes, pausa y guardado local. El modo difícil de Apolo se desbloquea al completar Artemis normal.

## Qué enseña

- Los recursos son limitados: no todas las estaciones pueden funcionar al mismo tiempo.
- Una mejora útil tiene costos de movilidad, energía o tiempo.
- Preparar un refugio implica reservar capacidad que podría transportar agua.
- Una investigación compara condiciones: la muestra de vuelo necesita una muestra de control en Tierra.
- El traje necesita volver a puntos operativos para recuperar oxígeno, energía y abrigo.

## Ciencia y representación

La base de Marte es un concepto futuro de entrenamiento. Apollo y Orion son referencias comparativas; estas misiones no viajaron a esta base. AVATAR representa una investigación con modelos de tejido, no un implante en el personaje.

Los tiempos, capacidades, masa y consumo son **reglas del juego**, no medidas de seguridad humana. Las fuentes y límites se consultan en [Ciencia y créditos](https://mision-umbral-academia.jfelipevv-2005.chatgpt.site/fuentes) y en `data/fuentes.json`. Proyecto independiente, sin certificación ni respaldo de NASA.

## Controles

| Acción | Control |
|---|---|
| Caminar | Flechas izquierda/derecha o A/D; soltar detiene el movimiento |
| Cambiar de piso | Flechas arriba/abajo, usando la escalera |
| Acercarse a una estación | Clic o toque sobre el lugar |
| Usar un lugar cercano | E o botón contextual |
| Elegir mejoras | Arrastrar tarjeta al espacio, o tocar tarjeta y espacio |
| Guardar y continuar | Botón de guardar; continuar al volver en el mismo navegador |
| Sonido | Música y voz por separado; repetir narración |

El navegador puede exigir una primera interacción para reproducir sonido. El guardado es local: no sincroniza dispositivos y puede borrarse al limpiar los datos del navegador.

## Ejecutar y comprobar

Usamos Node.js 26 en la validación de esta entrega.

```sh
npm ci
npm run dev
```

Abrir `http://localhost:4321/juego`.

```sh
npm test
npx tsc --noEmit
npm run build
npm run preview
```

En Windows se puede usar `npm.cmd` y `npx.cmd`.

**Verificación de entrega:** 131 pruebas aprobadas; TypeScript y compilación estática correctos. Revisiones locales de preparación, recarga, bloqueo/desbloqueo, guardado, voz y adaptación en seis tamaños. Esto no sustituye una evaluación con niños ni garantiza la disponibilidad de voz en todos los dispositivos.

## Organización

- `src/game/`: reglas, estado único, guardado y progresión.
- `src/components/`: escenas, decisiones, audio y actividades.
- `src/content/`: orientación, explicaciones y comparaciones.
- `src/styles/`: interfaz y adaptación a pantalla.
- `public/`: recursos usados por el juego y licencias tipográficas.
- `assets/source/`: originales editables del arte.
- `data/`: fuentes y datos del entrenamiento.
- `scripts/`: generación de arte y verificaciones de navegador.
- `docs/`: documentación del proyecto y material de presentación.

Astro + React + TypeScript + CSS; Vitest para las pruebas. Las reglas son independientes del navegador. Phaser está instalado como dependencia del proyecto, pero la escena vigente usa React y CSS.

## Alcance de esta entrega

Esta versión es un prototipo jugable. La comida y las baterías adicionales todavía no tienen una ventaja distinta a la carga mínima requerida; el agua extra sí modifica la reserva inicial. No se han integrado el evento histórico DONKI, RTG, radio demorada, polvo/moho ni evacuación de compañeros. Su desarrollo requiere completar diseño, balance y revisión científica.

## Equipo y créditos

**Felipe · Jonny Agudelo · Angela Lopez · Samantha Urbano**

Código, textos, ilustraciones originales e interfaz preparados con asistencia de IA. Pixelify Sans se distribuye bajo SIL Open Font License 1.1; licencia incluida en `public/fonts/`. Las referencias visuales orientan la composición y no implican autorización para copiar marcas o logotipos.
