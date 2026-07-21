// Errores de importación con motivo distinguible (criterio de SPEC-001: todo mensaje
// debe indicar el motivo, no un error genérico).

export type ImportErrorReason =
  | 'invalid-json' // JSON ilegible o sin la estructura de export (sin `slots`)
  | 'invalid-text' // "text file" de ARH DB ilegible (set desconocido, línea malformada, sin cartas)
  | 'no-characters' // el mazo no contiene ningún personaje
  | 'card-not-found' // un código de carta no existe en la API
  | 'network'; // fallo de red / CORS al resolver cartas

export class ImportError extends Error {
  reason: ImportErrorReason;
  /** Código de carta implicado, cuando aplica (card-not-found). */
  code?: string;

  constructor(reason: ImportErrorReason, message: string, code?: string) {
    super(message);
    this.name = 'ImportError';
    this.reason = reason;
    this.code = code;
  }
}
