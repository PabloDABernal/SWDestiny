// Modelo interno mínimo de SPEC-001. `points` se omite a propósito: ningún criterio
// de aceptación lo verifica en v1 (ver docs/specs/001-importar-mazos-modelo.md).

export interface Die {
  /** Las 6 caras tal cual las da ARH DB, p. ej. ["2MD", "2Sh", "1R", "Sp", "Sp", "-"]. */
  sides: string[];
}

export interface Character {
  /** Código de carta de ARH DB del que salió esta ficha. */
  code: string;
  name: string;
  health: number;
  isUnique: boolean;
  /** true si esta ficha única se juega elite (2 dados). */
  isElite: boolean;
  dice: Die[];
}

/** Forma mínima de la carta que devuelve /api/public/card/{code} que nos importa en v1. */
export interface ArhCard {
  code: string;
  name: string;
  type_code: string;
  health: number;
  is_unique: boolean;
  sides: string[];
}
