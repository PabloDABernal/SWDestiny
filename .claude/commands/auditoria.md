---
description: Auditoría periódica de coherencia entre GDD, specs y código
---

Lanza el agente `guardian-gdd` para auditar el estado del proyecto.

Cuando devuelva su informe:

1. Preséntalo al usuario tal cual.
2. Si hay features en código sin respaldo en el GDD, pregunta al usuario UNA por una: ¿la incorporamos al GDD o la quitamos del código? No decidas por él.
3. Si hay documentación desactualizada, propón las ediciones concretas y aplícalas solo tras confirmación.
4. Actualiza el estado de las specs en `docs/specs/` si procede.
