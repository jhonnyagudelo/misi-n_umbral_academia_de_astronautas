# Guía de inicio: por dónde empezar

Documento operativo para el equipo. El diseño ya está en el PDF de dirección; acá está el **orden** en que se construye, con las puertas de validación.

## Regla cero

El código no existe todavía. Se empieza por lo único que no se puede apurar: **las reglas del juego**. Si las reglas están bien y probadas, la escena y la interfaz son trabajo mecánico. Si las reglas están en la escena, cada cambio visual rompe el balance y no hay tiempo de arreglarlo.

Orden correcto: **reglas → estado único → escena → contenido → cierre**.

---

## Antes de escribir código: cinco decisiones

Se resuelven en paralelo, en menos de una hora. Ninguna requiere programar.

| # | Decisión | Quién | Por qué bloquea |
| --- | --- | --- | --- |
| 1 | Fecha límite real, plataforma de entrega, categoría y desafío | Felipe | Sin plazo confirmado no se sabe cuándo se congela el alcance |
| 2 | Repositorio público y proveedor de hosting | Jonny | La URL pública es la primera puerta del plan |
| 3 | Evento histórico de DONKI (identificador, fecha, enlace) | Angela + Felipe | Es la evidencia de "datos NASA reales" y hay que dejarla curada |
| 4 | Guion de los tres momentos y las tres preguntas finales | Angela | El texto va al código y no se escribe dos veces |
| 5 | Números del refugio y texto del medidor protección/masa | Samantha | Son los valores que el código multiplica: se congelan una vez |

Mientras no estén las cinco, se puede escribir el motor de reglas, pero no el texto del juego.

---

## Paso 1 · Esqueleto mínimo (30 min)

> **Estado: ya ejecutado en este repositorio.** Dependencias instaladas (Astro 7, React 19, Phaser 4.2, Tailwind 4.3, Vitest), estructura de carpetas creada y `npm run build` + `npm test` en verde. Los comandos de abajo quedan como referencia para reproducirlo desde cero o para otra máquina.

En la raíz del repositorio:

```bash
npm create astro@latest .
```

Si pregunta: plantilla **minimal**, **TypeScript strict**, sin instalar dependencias todavía. Luego:

```bash
npm install
npm install @astrojs/react react react-dom phaser
npm install tailwindcss @tailwindcss/vite
npm install -D vitest typescript @types/react @types/react-dom
npm install clsx tailwind-merge
```

En `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  vite: { plugins: [tailwindcss()] }
});
```

`src/styles/global.css` empieza con el import de Tailwind y los tokens del juego:

```css
@import "tailwindcss";

@theme {
  --color-space-900: oklch(0.18 0.02 265);
  --color-space-100: oklch(0.96 0.01 265);
  --color-alert: oklch(0.62 0.19 25);
  --color-ok: oklch(0.62 0.14 155);
}
```

Ese archivo se importa **una sola vez**, en `src/layouts/Base.astro`. No se crea `tailwind.config.js`: en Tailwind 4 la configuración vive en el CSS, en el bloque `@theme`.

Verificar que `tsconfig.json` tenga `"jsx": "react-jsx"` y `"jsxImportSource": "react"`. Después:

```bash
npm run dev    # http://localhost:4321
npm test       # vitest, sin configuración adicional por ahora
```

**Puerta:** la página responde en local y `npm test` corre (sin tests todavía).

> Aviso: el instalador puede ofrecer sobrescribir `README.md`. El del repositorio es el de la entrega, así que elegí **no** sobrescribir. Si el directorio no está vacío, el instalador pregunta si continuar: continuá, pero revisá que el README y el PDF sigan ahí.

### Distribución de carpetas

Árbol completo del proyecto, archivo por archivo. Lo marcado como *generado* lo crea Astro; el resto se crea a mano en el paso siguiente.

