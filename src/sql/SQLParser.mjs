import {
    InvalidIdentifierError,
    InvalidLogicOperatorError,
    InvalidQueryError,
    UnsupportedDialectError
} from "../errors/FQLErrors.mjs";

export default class SQLParser {

    /**
     * @typedef {Object} SQLCondition
     * @property {string} [key]
     * @property {string} operator
     * @property {string} value
     * @property {('AND'|'OR')} [logic]
     */

    /**
     * @typedef {Object} SQLParseResult
     * @property {string} query
     * @property {Array<*>} bindings
     */

    /**
     * Crea una nueva instancia de SQLParser
     * 
     * Base para parsers específicos de cada dialect SQL.
     * Valida el nombre de tabla (si se proporciona) y el dialect soportado.
     * 
     * @param {string} [table] - Nombre de tabla (opcional para queries genéricas)
     * @param {string} [dialect="pg"] - Dialect SQL: 'pg', 'mysql', 'sqlite', 'mssql', 'oracle'
     * @throws {TypeError} Si table no es string no-vacío (si se proporciona) o dialect no es soportado
     * 
     * @example
     * const parser = new SQLParser('users', 'pg');
     * const result = parser.parse(conditions);
     * // { query: '"name" LIKE ? AND "age" > ? AND ', bindings: ['john', 25] }
     */
    constructor(table, dialect = "pg") {
        if (table !== undefined && (typeof table !== "string" || !table.trim())) {
            throw new TypeError("table must be a non-empty string when provided");
        }
        if (typeof dialect !== "string" || !dialect.trim()) {
            throw new TypeError("dialect must be a non-empty string");
        }

        const supportedDialects = ["pg", "postgres", "postgresql", "mysql", "mariadb", "sqlite", "mssql", "oracle"];
        if (!supportedDialects.includes(dialect.toLowerCase())) {
            throw new TypeError(`Unsupported dialect: ${dialect}`);
        }

        this.table = table;
        this.dialect = dialect.toLowerCase() === "postgresql" || dialect.toLowerCase() === "postgres" ? "pg" : dialect.toLowerCase();
        this.allowedLogicOperators = ["AND", "OR"];
    }

    /**
     * Sanitiza un identificador SQL (nombre de tabla o columna)
     * 
     * Valida que el identificador siga la convención de nombres SQL:
     * - Comienza con letra o guión bajo
     * - Contiene solo letras, números, guiones bajos
     * - Soporta notación con puntos para identificadores calificados (schema.table)
     * 
     * Rodea cada parte con comillas dobles para evitar conflictos con palabras reservadas.
     * 
     * @param {string} identifier - Identificador a sanitizar (ej: "users.id" o "user_name")
     * @returns {string} Identificador citado: `"schema"."table"` o `"column"`
     * @throws {InvalidIdentifierError} Si el identificador no es válido
     * 
     * @example
     * parser.sanitizeIdentifier('users'); // '"users"'
     * parser.sanitizeIdentifier('schema.users'); // '"schema"."users"'
     */
    sanitizeIdentifier(identifier) {
        if (typeof identifier !== "string" || !identifier.trim()) {
            throw new InvalidIdentifierError(identifier);
        }

        const parts = identifier.split(".");
        const identifierRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;

        for (const part of parts) {
            if (!identifierRegex.test(part)) {
                throw new InvalidIdentifierError(identifier);
            }
        }

        return parts.map((part) => `"${part}"`).join(".");
    }

    /**
     * Valida y normaliza un operador lógico SQL
     * 
     * Acepta solo operadores permitidos: 'AND', 'OR'.
     * Convierte a mayúsculas e usa 'AND' como default si no se proporciona.
     * 
     * @param {string} [logic] - Operador lógico a validar
     * @returns {string} Operador validado en mayúsculas ('AND' o 'OR')
     * @throws {InvalidLogicOperatorError} Si el operador no es válido
     * 
     * @example
     * parser.sanitizeLogicOperator('and'); // 'AND'
     * parser.sanitizeLogicOperator(); // 'AND' (default)
     */
    sanitizeLogicOperator(logic) {
        const parsedLogic = (logic || "AND").toUpperCase();
        if (!this.allowedLogicOperators.includes(parsedLogic)) {
            throw new InvalidLogicOperatorError(logic);
        }
        return parsedLogic;
    }

