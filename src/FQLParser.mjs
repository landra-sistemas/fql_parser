import XRegExp from "xregexp";
import { LOGICAL_OPERATORS, QUERY_OPERATORS, SPECIAL_OPERATORS, SQL_OPERATORS } from "./constants/Operators.mjs";
import isEmpty from "./utils/isEmpty.mjs";

export default class FQLParser {

    /**
     * @typedef {Object} FQLParserOptions
     * @property {Object.<string, string>} [aliases]
     * @property {boolean} [allowGlobalSearch=false]
     * @property {boolean} [caseInsensitive=false]
     * @property {number} [maxInputLength=10000]
     * @property {number} [maxValueLength=4000]
     * @property {number} [maxRegexIterations=20000]
     * @property {number} [parseTimeoutMs=200]
     * @property {number} [maxDepth=10]
     * @property {number} [maxParenthesesGroups=100]
     */

    /**
     * @typedef {Object} ParseContext
     * @property {number} startedAt
     * @property {number} deadline
     */

    /**
     * @typedef {Object} FQLCondition
     * @property {string} [key]
     * @property {string} operator
     * @property {string|Array<string>} value
     * @property {('AND'|'OR')} logic
     */

    LIKE = SQL_OPERATORS.LIKE;
    NOT_LIKE = SQL_OPERATORS.NOT_LIKE;