```text
mision-umbral/
├── .gitignore                  generado · agregar .env y .env.*
├── astro.config.mjs            generado · sumarle la integración React
├── package.json                generado · scripts dev / build / test
├── tsconfig.json               generado · verificar jsx react-jsx
├── README.md                   entrega · no sobrescribir
├── GUIA-DE-INICIO.md           este documento
├── Direccion del juego ....pdf  documento de dirección
│
├── data/                       datos externos, siempre con procedencia
│   ├── donki-event.json        evento histórico curado: id, fecha, enlace, fecha de consulta
│   └── fuentes.json            fichas: tema, fuente, enlace, tipo (NASA / Regla del juego)
│
├── public/                     servido tal cual, sin procesar
│   ├── favicon.svg             generado
│   └── audio/                  sonidos cortos, silenciables
│
└── src/
    ├── pages/                  una ruta por archivo
    │   ├── index.astro         portada: qué es, controles, botón jugar
    │   ├── juego.astro         el juego · monta GameRoot con client:only="react"
    │   └── fuentes.astro       créditos, fuentes, licencias y declaración de IA
    │
    ├── layouts/
    │   └── Base.astro          encabezado, pie, estilos comunes, orden de foco
    │
    ├── styles/
    │   └── global.css          @import "tailwindcss" + @theme con los tokens del juego
    │
    ├── lib/
    │   └── cn.ts               clsx + tailwind-merge, solo para clases condicionales
    │
    ├── content/                texto propio del juego, en español
    │   ├── guion.ts            los tres momentos y los diálogos del guía
    │   ├── preguntas.ts        las tres preguntas finales con su explicación
    │   └── ui.ts               etiquetas de estaciones y mensajes de emergencia
    │
    ├── game/
    │   ├── rules/              MOTOR PURO · no importa Phaser ni React
    │   │   ├── types.ts        tipos del estado y de las acciones
    │   │   ├── balance.ts      TODOS los números del juego, con su cita del §03–§04
    │   │   ├── engine.ts       createInitialState, dispatch, tick
    │   │   └── engine.test.ts  pruebas de reglas con Vitest
    │   ├── store.ts            estado único, suscripciones y pausa
    │   └── scene.ts            escena Phaser: dibuja y captura input
    │
    └── components/             islas React · acá y en las páginas se usa Tailwind
        ├── GameRoot.tsx        monta Phaser una sola vez y contiene el HUD
        ├── Hud.tsx             reservas, tiempo activo, tareas y avisos
        ├── ShelterWorkshop.tsx elegir dos de tres paquetes + medidor protección/masa
        ├── AvatarActivity.tsx  tres tarjetas: muestra, condición de vuelo, comparación
        └── Ending.tsx          cierre, tres preguntas y reinicio
```

Crear a mano la parte que Astro no genera:

```bash
mkdir -p data public/audio src/pages src/layouts src/styles src/content src/lib src/game/rules src/components

touch data/donki-event.json data/fuentes.json \
      src/styles/global.css \
      src/content/guion.ts src/content/preguntas.ts src/content/ui.ts \
      src/lib/cn.ts \
      src/game/rules/types.ts src/game/rules/balance.ts \
      src/game/rules/engine.ts src/game/rules/engine.test.ts \
      src/game/store.ts src/game/scene.ts \
      src/components/GameRoot.tsx src/components/Hud.tsx \
      src/components/ShelterWorkshop.tsx src/components/AvatarActivity.tsx \
      src/components/Ending.tsx \
      src/pages/juego.astro src/pages/fuentes.astro \
      src/layouts/Base.astro

touch public/audio/.gitkeep
```

### La regla que hace que estas carpetas funcionen

La flecha de dependencias apunta en una sola dirección. Nada importa hacia afuera:

```text
pages → components → store → rules
```

