# Misión Umbral: Academia de Astronautas

Entrenador de misión web para niños y niñas de 7 a 12 años. El jugador prepara una misión, aprende con AVATAR y mantiene una base lunar con decisiones de recursos limitados.

## Vista previa de la portada

[Abrir Misión Umbral en el navegador](https://mision-umbral-academia.jfelipevv-2005.chatgpt.site)

Enlace público para revisar la portada desde otros equipos, sin instalar el proyecto. Publicado el 14 de noviembre de 2026 desde la rama `felipe/escena-base`. La portada se adapta a la pantalla; **el juego todavía está en construcción** y «Juega ya» abre su pantalla básica. Esta vista previa es una copia publicada: los cambios futuros en GitHub requieren volver a publicarla.

**NASA Space Apps Challenge** · Reto: *Build a Junior Astronaut Mission Trainer*
Documento de dirección: [`Direccion del juego - Mision Umbral - Revision Jonny.pdf`](./Direccion%20del%20juego%20-%20Mision%20Umbral%20-%20Revision%20Jonny.pdf)

> **PENDIENTE antes de publicar:** confirmar en la plataforma oficial el nombre del equipo, la categoría, el desafío seleccionado, la fecha límite de entrega y el formato del video. No afirmar aprobación, afiliación ni respaldo de NASA.

---

## La idea en una frase

> "Si uso los recursos aquí, me faltan allá: observar datos y planear ayuda a proteger a la tripulación."

Una partida dura de 8 a 12 minutos, se juega en el navegador de un computador, sin registro, en español.

## Qué se aprende

- Los recursos son finitos: cada estación solo funciona si tiene una batería, y no hay baterías para todo al mismo tiempo.
- Prepararse antes del peligro cambia lo que se puede hacer durante el peligro.
- La ciencia espacial se investiga comparando muestras y controles, no adivinando.

## Los tres momentos

1. **Preparar y despegar (≈2 min).** El astronauta guía presenta el entrenamiento. El jugador elige dos de tres paquetes de refugio: más protección significa más masa y menos capacidad de carga. Después, una secuencia de despegue breve y saltable.
2. **Viajar, investigar y operar la base (5 a 8 min).** Observación de la Luna, actividad AVATAR y una base lunar con seis estaciones y cuatro baterías. Dos emergencias obligan a reorganizar el trabajo: alerta de partículas solares y avería de una batería.
3. **Regresar y comprender (1 a 2 min).** El guía comenta las decisiones de esa partida. Tres preguntas breves y opción de repetir con otra estrategia.

## Controles

| Acción | Tecla |
| --- | --- |
| Moverse | Flechas o `W` `A` `S` `D` |
| Recoger, colocar, interactuar | `E` |
| Elegir en el taller de refugio | Ratón |
| Pausa y ayuda | Botones siempre visibles |

La partida completa se puede jugar solo con teclado. Los avisos no dependen únicamente del color y el audio se puede silenciar.

## Ciencia y datos NASA

Regla editorial del proyecto: cada ficha se rotula como **Fuente NASA** (dato o explicación respaldada) o **Regla del juego** (números y efectos inventados con fin didáctico). El evento histórico de DONKI nunca se presenta como una alerta actual.

| Tema | Fuente | Estado |
| --- | --- | --- |
| AVATAR (Artemis II) | NASA Science · Artemis II AVATAR | PENDIENTE: ficha verificada |
| Nave Orion y refugios | NASA · Meet NASA's Orion Spacecraft | PENDIENTE: ficha verificada |
| Clima espacial | NASA CCMC · DONKI | PENDIENTE: evento histórico curado |
| Oxígeno en Marte (no usado en la Luna) | NASA · MOXIE | Referencia de control |

Cada evento curado de DONKI se guarda como JSON con **identificador, fecha, enlace y fecha de consulta**, más una copia local para jugar sin conexión.

**Correcciones científicas ya aplicadas al diseño:**

- AVATAR estudia modelos de tejido con células; no es un implante ni un escáner corporal.
- Un refugio reduce la exposición a radiación; no la elimina ni hace visible la radiación.
- MOXIE obtiene oxígeno del dióxido de carbono marciano, no de hielo. No se usa ese nombre para el módulo lunar de aire.
- La base y sus cultivos son una simulación: no se atribuyen superpoderes a los alimentos ni noches lunares fijas sin fuente.

## Cómo ejecutar el proyecto

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:4321
npm test         # pruebas de las reglas de juego (Vitest)
npm run build    # compilación estática a dist/
npm run preview  # sirve la compilación para revisarla
```

Stack instalado: Astro 7, React 19, Phaser 4, Tailwind CSS 4 y Vitest 5.

**PENDIENTE:** agregar la URL jugable publicada cuando esté desplegada.

### Arquitectura por capas

| Capa | Responsabilidad |
| --- | --- |
| Astro | Portada, instrucciones, créditos, fuentes y página del juego |
| React | Menús, indicadores, diálogos, resultados y accesibilidad de interfaz |
| Tailwind CSS 4 | Estilos de las páginas y de las islas React. La base lunar en canvas no usa Tailwind |
| Phaser 2D | Escena de la base, astronauta, objetos y controles |
| Motor de reglas | Único dueño de las reservas, las tareas y los eventos. Sin dependencias de Phaser ni de React |

Pausar congela la lógica y los temporizadores; una pestaña oculta también. El detalle de carpetas y la regla de dependencias están en [Estructura del repositorio](#estructura-del-repositorio).

## Cómo publicar este repositorio

El repositorio ya está inicializado en Git, sin commits. Para subirlo:

```bash
# 1. Revisar qué se va a subir: las dependencias quedan fuera por .gitignore
git add -A
git status

# 2. Primer commit
git commit -m "chore: estructura inicial de Misión Umbral"

# 3. Crear el repositorio en GitHub y conectarlo (URL propia)
git branch -M main
git remote add origin git@github.com:USUARIO/mision-umbral.git
git push -u origin main
```

El `.gitignore` ya está en el repositorio con este contenido:

```gitignore
node_modules/
dist/
.astro/
.env
.env.*
!.env.example
.DS_Store
*.log
```

Antes de cada push, verificar que no se suban claves de API. La clave de NASA (`api.nasa.gov`) va en `.env` local y nunca en el repositorio.

## Estructura del repositorio

```text
mision-umbral/
├── README.md                   Este archivo: qué es, cómo correrlo, créditos
├── GUIA-DE-INICIO.md           Guía operativa: por dónde empezar y en qué orden
├── Direccion del juego ....pdf  Documento de dirección y diseño
│
├── data/                       Datos externos, siempre con procedencia
│   ├── donki-event.json        Evento histórico de DONKI curado (PENDIENTE)
│   └── fuentes.json            Fichas: tema, organización, enlace, tipo
│
├── public/                     Archivos servidos tal cual
│   └── audio/                  Sonidos cortos, silenciables
│
└── src/
    ├── pages/                  Una ruta por archivo
    │   ├── index.astro         Portada: qué es el juego y controles
    │   ├── juego.astro         El juego · monta la isla React
    │   └── fuentes.astro       Créditos, fuentes, licencias y declaración de IA
    │
    ├── layouts/
    │   └── Base.astro          Encabezado, pie, estilos comunes y orden de foco
    │
    ├── styles/
    │   └── global.css          Tailwind, tokens de color y foco visible
    │
    ├── content/                Textos del juego, en español
    │   ├── guion.ts            Los tres momentos y los diálogos del guía
    │   ├── preguntas.ts        Las tres preguntas finales con su explicación
    │   └── ui.ts               Etiquetas de estaciones y mensajes de emergencia
    │
    ├── lib/
    │   └── cn.ts               Utilidad para clases condicionales de Tailwind
    │
    ├── game/
    │   ├── rules/              Motor de reglas puro: sin Phaser, sin React
    │   │   ├── types.ts        Tipos del estado y de las acciones
    │   │   ├── balance.ts      Todos los números del juego, en un solo lugar
    │   │   ├── engine.ts       Estado inicial, acciones y avance del tiempo
    │   │   └── engine.test.ts  Pruebas de las reglas
    │   ├── store.ts            Estado único, suscripciones y pausa
    │   └── scene.ts            Escena Phaser: dibuja y captura el teclado
    │
    └── components/             Islas React
        ├── GameRoot.tsx        Monta Phaser una vez y contiene el HUD
        ├── Hud.tsx             Reservas, tiempo activo, tareas y avisos
        ├── ShelterWorkshop.tsx Elegir dos de tres paquetes con su costo de masa
        ├── AvatarActivity.tsx  Actividad AVATAR de tres tarjetas
        └── Ending.tsx          Cierre, tres preguntas y reinicio
```

### Regla de arquitectura

Hay un solo estado de partida y un solo lugar que calcula reservas, tareas y eventos: `src/game/rules/`. Las dependencias apuntan en una sola dirección:

```text
pages → components → store → rules
```

`rules` no importa Phaser ni React. Por eso sus pruebas corren en milisegundos sin navegador. Si la lógica de recursos viviera dentro de la escena, cada cambio visual rompería el balance y no habría forma barata de detectarlo.

Phaser dibuja y captura el teclado; React presenta el estado y los diálogos; ninguno de los dos calcula nada por su cuenta.

### Estado actual

| Parte | Estado |
| --- | --- |
| Estructura del proyecto, Tailwind y compilación | Lista |
| Motor de reglas (reservas, baterías, tareas, emergencias, fin de partida) | Implementado y cubierto por tests |
| Estado único compartido entre escena e interfaz | Implementado |
| Escena de la base, interfaz, textos y datos NASA curados | En construcción |

El siguiente paso está en [`GUIA-DE-INICIO.md`](./GUIA-DE-INICIO.md): Paso 4, la escena.

## Equipo

| Integrante | Rol |
| --- | --- |
| Angela Lopez | Creatividad: guion, diálogos AVATAR, preguntas finales |
| Samantha Urbano | Creatividad: mapa de la base, apariencia, mensajes de emergencia |
| Jonny Agudelo | Desarrollo: arquitectura, escena, interfaz, pruebas y publicación |
| Felipe | Desarrollo: textos, recursos, pruebas de recorrido, registro de errores |

## Declaración de uso de IA

**PENDIENTE: completar al cerrar la entrega.** El documento de dirección fue elaborado con asistencia de IA. El equipo debe listar aquí las herramientas efectivamente usadas para construir el juego y qué parte del trabajo asistió cada una. No afirmar respaldo, aprobación ni afiliación de NASA.

La implementación de la portada adaptable y su ilustración vectorial espacial original se realizaron con asistencia de IA en Codex, a partir del boceto compartido por Felipe.

### Condiciones gráficas vigentes

La primera entrega usa pixel art cartoon espacial sencillo: contornos oscuros, píxeles visibles, traje dorado, fondo azul grisáceo y acentos cian, con paleta corta y sombras por bloques. La portada usa PNG nativos transparentes con el doble de resolución de dibujo, conservando su tamaño visible y sin suavizado. El cohete rojo conserva la perspectiva hacia el planeta y se orienta sobre una cuadrícula de píxeles. Se parte de imágenes estáticas; caminar, partículas y otros ciclos son opcionales. No se exige rigging, Spine ni Live2D. Los recursos de la base y la escena jugable continúan pendientes. Ver [condiciones de arte y animación](docs/Condiciones%20de%20arte%20y%20animacion%20-%20Mision%20Umbral.md).

## Licencia y créditos

**PENDIENTE:** elegir licencia para el código y registrar la procedencia de todo recurso gráfico o sonoro de terceros (nombre, autor, licencia y enlace).

## Aviso

Proyecto educativo independiente para el NASA Space Apps Challenge. No es un producto de NASA ni está respaldado por NASA. Las cifras, tiempos y efectos del juego son reglas de diseño didáctico, no mediciones médicas, eléctricas ni de ingeniería.

Los editables vectoriales y los PNG de la portada se reproducen con `node scripts/create-home-pixel-art.mjs`. Los sprites usan bases de 64 × 80 (guía), 128 × 80 (cohete) y 64 × 64 (planeta); el fondo es de 768 × 432. La ilustración y el código de generación se prepararon con asistencia de IA, sin reutilizar elementos gráficos de las referencias.

La interfaz del home usa **Pixelify Sans**, de The Pixelify Sans Project Authors, distribuida bajo [SIL Open Font License 1.1](public/fonts/OFL-Pixelify-Sans.txt). Copia local obtenida de [Google Fonts](https://github.com/google/fonts/tree/main/ofl/pixelifysans); carga independiente de servicios externos. El título, diálogo y controles usan esta fuente; la franja institucional conserva tipografía convencional. Los marcos pixelados reutilizables están en src/styles/pixel-ui.css. Adaptación verificada para el home; la interfaz jugable sigue pendiente.