    /**
     * Crea una nueva instancia de FQLParser
     * 
     * @param {FQLParserOptions} [options={}] - Opciones de configuración del parser
     * @throws {TypeError} Si las opciones no son válidas (no es un objeto, alias no es objeto, etc.)
     * 
     * @example
     * const parser = new FQLParser({
     *   aliases: { usr: 'users.name', dept: 'departments.id' },
     *   allowGlobalSearch: true,
     *   caseInsensitive: true,
     *   maxDepth: 5
     * });
     */
    constructor(options = {}) {
        if (options === null || typeof options !== "object" || Array.isArray(options)) {
            throw new TypeError("options must be an object");
        }

        if (options.aliases !== undefined && (typeof options.aliases !== "object" || options.aliases === null || Array.isArray(options.aliases))) {
            throw new TypeError("aliases must be an object");
        }
        if (options.allowGlobalSearch !== undefined && typeof options.allowGlobalSearch !== "boolean") {
            throw new TypeError("allowGlobalSearch must be a boolean");
        }
        if (options.caseInsensitive !== undefined && typeof options.caseInsensitive !== "boolean") {
            throw new TypeError("caseInsensitive must be a boolean");
        }

        const numericOptions = [
            ["maxInputLength", options.maxInputLength],
            ["maxValueLength", options.maxValueLength],
            ["maxRegexIterations", options.maxRegexIterations],
            ["parseTimeoutMs", options.parseTimeoutMs],
            ["maxDepth", options.maxDepth],
            ["maxParenthesesGroups", options.maxParenthesesGroups]
        ];
        for (const [optionName, optionValue] of numericOptions) {
            if (optionValue !== undefined && (!Number.isInteger(optionValue) || optionValue <= 0)) {
                throw new TypeError(`${optionName} must be a positive integer`);
            }
        }

        this.aliases = options.aliases || {};
        this.allowGlobalSearch = options.allowGlobalSearch || false;
        this.maxInputLength = options.maxInputLength || 10000;
        this.maxValueLength = options.maxValueLength || 4000;
        this.maxRegexIterations = options.maxRegexIterations || 20000;
        this.parseTimeoutMs = options.parseTimeoutMs || 200;
        this.maxDepth = options.maxDepth || 10;
        this.maxParenthesesGroups = options.maxParenthesesGroups || 100;

        if (options.caseInsensitive) {
            this.LIKE = SQL_OPERATORS.ILIKE;
            this.NOT_LIKE = SQL_OPERATORS.NOT_ILIKE;
        }
    }
    /**
     * Parsea un string FQL y lo convierte en una estructura de condiciones
     * 
     * Soporta:
     * - Condiciones: `key:value` con operadores `:` (igual), `!:` (no igual), `>:` (mayor), `<:` (menor)
     * - Rangos: `key:[valor TO valor]` (BETWEEN)
     * - Múltiples valores: `key:val1,val2,val3` (IN)
     * - Grupos: `(condición1 AND condición2) OR condición3`
     * - Búsqueda global: `+término` (incluye), `-término` (excluye) - requiere allowGlobalSearch=true
     * 
     * @param {string} str - String FQL a parsear (ej: "name:john AND age>:25")
     * @param {ParseContext} [context] - Contexto interno para tracking de timeout
     * @param {number} [depth=0] - Profundidad actual de recursión (uso interno)
     * @returns {Array<FQLCondition|Array<FQLCondition>>} Array de condiciones y subgrupos anidados
     * @throws {TypeError} Si str no es string
     * @throws {Error} Si excede maxInputLength, maxDepth, maxParenthesesGroups, o timeout
     * 
     * @example
     * // Búsqueda simple
     * parser.parse("name:john AND status:active");
     * // [{ key: 'name', operator: 'LIKE', value: 'john', logic: 'AND' },
     * //  { key: 'status', operator: 'LIKE', value: 'active', logic: 'AND' }]
     * 
     * @example
     * // Con grupos y operadores
     * parser.parse("(name:john OR name:jane) AND age>:30");
     * // [[ { key: 'name', operator: 'LIKE', value: 'john', logic: 'OR' },
     * //    { key: 'name', operator: 'LIKE', value: 'jane', logic: 'OR' } ],
     * //  { key: 'age', operator: '>', value: '30', logic: 'AND' }]
     */
    parse = (str, context, depth = 0) => {
        if (typeof str !== "string") {
            throw new Error("Query must be a string");
        }
        if (str.length > this.maxInputLength) {
            throw new Error(`Query too long. Maximum length: ${this.maxInputLength}`);
        }
        if (depth > this.maxDepth) {
            throw new Error(`Maximum nesting depth exceeded: ${this.maxDepth}`);
        }

        const workContext = context || {
            startedAt: Date.now(),
            deadline: Date.now() + this.parseTimeoutMs
        };

        if (Date.now() > workContext.deadline) {
            throw new Error(`Parsing timeout exceeded (${this.parseTimeoutMs}ms)`);
        }

        let parsedElm = [];
        let workStr = str;
        const parentheses = this.splitParentheses(str);

        if (!isEmpty(parentheses) && parentheses.length > this.maxParenthesesGroups) {
            throw new Error(`Too many parenthesis groups: ${parentheses.length}. Maximum allowed: ${this.maxParenthesesGroups}`);
        }

        if (!isEmpty(parentheses)) {
            for (const [index, element] of parentheses.entries()) {
                //Reemplazar todas las ocurrencias del elemento en la query original
                workStr = workStr.replaceAll(`${element}`, `#${index}`);
                parsedElm.push(this.parse(element, workContext, depth + 1));
            }

        }
        // console.log(workStr);

        return this.parseQS(workStr, parsedElm, workContext);

    }


    /**
     * Extrae los bloques entre paréntesis de un nivel (no recursivo)
     * 
     * Utiliza expresión regular recursiva para encontrar grupos de paréntesis balanceados.
     * Solo extrae paréntesis del nivel superior - paréntesis anidados se procesarán en iteraciones posteriores.
     * 
     * @param {string} str - String con paréntesis a extraer
     * @returns {Array<string>} Array con el contenido de cada grupo de paréntesis (sin los paréntesis)
     * 
     * @example
     * parser.splitParentheses("a AND (b OR c) AND (d AND e)");
     * // ['b OR c', 'd AND e']
     */
    splitParentheses = (str) => {
        const test = XRegExp.matchRecursive(str, '\\(', '\\)', 'g');
        return test;
    }