| Módulo | Puede importar | Nunca importa |
| --- | --- | --- |
| `game/rules/*` | `balance`, `types` | Phaser, React, `store`, DOM |
| `game/store.ts` | `rules` | Phaser, React, DOM |
| `game/scene.ts` | `store`, tipos de `rules`, `content/ui` | React |
| `components/*` | `store`, tipos de `rules`, `content`, `lib/cn` | Phaser |
| `lib/cn.ts` | `clsx`, `tailwind-merge` | nada del proyecto |
| `pages/*.astro` | componentes, `data` | lógica de reglas |

Si `rules` importa Phaser, los tests necesitan un navegador y se pierde la red de seguridad más barata del proyecto. Esa es toda la razón de tener una carpeta separada.

### Convenciones

- Componentes React: `PascalCase.tsx`, un componente por archivo.
- Módulos y utilidades: `camelCase.ts`.
- Pruebas al lado del módulo, con sufijo `.test.ts`.
- Datos: `kebab-case.json`.
- Rutas del sitio en español y minúsculas: `/juego`, `/fuentes`.

### Tailwind: dónde sí y dónde no

Tailwind estiliza **las páginas de Astro y las islas React**: portada, HUD, taller, cierre. No estiliza el canvas: la base lunar la dibuja Phaser, y ahí los colores viven en `scene.ts`.

Cuatro reglas que evitan el desorden:

1. **Nunca `var()` dentro de `className`.** Los tokens se declaran en `@theme` y se usan como clase semántica: `bg-space-900`, no `bg-[var(--color-space-900)]`.
2. **Nunca colores hexadecimales en `className`.** Si falta un color, se agrega como token en `global.css`.
3. **Valores dinámicos van en `style`**, no en clases armadas con strings: `style={{ width: `${pct}%` }}` para las barras de reservas.
4. **`cn()` solo cuando hay condiciones.** Una clase estática se escribe directo en `className`.

En accesibilidad, Tailwind no resuelve nada por sí solo: cada control necesita `focus-visible:ring-2`, y ningún aviso puede depender solo del color (`text-alert` acompañado siempre de texto o ícono).

---

## Paso 2 · Las reglas primero, con tests (2 h)

Escribir el test, verlo fallar, implementar. En este orden:

1. Tres reservas de 0 a 100 que comienzan en 60; el agua inicial baja 3 por cada unidad de masa del refugio.
2. Estación con batería: +2 por cada 10 s activos. Sin batería: −3 por cada 10 s.
3. Cuatro baterías, seis estaciones, una batería por estación; las baterías nunca se duplican.
4. Invernadero: 30 s con energía dan una cosecha y consumen 2 de agua por cada 10 s.
5. Laboratorio AVATAR: exige la interacción **y** 20 s de energía.
6. Comunicaciones: exigen AVATAR terminado y 20 s de energía.
7. Alerta solar a los 90 s, 20 s para entrar al refugio, tiempo de refugio según protección (3 → 35 s, 4 → 25 s, 5 → 20 s); durante la alerta no se mueven baterías.
8. Avería a los 180 s: una batería conectada falla 45 s, elegida de forma reproducible.
9. Fin de partida: 5 minutos activos; se gana solo con las tres tareas y las dos emergencias superadas, con reservas sobre cero. Una reserva en cero termina la partida y explica la causa.

Dos detalles de implementación que ahorran horas después:

- **El tiempo entra como delta explícito.** `tick(estado, deltaMs)`. Nada de `setInterval`: así pausar es no llamar a `tick`, y una pestaña oculta no acumula tiempo.
- **Descartar saltos grandes de tiempo.** Si el delta supera ~250 ms, recortarlo. Evita que el juego se vacíe solo después de una pestaña oculta o un tirón.

**Puerta:** los tests pasan y existe un test que completa una partida ganable de punta a punta.

---

## Paso 3 · El estado único (45 min)

Un módulo que guarda el estado, recibe acciones y notifica:

- React se suscribe y se actualiza como máximo cada 100 ms.
- Phaser lee el estado en cada frame y solo dibuja.
- Nadie más calcula reservas. Nunca.

