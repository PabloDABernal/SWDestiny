---
description: Implementar una spec siguiendo el flujo completo con revisiones
---

El usuario quiere implementar la spec: $ARGUMENTS

Flujo obligatorio:

1. Lee la spec completa, el `docs/SDD.md` y las partes relevantes del código.
2. Lanza el agente `revisor-specs` sobre esta spec. Si el veredicto es BLOQUEADA o NECESITA CAMBIOS con bloqueantes, PARA y resuelve eso con el usuario antes de escribir código.
3. Presenta al usuario un plan de implementación breve (archivos a tocar, en qué orden) y espera su OK.
4. Implementa. Si a mitad surge una decisión de diseño no cubierta por la spec, PARA y pregunta. Si surge una idea de mejora, anótala en `docs/BACKLOG.md` y sigue.
5. Ejecuta build y tests si existen.
6. Lanza el agente `revisor-codigo` sobre lo implementado. Corrige los incumplimientos que señale.
7. Lanza el agente `qa-manual` para generar el guion de prueba.
8. Termina SIEMPRE con el guion de prueba manual. Recuerda al usuario que la spec no está completada hasta que él la juegue y lo confirme. Build verde ≠ funciona jugado.