    /**
     * Parsea un string de query sin paréntesis extrayendo parámetros de búsqueda
     * 
     * Aplica expresión regular para extraer:
     * - key: nombre de columna
     * - operator: operador de búsqueda (`:`, `!:`, `>:`, `<:`)
     * - value: valor a buscar (puede incluir comillas o rangos)
     * - logic: operador lógico (AND/OR) para conectar condiciones
     * - plain: parámetro de búsqueda global (`+término` o `-término`)
     * 
     * @param {string} str - String sin paréntesis anidados, con condiciones separadas por operadores lógicos
     * @param {Array<FQLCondition|Array<FQLCondition>>} subgroups - Subgrupos ya parseados desde paréntesis
     * @param {ParseContext} [context] - Contexto para validación de timeout
     * @returns {Array<FQLCondition|Array<FQLCondition>>} Array de condiciones parseadas
     * @throws {Error} Si excede maxRegexIterations o timeout
     * 
     * @private
     */
    parseQS = (str, subgroups, context) => {
        const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)(?<operator>:|!:|>:|<:)(?<value>[^\s|"|\[]+|".*?"|\[.*?\]))? ?(?<logic>OR|AND)? ?(?<plain>[\+|\-|\(#][^\s]+|)? ?/gm;
        let m;
        let iterations = 0;

        let data = [];
        while ((m = regex.exec(str)) !== null) {
            iterations += 1;
            if (iterations > this.maxRegexIterations) {
                throw new Error(`Maximum regex iterations exceeded: ${this.maxRegexIterations}`);
            }
            if (context && Date.now() > context.deadline) {
                throw new Error(`Parsing timeout exceeded (${this.parseTimeoutMs}ms)`);
            }

            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            if (m === null) {
                continue;
            }
            let { key, value, operator, plain, logic } = m.groups;

            if (!operator) {
                operator = QUERY_OPERATORS.EQUAL;
            }

            let type = this.LIKE;
            switch (operator) {
                case QUERY_OPERATORS.EQUAL:
                default:
                    type = this.LIKE;
                    break;
                case QUERY_OPERATORS.NOT_EQUAL:
                    type = this.NOT_LIKE;
                    break;
                case QUERY_OPERATORS.GREATER:
                    type = SQL_OPERATORS.GREATER_THAN;
                    break;
                case QUERY_OPERATORS.LESS:
                    type = SQL_OPERATORS.LESS_THAN;
                    break;
            }
            //Los corchetes marcan rangos con lo que si se detecta se cambia el tipo LIKE a BETWEEN
            if (value && value.match(/\[.*?TO.*?\]/)) {
                type = type === this.NOT_LIKE ? SQL_OPERATORS.NOT_BETWEEN : SQL_OPERATORS.BETWEEN;
            }
            //Las comas implican varios valores con lo que si se detectan se cambia el tipo LIKE a IN
            if (value && value.indexOf(',') !== -1) {
                type = type === this.NOT_LIKE ? SQL_OPERATORS.NOT_IN : SQL_OPERATORS.IN;
            }

            if (key) {
                data.push({
                    key: this.checkAliases(key),
                    operator: type,
                    value: this.parseValue(value),
                    logic: logic || LOGICAL_OPERATORS.AND
                });
            }
            // Gestion para añadir los indices de los subgrupos
            if (plain && plain.indexOf('#') !== -1) {
                const index = plain.replace(/#|\(|\)/g, '');
                data.push(subgroups[parseInt(index)]);
            } else if (this.allowGlobalSearch && plain && plain.indexOf('#') === -1) {
                // Añadir las busquedas plain en caso de estar activadas.
                let op = SPECIAL_OPERATORS.PLAIN_INCLUDE;
                if (plain.startsWith('-')) {
                    op = SPECIAL_OPERATORS.PLAIN_EXCLUDE;
                }
                data.push({
                    operator: op,
                    value: this.parseValueForPlainQuery(plain.replace(/\+|\-/gm, '')),
                    logic: logic || LOGICAL_OPERATORS.AND
                });
            }
        }
        return data;
    }



    /**
     * Verifica y aplica aliases de columnas
     * 
     * Permite mapear nombres de columna a identificadores reales o con transforms.
     * Los aliases pueden usar `{{key}}` como placeholder para el nombre original.
     * Un alias `*` actúa como comodín para todas las columnas no mapeadas.
     * 
     * @param {string} key - Nombre de columna original
     * @returns {string} Nombre de columna con alias aplicado, o el nombre original si no existe alias
     * 
     * @example
     * const parser = new FQLParser({
     *   aliases: {
     *     usr: 'users.username',
     *     dept: 'departments.name',
     *     '*': 'table1.{{key}}'
     *   }
     * });
     * parser.checkAliases('usr'); // 'users.username'
     * parser.checkAliases('other'); // 'table1.other'
     */
    checkAliases(key) {
        if (!this.aliases) {
            return key;
        }
        if (this.aliases[key]) {
            return this.aliases[key].replaceAll("{{key}}", key);
        }
        if (this.aliases['*']) {
            return this.aliases['*'].replaceAll("{{key}}", key);
        }
        return key;
    }

    /**
     * Sanitiza y procesa un valor de búsqueda LIKE
     * 
     * Aplica las siguientes transformaciones:
     * 1. Remueve caracteres especiales SQL: comillas dobles y signos de pregunta
     * 2. Remueve caracteres de control (0x00-0x1F y 0x7F)
     * 3. Convierte `*` en `%` para wildcards SQL LIKE
     * 4. Trimea espacios en blanco
     * 
     * @param {string} value - Valor a sanitizar
     * @returns {string} Valor sanitizado listo para query LIKE
     * @throws {Error} Si valor es más largo que maxValueLength
     * 
     * @example
     * parser.parseValue('test*value'); // 'test%value'
     * parser.parseValue('"quoted"'); // 'quoted'
     */
    parseValue(value) {
        if (value === undefined || value === null) {
            return '';
        }

        let sanitized = String(value)
            .replaceAll(/"|\?/g, '')
            .replaceAll(/[\u0000-\u001F\u007F]/g, '')
            .trim();

        if (sanitized.length > this.maxValueLength) {
            throw new Error(`Value too long. Maximum length: ${this.maxValueLength}`);
        }

        return sanitized.replaceAll('*', '%');
    }
    /**
     * Sanitiza un valor para búsqueda de texto completo (PostgreSQL tsquery)
     * 
     * Aplica sanitización intensiva para evitar inyección de operadores SQL:
     * 1. Remueve caracteres especiales SQL: comillas, signos de pregunta, comentarios
     * 2. Remueve operadores tsquery: `&`, `|`, `!`, `()`, `:`, `\`
     * 3. Remueve caracteres de control
     * 4. Convierte `*` a `:*` (wildcard tsquery)
     * 5. Trimea espacios en blanco
     * 
     * @param {string} value - Valor a sanitizar
     * @returns {string} Valor sanitizado listo para tsquery PostgreSQL
     * @throws {Error} Si valor es más largo que maxValueLength
     * 
     * @example
     * parser.parseValueForPlainQuery('search*'); // 'search:*'
     * parser.parseValueForPlainQuery('test"malicious'; // 'testmalicious'
     */
    parseValueForPlainQuery(value) {
        if (value === undefined || value === null) {
            return '';
        }

        let sanitized = String(value)
            .replaceAll(/"|\?/g, '')
            .replaceAll(/[\u0000-\u001F\u007F]/g, '')
            .replaceAll(/\-\-/g, '')
            .replaceAll(/\/\*|\*\//g, '')
            .replaceAll(/[&|!():\\]/g, '')
            .trim();

        if (sanitized.length > this.maxValueLength) {
            throw new Error(`Value too long. Maximum length: ${this.maxValueLength}`);
        }

        const wildcard = sanitized.includes("*") ? ":*" : "";
        return sanitized.replaceAll('*', wildcard);
    }
}