**Puerta:** la interfaz muestra las tres reservas cambiando en vivo, y las reservas las calcula el motor de reglas.

---

## Paso 4 · La escena (2 a 3 h)

Mínimo viable: una habitación, el astronauta se mueve con flechas o WASD, `E` recoge y coloca, una estación con una batería que modifica una reserva.

Consejos concretos:

- Generar las formas con `this.add.rectangle`, `this.add.circle` y `this.add.text`. Sin archivos de arte todavía: el arte no bloquea la lógica, la lógica sí bloquea el arte.
- Movimiento por píxeles con el delta del `update(time, delta)`, con límites de pantalla a mano. No hace falta motor de física.
- Cada estación dibuja su etiqueta de texto. Los avisos no deben depender del color.

**Puerta:** una persona nueva abre la URL pública y logra mover una batería y ver el efecto, sin ayuda.

---

## Paso 5 · Publicar antes de ampliar (20 min)

Antes de sumar estaciones: conectar el repositorio a Vercel o Netlify y obtener la URL pública. Publicar al final es el error más caro del evento.

**Puerta:** la URL pública se actualiza con cada `push`.

---

## Calendario de las primeras horas

| Hora | Jonny | Creatividad |
| --- | --- | --- |
| 0:00–1:00 | Decisiones 1 y 2, esqueleto del proyecto | Decisiones 3, 4 y 5 |
| 1:00–3:00 | Motor de reglas con tests | Guion de los tres momentos, mapa de la base |
| 3:00–4:00 | Estado único, HUD con las tres reservas | Textos de estaciones y emergencias |
| 4:00–6:00 | Escena: movimiento, `E`, una batería | Revisión de diversión y consecuencias |

Si el equipo es más grande, la creatividad alimenta textos y decisiones mientras el desarrollo no se detiene. Nunca al revés.

---

## Cinco errores que hunden este tipo de proyecto

1. **Empezar por la escena y las animaciones.** Es lo más divertido y lo menos importante. Sin reglas probadas no hay juego.
2. **Calcular las reservas en dos lugares.** Si Phaser y React calculan por separado, la partida se desincroniza y no hay tiempo de encontrar por qué.
3. **Usar `setInterval` para los temporizadores.** La pausa, la pestaña oculta y los premios duplicados al volver se rompen de a uno.
4. **Dejar el deploy para el final.** El enlace es parte de la entrega y falla cuando no hay margen.
5. **Escribir texto científico sin la fuente curada.** Se reescribe dos veces y se arriesga afirmar algo que la fuente no dice.

## Qué no construir en las primeras cuatro horas

Lanzamiento animado · tarjetas de AVATAR · las dos emergencias · taller de refugio con interfaz · guardado local · ilustraciones propias · video de demostración.

Todo eso llega después de la puerta del Paso 4. El lanzamiento puede ser una transición de texto: el diseño ya dice que es una animación guiada, no un simulador.

---

## Nota sobre versiones

El proyecto instala **Phaser 4.2**, **Astro 7** y **Tailwind 4.3**. Casi todos los tutoriales que hay circulando son de Phaser 3 y de Tailwind 3:

- En Phaser, la superficie que se usa acá (`this.add.rectangle`, `this.input.keyboard.addKey`, `Phaser.Input.Keyboard.JustDown`, `update(time, delta)`) sigue vigente, pero no conviene copiar internals de renderizado de ejemplos viejos.
- En Tailwind, **no hay `tailwind.config.js`** ni directivas `@tailwind base/components/utilities`. Se usa `@import "tailwindcss"` y `@theme`. Si un ejemplo pide `@astrojs/tailwind` o un archivo de configuración, es de la versión 3.

Si quedó un scaffold a medias de una prueba anterior, conviene arrancar limpio:

```bash
rm -rf node_modules src package.json package-lock.json .astro dist
```

Dejar en el repositorio: el PDF de dirección y el `README.md`.
