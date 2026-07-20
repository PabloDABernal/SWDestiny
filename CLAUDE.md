# Reglas del proyecto

## Metodología (innegociable)

1. **Documentos antes que código.** Ningún cambio de gameplay se implementa si no está reflejado primero en `docs/GDD.md`. Ningún cambio de arquitectura se implementa si no está en `docs/SDD.md`. Si el usuario pide algo que contradice el GDD, PARAR y preguntar si quiere actualizar el GDD primero.

2. **Una spec por feature.** Toda implementación parte de una spec en `docs/specs/`. Si no existe spec para lo que se pide, proponer crearla primero (usar `/nueva-spec`). No implementar "de palabra" nada que toque más de un archivo.

3. **Build verde ≠ funciona jugado.** Que compile y pasen los tests NO significa que la feature esté terminada. Al acabar cualquier implementación, SIEMPRE terminar el mensaje con la sección "🎮 Para probar a mano:" listando los pasos concretos que el usuario debe jugar para verificar. Una spec solo se marca como completada cuando el usuario confirma que la ha jugado.

4. **Rebanadas verticales pequeñas, SIN subdividir un mismo número.** Cada sesión de implementación aborda UNA spec. Un spec lleva **todo lo que quepa** de su feature. Lo que no quepa (o requiera una decisión aparte) va al **siguiente spec numerado**, NO a un sufijo `a/b/c` del mismo número. Nada de `008a/008b/008c`: eso lía. Si hace falta reordenar, se **renumera**. Si una spec parece pasarse de ~300 líneas, avisar y valorar mover parte al siguiente número.

5. **Las decisiones son del usuario.** Los agentes y Claude no deciden diseño de juego ni stack tecnológico. Si durante la implementación surge una decisión de diseño no cubierta por el GDD/spec, PARAR y preguntar. No rellenar huecos de diseño con suposiciones.

## Stack

- React 19 + Vite + Zustand
- Juego de navegador, sin backend en v1
- Ver docs/SDD.md para detalle de arquitectura

## Anti scope-creep

Las ideas nuevas que surjan durante la implementación NO se implementan sobre la marcha: se anotan en `docs/BACKLOG.md` con una línea y se sigue con la spec actual. Recordárselo al usuario si él mismo propone desviarse a mitad de spec.

## Flujo de trabajo estándar

1. `/nueva-spec` → crear la spec de la feature
2. Agente `revisor-specs` → validar la spec antes de tocar código
3. Implementar la spec (sesión principal)
4. Agente `revisor-codigo` → verificar que el código cumple la spec
5. Agente `guardian-gdd` → verificar que no hay scope creep ni contradicciones con el GDD
6. El usuario juega la build → solo entonces la spec pasa a "completada"
