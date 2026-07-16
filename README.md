# Sistema de trabajo: juego de navegador con Claude Code

## Instalación

Copia el contenido de esta carpeta a la raíz de tu proyecto:

```
tu-proyecto/
├── CLAUDE.md                  ← reglas que Claude Code lee siempre
├── .claude/
│   ├── agents/                ← 4 agentes (revisores, no decisores)
│   └── commands/               ← 3 comandos slash
└── docs/
    ├── GDD.md
    ├── SDD.md
    ├── BACKLOG.md
    └── specs/
        └── PLANTILLA-SPEC.md
```

GDD.md y SDD.md ya vienen rellenos para este proyecto (SW Destiny PVE).

## Filosofía

- Los agentes REVISAN y VERIFICAN. Nunca deciden diseño ni arquitectura.
- Todos los agentes son de solo lectura: no pueden tocar tu código.
- El único que implementa es la sesión principal de Claude Code, siguiendo /implementar.
- Una spec no está terminada hasta que TÚ la juegas. Build verde ≠ funciona jugado.

## Flujo por feature

1. `/nueva-spec <idea>`      → entrevista + crea la spec
2. `/implementar <spec>`     → revisa spec, planifica, implementa, revisa código, genera guion QA
3. Juegas el guion            → marcas la spec como completada (o reportas fallos)
4. Cada 2-3 specs: `/auditoria` → detecta deriva y scope creep acumulado

## Los 4 agentes

| Agente          | Cuándo                        | Qué hace                                      |
|-----------------|-------------------------------|-----------------------------------------------|
| revisor-specs   | Antes de implementar          | Audita la spec: completa, coherente, pequeña  |
| revisor-codigo  | Después de implementar        | Código vs spec, punto por punto + excesos     |
| qa-manual       | Antes de que pruebes          | Genera tu guion de playtest paso a paso       |
| guardian-gdd    | Cada 2-3 specs                | ¿El código sigue siendo el juego del GDD?     |

## Cómo empezar (primera vez)

1. Instala Claude Code (ver https://docs.claude.com para instrucciones actualizadas).
2. Crea la carpeta de tu proyecto y pega dentro el contenido de este kit.
3. Abre una terminal en esa carpeta y ejecuta Claude Code.
4. Escribe: `/nueva-spec importar mazos y modelo de personajes/dados` (o la idea que quieras
   trabajar primero, según el roadmap de docs/SDD.md).