    /**
     * Convierte una lista de condiciones FQL parseadas en una query SQL
     * 
     * Procesa arrays de condiciones recursivamente, generando una cláusula WHERE con placeholders.
     * Soporta grupos anidados mediante paréntesis.
     * Remueve operadores lógicos finales para generar SQL válido.
     * 
     * @param {Array<FQLCondition|Array<FQLCondition>>} object - Array de condiciones y subgrupos
     * @returns {SQLParseResult} Objeto con {query: string, bindings: array}
     * @throws {InvalidQueryError} Si object no es array o contiene elementos no válidos
     * 
     * @example
     * const conditions = [
     *   { key: 'name', operator: 'LIKE', value: 'john', logic: 'AND' },
     *   { key: 'age', operator: '>', value: '30', logic: 'AND' }
     * ];
     * parser.parse(conditions);
     * // { query: '"name" LIKE ? AND "age" > ?', bindings: ['john', '30'] }
     */
    parse(object) {
        if (!Array.isArray(object)) {
            throw new InvalidQueryError(`Expected query object array, received: ${typeof object}`);
        }

        let query = "";
        let bindings = [];
        for (let element of object) {
            if (Array.isArray(element)) {
                const { query: subqry, bindings: subbind } = this.parse(element);
                query += `(${subqry})`;
                bindings = [...bindings, ...subbind];
            } else if (element && typeof element === 'object') {
                const { query: condition, bindings: bind } = this.convertCondition(element);
                query += condition;
                bindings = [...bindings, ...bind];
            } else {
                throw new InvalidQueryError(`Unknown type detected in qry: ${typeof element}`);
            }
        }
        query = query.replace(/( AND | OR )$/gm, "");
        return { query, bindings }; //Quitar condicion final
    }

    /**
     * Convierte una condición individual a SQL válido
     * 
     * Maneja operadores especiales:
     * - BETWEEN: genera `key BETWEEN ? AND ?`
     * - IN/NOT IN: genera `key IN (?)` con array de valores
     * - plain_+/plain_-: búsqueda de texto completo PostgreSQL (tsquery)
     * - Operadores estándar: LIKE, NOT LIKE, >, <, etc.
     * 
     * @param {SQLCondition} condition - Condición individual a convertir
     * @returns {SQLParseResult} Objeto con {query: string, bindings: array}
     * @throws {InvalidQueryError} Si la condición no es válida
     * @throws {InvalidIdentifierError} Si la clave no es identificador válido
     * @throws {InvalidLogicOperatorError} Si el operador lógico no es válido
     * @throws {UnsupportedDialectError} Si la operación no es soportada en el dialect
     * 
     * @protected
     * 
     * @example
     * parser.convertCondition({
     *   key: 'age',
     *   operator: '>,
     *   value: '30',
     *   logic: 'AND'
     * });
     * // { query: '"age" > ? AND ', bindings: [30] }
     */
    convertCondition(condition) {
        if (!condition || typeof condition !== "object") {
            throw new InvalidQueryError(`Invalid condition type: ${typeof condition}`);
        }

        let { key, operator, value, logic } = condition;
        const parsedLogic = this.sanitizeLogicOperator(logic);

        if (!key) {
            if (this.dialect !== "pg") {
                throw new UnsupportedDialectError(this.dialect, 'global searching');
            }
            const safeTable = this.sanitizeIdentifier(this.table);

            let op = "";
            if (operator === "plain_-") {
                op = "NOT";
            }
            return { query: `${op} to_tsvector(${safeTable}::text) @@ to_tsquery(?) ${parsedLogic} `, bindings: [value] }
        }


        let binding = "?";
        let parsedValue = [value]; //Eliminar las dobles comillas

        if (operator === "BETWEEN" || operator === "NOT BETWEEN") {
            parsedValue = value.replace(/\[|\]/gm, '');
            parsedValue = parsedValue.split(' TO ');
            binding = "? AND ?";
        }
        if (operator === "IN" || operator === "NOT IN") {
            parsedValue = [value.split(',')];
        }

        return { query: `${key} ${operator} ${binding} ${parsedLogic} `, bindings: parsedValue }
    }


}