/**
 * Definiciones de tipos TypeScript para @landra_sistemas/fql-parser
 * 
 * Proporciona soporte completo de tipos para JavaScript puro y TypeScript,
 * habilitando autocompletado y verificación de tipos en IDEs.
 */

/**
 * Opciones de configuración para FQLParser
 */
export interface FQLParserOptions {
  /**
   * Mapeo de aliases de columnas
   * Soporta `{{key}}` como placeholder para el nombre original
   */
  aliases?: Record<string, string>;

  /**
   * Habilita búsquedas globales (+término, -término)
   * @default false
   */
  allowGlobalSearch?: boolean;

  /**
   * Usa ILIKE en lugar de LIKE (solo PostgreSQL)
   * @default false
   */
  caseInsensitive?: boolean;

  /**
   * Longitud máxima del string de entrada
   * @default 10000
   */
  maxInputLength?: number;

  /**
   * Longitud máxima de un valor individual
   * @default 4000
   */
  maxValueLength?: number;

  /**
   * Máximo de iteraciones de la expresión regular
   * @default 20000
   */
  maxRegexIterations?: number;

  /**
   * Timeout máximo para parsing en ms
   * @default 200
   */
  parseTimeoutMs?: number;

  /**
   * Profundidad máxima de anidamiento de paréntesis
   * @default 10
   */
  maxDepth?: number;

  /**
   * Máximo número de grupos de paréntesis permitidos
   * @default 100
   */
  maxParenthesesGroups?: number;
}

/**
 * Condición individual parseada por FQLParser
 */
export interface FQLCondition {
  /**
   * Nombre de columna (vacío para búsquedas globales)
   */
  key?: string;

  /**
   * Operador SQL: LIKE, NOT LIKE, >, <, BETWEEN, etc.
   */
  operator: string;

  /**
   * Valor a comparar (puede ser array para IN/BETWEEN)
   */
  value: string | string[];

  /**
   * Operador lógico para conectar con siguiente condición
   */
  logic?: 'AND' | 'OR';
}

/**
 * Resultado de parsing SQL con query y bindings
 */
export interface SQLParseResult {
  /**
   * Query SQL generada con placeholders (?)
   */
  query: string;

  /**
   * Array de valores para los placeholders
   */
  bindings: any[];
}

/**
 * Parser de Fast Query Language (FQL)
 * 
 * Convierte strings FQL a estructuras de datos procesables.
 * Ejemplos:
 * - Simple: "name:john"
 * - Operadores: "age>:25 AND status:active"
 * - Rangos: "price:[100 TO 500]"
 * - Múltiples: "tags:a,b,c"
 * - Grupos: "(name:john OR name:jane) AND age>:30"
 * - Global (si habilitado): "+importante -spam"
 */
export class FQLParser {
  LIKE: string;
  NOT_LIKE: string;

  constructor(options?: FQLParserOptions);

  /**
   * Parsea un string FQL
   * @param str - String FQL a parsear
   * @returns Array de condiciones y/o subgrupos
   * @throws Error si excede límites de profundidad, longitud o timeout
   */
  parse(str: string): Array<FQLCondition | FQLCondition[]>;

  /**
   * Extrae grupos de paréntesis (interno)
   * @private
   */
  splitParentheses(str: string): string[];

  /**
   * Aplica regex para extraer parámetros (interno)
   * @private
   */
  parseQS(str: string, subgroups: Array<FQLCondition | FQLCondition[]>): Array<FQLCondition | FQLCondition[]>;

  /**
   * Aplica aliases de columnas
   * @param key - Nombre original de columna
   * @returns Nombre con alias aplicado
   */
  checkAliases(key: string): string;

  /**
   * Sanitiza valor para LIKE
   * @param value - Valor a sanitizar
   * @returns Valor sanitizado
   * @throws Error si excede maxValueLength
   */
  parseValue(value: string): string;

  /**
   * Sanitiza valor para tsquery PostgreSQL
   * @param value - Valor a sanitizar
   * @returns Valor sanitizado para texto completo
   * @throws Error si excede maxValueLength
   */
  parseValueForPlainQuery(value: string): string;
}

/**
 * Opciones de configuración para SQLParser
 */
export interface SQLParserOptions {
  /**
   * Nombre de tabla (opcional para queries genéricas)
   */
  table?: string;

  /**
   * Dialect SQL: 'pg', 'postgres', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle'
   * @default 'pg'
   */
  dialect?: 'pg' | 'postgres' | 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql' | 'oracle';
}

/**
 * Convertidor de condiciones FQL a SQL
 * 
 * Base para parsers específicos de cada dialect.
 * Genera queries paramétrizadas (?) seguras contra inyección SQL.
 */
export class SQLParser {
  table?: string;
  dialect: string;
  allowedLogicOperators: string[];

  constructor(table?: string, dialect?: string);

  /**
   * Parsea array de condiciones a SQL
   * @param object - Condiciones parseadas por FQLParser
   * @returns Query SQL y bindings
   * @throws InvalidQueryError si estructura no es válida
   */
  parse(object: Array<FQLCondition | FQLCondition[]>): SQLParseResult;

  /**
   * Convierte una condición individual
   * @param condition - Condición a convertir
   * @returns Query y bindings para esta condición
   * @throws Varios errores de validación según tipo de error
   */
  convertCondition(condition: FQLCondition): SQLParseResult;

  /**
   * Sanitiza identificador SQL
   * @param identifier - Nombre de tabla/columna
   * @returns Identificador citado ("id")
   * @throws InvalidIdentifierError si no es válido
   */
  sanitizeIdentifier(identifier: string): string;

  /**
   * Valida operador lógico
   * @param logic - Operador a validar
   * @returns AND u OR validado
   * @throws InvalidLogicOperatorError si no es válido
   */
  sanitizeLogicOperator(logic?: string): string;
}

/**
 * Base para errores FQL Parser
 */
export class FQLError extends Error {
  code: string;
  constructor(message: string, code: string);
}

/**
 * Error de dialect no soportado
 */
export class UnsupportedDialectError extends FQLError {
  dialect: string;
  feature: string;
  constructor(dialect: string, feature: string);
}

/**
 * Error en estructura de query
 */
export class InvalidQueryError extends FQLError {
  constructor(message: string);
}

/**
 * Error en identificador SQL
 */
export class InvalidIdentifierError extends FQLError {
  identifier: string;
  constructor(identifier: string);
}

/**
 * Error en operador lógico
 */
export class InvalidLogicOperatorError extends FQLError {
  operator: string;
  constructor(operator: string);
}

/**
 * Integración con Knex.js
 * 
 * Extiende SQLParser para generar queries compatibles con
 * el query builder Knex.js.
 */
export class KnexParser extends SQLParser {
  /**
   * Convierte condiciones a query Knex usando whereRaw
   * @param builder - Builder de Knex.js
   * @param object - Condiciones parseadas
   * @returns Builder de Knex para encadenamiento
   * 
   * @example
   * ```javascript
   * const knex = require('knex')({ client: 'pg' });
   * const parser = new KnexParser('users', 'pg');
   * const fqlParser = new FQLParser();
   * 
   * const query = knex.select('*').from('users');
   * const conditions = fqlParser.parse('name:john AND age>:25');
   * 
   * parser.toKnex(query, conditions).toSQL();
   * // { sql: 'select * from "users" where "name" LIKE ? and "age" > ?',
   * //   bindings: ['john', 25] }
   * ```
   */
  toKnex(builder: any, object: Array<FQLCondition | FQLCondition[]>): any;
}

export default FQLParser;
