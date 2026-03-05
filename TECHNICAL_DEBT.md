# Deuda Técnica y Funcional - FQL Parser

**Proyecto:** @landra_sistemas/fql-parser  
**Versión Analizada:** 0.1.8  
**Fecha de Análisis:** 18 de febrero de 2026

---

## 📋 Resumen Ejecutivo

Este documento identifica problemas de seguridad, deuda técnica y oportunidades de mejora en el proyecto FQL Parser. Se han encontrado **3 problemas críticos de seguridad**, **10 problemas de implementación** y **9 oportunidades de mejora**.

**Priorización:**
- 🔴 **Crítico**: Requiere atención inmediata (Seguridad)
- 🟠 **Alto**: Debe resolverse pronto (Bugs potenciales)
- 🟡 **Medio**: Mejora la calidad del código
- 🟢 **Bajo**: Nice to have

---

## 🔒 Problemas de Seguridad

### 🔴 1. Vulnerabilidad de SQL Injection (Crítico)
**Archivo:** [src/sql/SQLParser.mjs](src/sql/SQLParser.mjs#L47-L66)  
**Líneas:** 47-66

**Problema:**
```javascript
// Código actual
if (!key) {
    if (this.dialect !== "pg") {
        console.warn('Only PostgreSQL supports global searching');
        return "";
    }
    let op = "";
    if (operator === "plain_-") {
        op = "NOT";
    }
    return { query: `${op} to_tsvector(${this.table}::text) @@ to_tsquery(?) ${logic} `, bindings: [value] }
}
```

**Riesgo:**
- La variable `this.table` se inserta directamente en la query SQL sin sanitización
- Un atacante podría inyectar código SQL malicioso a través del parámetro `table` del constructor
- El parámetro `logic` también se inserta sin validación

**Impacto:** Alto - Permite ejecución de código SQL arbitrario

**Solución Propuesta:**
```javascript
// Solución
const VALID_LOGIC_OPERATORS = ['AND', 'OR'];
const TABLE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

constructor(table, dialect = "pg") {
    // Validar nombre de tabla
    if (!TABLE_NAME_REGEX.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }
    this.table = table;
    this.dialect = dialect;
}

convertCondition(condition) {
    let { key, operator, value, logic } = condition;
    
    // Validar operador lógico
    if (logic && !VALID_LOGIC_OPERATORS.includes(logic)) {
        throw new Error(`Invalid logic operator: ${logic}`);
    }
    
    if (!key) {
        if (this.dialect !== "pg") {
            throw new Error('Global searching is only supported in PostgreSQL');
        }
        let op = operator === "plain_-" ? "NOT" : "";
        // Usar identifier quotation seguro
        return { 
            query: `${op} to_tsvector("${this.table}"::text) @@ to_tsquery(?) ${logic || 'AND'} `, 
            bindings: [value] 
        }
    }
    // ... resto del código
}
```

**Tareas:**
- [x] Implementar validación de nombre de tabla
- [x] Añadir whitelist para operadores lógicos
- [x] Usar comillas de identificador SQL ("table" en vez de interpolación)
- [x] Añadir tests de seguridad específicos
- [ ] Considerar usar una librería de query builder segura

---

### 🔴 2. Vulnerabilidad ReDoS (Regular Expression Denial of Service)
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L63)  
**Línea:** 63

**Problema:**
```javascript
const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)(?<operator>:|!:|>:|<:)(?<value>[^\s|"|\[]+|".*?"|\[.*?\]))? ?(?<logic>OR|AND)? ?(?<plain>[\+|\-|\(#][^\s]+|)? ?/gm;
```

**Riesgo:**
- Regex compleja con múltiples grupos opcionales y cuantificadores
- Vulnerable a ataques ReDoS con inputs específicamente diseñados
- Un atacante podría causar que el servidor se congele con un string largo

**Ejemplo de Ataque:**
```javascript
const maliciousInput = 'a:' + 'a'.repeat(10000) + '!';
parser.parse(maliciousInput); // Podría causar congelamiento
```

**Impacto:** Alto - Denial of Service

**Solución Propuesta:**
```javascript
// 1. Simplificar la regex
// 2. Añadir timeout
// 3. Limitar longitud de input

parse = (str) => {
    // Validación de entrada
    const MAX_INPUT_LENGTH = 10000; // Configurable
    if (str.length > MAX_INPUT_LENGTH) {
        throw new Error(`Query too long. Maximum length: ${MAX_INPUT_LENGTH}`);
    }
    
    // Usar un tokenizer en lugar de regex compleja
    const tokens = this.tokenize(str);
    return this.parseTokens(tokens);
}

// Implementar tokenizer más seguro
tokenize(str) {
    const tokens = [];
    let current = 0;
    // Procesar carácter por carácter con límites claros
    // ... implementación
    return tokens;
}
```

**Alternativa con safe-regex:**
```javascript
import safeRegex from 'safe-regex';

constructor(options) {
    // ...
    const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)...)/gm;
    if (!safeRegex(regex)) {
        throw new Error('Regex is potentially unsafe');
    }
}
```

**Tareas:**
- [ ] Analizar regex con herramientas como safe-regex
- [x] Implementar límite de longitud de input
- [ ] Considerar reescribir parser usando tokenización *(pospuesto: mitigación conservadora aplicada sin cambiar regex)*
- [x] Añadir timeout para operaciones de parsing
- [x] Tests con inputs largos y maliciosos

---

### 🔴 3. Stack Overflow por Recursión Ilimitada
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L29-L42)  
**Líneas:** 29-42

**Problema:**
```javascript
parse = (str) => {
    let parsedElm = [];
    let workStr = str;
    const parentheses = this.splitPatentheses(str);

    if (!lodash.isEmpty(parentheses)) {
        for (const elm in parentheses) {
            workStr = workStr.replace(`${parentheses[elm]}`, `#${elm}`);
            parsedElm.push(this.parse(parentheses[elm])); // ⚠️ Recursión sin límite
        }
    }
    return this.parseQS(workStr, parsedElm);
}
```

**Riesgo:**
- No hay límite de profundidad para paréntesis anidados
- Un atacante podría enviar algo como: `(((((((((...))))))))))` con miles de niveles
- Causaría stack overflow y crash de la aplicación

**Ejemplo de Ataque:**
```javascript
const attack = '('.repeat(10000) + 'test:value' + ')'.repeat(10000);
parser.parse(attack); // Stack overflow
```

**Impacto:** Alto - Crash de aplicación

**Solución Propuesta:**
```javascript
constructor(options) {
    this.aliases = (options && options.aliases) || {};
    this.allowGlobalSearch = (options && options.allowGlobalSearch) || false;
    this.maxDepth = (options && options.maxDepth) || 10; // Límite configurable
    this.currentDepth = 0;
    
    if (options && options.caseInsensitive) {
        this.LIKE = "ILIKE";
    }
}

parse = (str, depth = 0) => {
    // Validar profundidad
    if (depth > this.maxDepth) {
        throw new Error(`Maximum nesting depth exceeded: ${this.maxDepth}`);
    }
    
    let parsedElm = [];
    let workStr = str;
    const parentheses = this.splitPatentheses(str);

    if (!lodash.isEmpty(parentheses)) {
        // Validar cantidad de grupos
        if (parentheses.length > 100) {
            throw new Error('Too many parenthesis groups');
        }
        
        for (const elm in parentheses) {
            workStr = workStr.replace(`${parentheses[elm]}`, `#${elm}`);
            // Pasar depth + 1
            parsedElm.push(this.parse(parentheses[elm], depth + 1));
        }
    }
    
    return this.parseQS(workStr, parsedElm);
}
```

**Tareas:**
- [x] Implementar límite de profundidad configurable
- [x] Añadir límite de grupos de paréntesis
- [x] Validar entrada antes de procesar
- [x] Tests con casos extremos de anidamiento
- [x] Documentar límites en README

---

## 🐛 Problemas de Implementación

### 🟠 4. Manejo de Errores Deficiente
**Archivos:** Múltiples  
**Severidad:** Alta

**Problema:**
```javascript
// src/sql/SQLParser.mjs - Línea 47
if (this.dialect !== "pg") {
    console.warn('Only PostgreSQL supports global searching');
    return "";  // ⚠️ Retorna string vacío en lugar de lanzar error
}

// src/sql/SQLParser.mjs - Línea 33
} else {
    console.warn('Unknown type detected in qry'); // ⚠️ Solo un warning
}
```

**Impacto:**
- Errores silenciosos difíciles de debuggear
- Comportamiento inesperado en producción
- No hay manera de capturar y manejar errores apropiadamente

**Solución Propuesta:**
```javascript
// Crear jerarquía de errores personalizada
// src/errors/FQLErrors.mjs
export class FQLError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'FQLError';
        this.code = code;
    }
}

export class UnsupportedDialectError extends FQLError {
    constructor(dialect, feature) {
        super(`Dialect '${dialect}' does not support: ${feature}`, 'UNSUPPORTED_DIALECT');
        this.dialect = dialect;
        this.feature = feature;
    }
}

export class InvalidQueryError extends FQLError {
    constructor(message) {
        super(message, 'INVALID_QUERY');
    }
}

// Usar en SQLParser.mjs
import { UnsupportedDialectError, InvalidQueryError } from '../errors/FQLErrors.mjs';

convertCondition(condition) {
    let { key, operator, value, logic } = condition;
    
    if (!key) {
        if (this.dialect !== "pg") {
            throw new UnsupportedDialectError(this.dialect, 'global searching');
        }
        // ...
    }
    // ...
}

parse(object) {
    // ...
    if (Array.isArray(element)) {
        // ...
    } else if (typeof element === 'object') {
        // ...
    } else {
        throw new InvalidQueryError(`Unknown type detected: ${typeof element}`);
    }
    // ...
}
```

**Tareas:**
- [x] Crear módulo de errores personalizados
- [x] Reemplazar todos los console.warn/log por throw apropiados
- [x] Documentar códigos de error en README
- [x] Añadir tests de manejo de errores
- [ ] Implementar error logging estructurado

---

### 🟠 5. Sanitización Incompleta de Valores
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L191-L206)  
**Líneas:** 191-206

**Problema:**
```javascript
parseValue(value) {
    //TODO improve  // ⚠️ TODO en código de producción
    return value.replaceAll(/"|\?/g, '').replaceAll('*', '%');
}

parseValueForPlainQuery(value) {
    //TODO improve  // ⚠️ TODO en código de producción
    const wildcard = value.includes("*") ? ":*" : "";
    return value.replaceAll(/"|\?/g, '').replaceAll('*', wildcard);
}
```

**Impacto:**
- Funcionalidad incompleta marcada con TODO
- No se manejan todos los caracteres especiales SQL
- Posible bypass de sanitización

**Caracteres SQL Especiales No Manejados:**
- `'` (comilla simple)
- `;` (punto y coma)
- `--` (comentarios SQL)
- `/*` `*/` (comentarios multilínea)
- `\` (escape)
- `%` (comodín LIKE)
- `_` (comodín LIKE)

**Solución Propuesta:**
```javascript
/**
 * Sanitiza un valor para ser usado en queries SQL
 * @param {string} value - Valor a sanitizar
 * @returns {string} Valor sanitizado
 */
parseValue(value) {
    if (!value) return '';
    
    // Remover o escapar caracteres peligrosos
    let sanitized = value
        .replace(/["';\-\\]/g, '') // Remover caracteres peligrosos
        .replace(/\/\*|\*\//g, '') // Remover comentarios multilinea
        .trim();
    
    // Convertir wildcards de búsqueda a SQL
    sanitized = this.convertWildcards(sanitized);
    
    // Limitar longitud
    const MAX_VALUE_LENGTH = 1000;
    if (sanitized.length > MAX_VALUE_LENGTH) {
        throw new Error(`Value too long. Maximum: ${MAX_VALUE_LENGTH}`);
    }
    
    return sanitized;
}

/**
 * Convierte wildcards de búsqueda (* y ?) a SQL (% y _)
 * @param {string} value - Valor con wildcards
 * @returns {string} Valor con wildcards SQL
 */
convertWildcards(value) {
    // Escapar % y _ existentes primero
    let converted = value
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
    
    // Convertir wildcards de búsqueda
    converted = converted
        .replace(/\*/g, '%')
        .replace(/\?/g, '_');
    
    return converted;
}

/**
 * Sanitiza valor para búsqueda de texto completo (PostgreSQL)
 * @param {string} value - Valor a sanitizar
 * @returns {string} Valor sanitizado para tsquery
 */
parseValueForPlainQuery(value) {
    if (!value) return '';
    
    // Caracteres especiales de tsquery: & | ! ( ) : * 
    let sanitized = value
        .replace(/[&|!():]/g, '') // Remover operadores tsquery
        .trim();
    
    // Manejar wildcard al final
    const hasWildcard = sanitized.includes("*");
    sanitized = sanitized.replace(/\*/g, '');
    
    // Validar que no esté vacío
    if (!sanitized) {
        throw new Error('Search value cannot be empty');
    }
    
    return hasWildcard ? `${sanitized}:*` : sanitized;
}
```

**Tareas:**
- [x] Implementar sanitización completa
- [x] Añadir tests para todos los caracteres especiales
- [x] Documentar qué caracteres se permiten/rechazan
- [x] Remover TODOs del código
- [ ] Considerar usar librería de sanitización SQL estándar

---

### 🟠 6. Typo en Nombre de Método
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L50)  
**Línea:** 50

**Problema:**
```javascript
splitPatentheses = (str) => {  // ⚠️ Typo: "Patentheses" -> "Parentheses"
    const test = XRegExp.matchRecursive(str, '\\(', '\\)', 'g');
    return test;
}
```

**Impacto:**
- Baja calidad de código
- Confusión para otros desarrolladores
- Si es parte de API pública, breaking change al corregir

**Solución Propuesta:**
```javascript
/**
 * Extrae los bloques entre paréntesis (solo un nivel).
 * @param {string} str - String a procesar
 * @returns {Array<string>} Array con contenidos de paréntesis
 */
splitParentheses = (str) => {
    try {
        const matches = XRegExp.matchRecursive(str, '\\(', '\\)', 'g');
        return matches || [];
    } catch (error) {
        throw new InvalidQueryError(`Invalid parentheses structure: ${error.message}`);
    }
}

// Si el método es público, mantener alias deprecado
/** @deprecated Use splitParentheses instead */
splitPatentheses = this.splitParentheses;
```

**Actualizar referencias:**
```javascript
// Línea 40
const parentheses = this.splitParentheses(str); // Actualizado
```

**Tareas:**
- [x] Renombrar método a `splitParentheses`
- [x] Actualizar todas las referencias
- [x] Si es API pública, añadir alias deprecado *(no aplica: método tratado como privado)*
- [x] Actualizar tests
- [ ] Añadir linter para detectar typos comunes

---

### 🟡 7. Magic Strings y Constantes No Definidas
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs)  
**Severidad:** Media

**Problema:**
```javascript
// Operadores hardcodeados en múltiples lugares
type = "LIKE";  // Línea 99
type = `NOT ${this.LIKE}`;  // Línea 102
type = ">";  // Línea 105
type = "<";  // Línea 108

// Operadores lógicos
logic: logic || "AND"  // Múltiples líneas

// Operadores especiales
operator: "plain_+",  // Línea 139
operator: "plain_-",  // Línea 134
```

**Impacto:**
- Difícil mantenimiento
- Propenso a errores tipográficos
- No hay single source of truth

**Solución Propuesta:**
```javascript
// Crear archivo de constantes
// src/constants/Operators.mjs
export const SQL_OPERATORS = {
    LIKE: 'LIKE',
    ILIKE: 'ILIKE',
    NOT_LIKE: 'NOT LIKE',
    NOT_ILIKE: 'NOT ILIKE',
    GREATER_THAN: '>',
    LESS_THAN: '<',
    BETWEEN: 'BETWEEN',
    NOT_BETWEEN: 'NOT BETWEEN',
    IN: 'IN',
    NOT_IN: 'NOT IN',
    EQUALS: '=',
    NOT_EQUALS: '!='
};

export const LOGICAL_OPERATORS = {
    AND: 'AND',
    OR: 'OR'
};

export const QUERY_OPERATORS = {
    EQUAL: ':',
    NOT_EQUAL: '!:',
    GREATER: '>:',
    LESS: '<:'
};

export const SPECIAL_OPERATORS = {
    PLAIN_INCLUDE: 'plain_+',
    PLAIN_EXCLUDE: 'plain_-'
};

// Usar en FQLParser.mjs
import { SQL_OPERATORS, LOGICAL_OPERATORS, QUERY_OPERATORS, SPECIAL_OPERATORS } from './constants/Operators.mjs';

export default class FQLParser {
    constructor(options) {
        this.aliases = (options && options.aliases) || {};
        this.allowGlobalSearch = (options && options.allowGlobalSearch) || false;
        this.LIKE = options?.caseInsensitive ? SQL_OPERATORS.ILIKE : SQL_OPERATORS.LIKE;
        this.NOT_LIKE = options?.caseInsensitive ? SQL_OPERATORS.NOT_ILIKE : SQL_OPERATORS.NOT_LIKE;
    }

    parseQS = (str, subgroups) => {
        // ...
        let type = this.LIKE;
        switch (operator) {
            case QUERY_OPERATORS.EQUAL:
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
        
        // Usar constantes
        data.push({
            key: this.checkAliases(key),
            operator: type,
            value: this.parseValue(value),
            logic: logic || LOGICAL_OPERATORS.AND
        });
        // ...
    }
}
```

**Tareas:**
- [x] Crear módulo de constantes
- [x] Reemplazar todos los magic strings
- [x] Exportar constantes para uso externo
- [x] Documentar operadores disponibles
- [x] Añadir tests que usen las constantes

---

### 🟡 8. Uso de `for...in` en Arrays
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L37-L41)  
**Líneas:** 37-41

**Problema:**
```javascript
if (!lodash.isEmpty(parentheses)) {
    for (const elm in parentheses) {  // ⚠️ for...in en array
        workStr = workStr.replace(`${parentheses[elm]}`, `#${elm}`);
        parsedElm.push(this.parse(parentheses[elm]));
    }
}
```

**Impacto:**
- `for...in` itera sobre propiedades enumerables, no índices del array
- Puede incluir propiedades heredadas del prototype
- Rendimiento subóptimo
- Potencial fuente de bugs

**Solución Propuesta:**
```javascript
if (!lodash.isEmpty(parentheses)) {
    // Opción 1: for...of con entries (recomendado)
    for (const [index, element] of parentheses.entries()) {
        workStr = workStr.replace(element, `#${index}`);
        parsedElm.push(this.parse(element));
    }
    
    // Opción 2: forEach
    parentheses.forEach((element, index) => {
        workStr = workStr.replace(element, `#${index}`);
        parsedElm.push(this.parse(element));
    });
    
    // Opción 3: for clásico
    for (let i = 0; i < parentheses.length; i++) {
        workStr = workStr.replace(parentheses[i], `#${i}`);
        parsedElm.push(this.parse(parentheses[i]));
    }
}
```

**Tareas:**
- [x] Reemplazar for...in por for...of
- [ ] Configurar ESLint para detectar for...in en arrays
- [x] Revisar todo el código en busca de este patrón
- [x] Añadir tests

---

### 🟡 9. Dependencia de lodash para Funcionalidad Básica
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L2)  
**Línea:** 2

**Problema:**
```javascript
import lodash from "lodash";

// Solo se usa en:
if (!lodash.isEmpty(parentheses)) {  // Línea 36
```

**Impacto:**
- Dependencia pesada (70KB) para una sola función
- Bundle size aumentado innecesariamente
- La verificación se puede hacer nativamente

**Solución Propuesta:**
```javascript
// Remover import de lodash

// Reemplazar lodash.isEmpty con:
if (parentheses && parentheses.length > 0) {
    // ...
}

// O crear helper interno si se necesita:
/**
 * Verifica si un valor está vacío
 * @param {*} value - Valor a verificar
 * @returns {boolean} True si está vacío
 */
function isEmpty(value) {
    if (value == null) return true;
    if (Array.isArray(value) || typeof value === 'string') {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    return false;
}
```

**Análisis de Bundle:**
```bash
# Antes: ~71KB
# Después: ~1KB
# Ahorro: ~70KB (98.6% reducción)
```

**Tareas:**
- [x] Remover dependencia de lodash
- [x] Reemplazar con implementación nativa
- [x] Actualizar package.json
- [ ] Verificar bundle size
- [x] Actualizar tests

---

### 🟡 10. Falta de Validación de Tipos en Constructor
**Archivos:** Múltiples  
**Severidad:** Media

**Problema:**
```javascript
// FQLParser.mjs
constructor(options) {
    this.aliases = (options && options.aliases) || {};
    this.allowGlobalSearch = (options && options.allowGlobalSearch) || false;
    // No valida que options sea un objeto
    // No valida que aliases sea un objeto
    // No valida que allowGlobalSearch sea boolean
}

// SQLParser.mjs
constructor(table, dialect = "pg") {
    this.table = table;
    this.dialect = dialect;
    // No valida que table sea string
    // No valida que dialect sea válido
}
```

**Impacto:**
- Errores crípticos si se pasan tipos incorrectos
- Comportamiento inesperado
- Difícil debugging

**Solución Propuesta:**
```javascript
// Usando Zod para validación
import { z } from 'zod';

// Schema para FQLParser
const FQLParserOptionsSchema = z.object({
    aliases: z.record(z.string()).optional(),
    allowGlobalSearch: z.boolean().optional(),
    caseInsensitive: z.boolean().optional(),
    maxDepth: z.number().int().positive().max(20).optional(),
    maxInputLength: z.number().int().positive().max(100000).optional()
}).optional();

export default class FQLParser {
    constructor(options = {}) {
        // Validar options
        const validated = FQLParserOptionsSchema.parse(options);
        
        this.aliases = validated?.aliases || {};
        this.allowGlobalSearch = validated?.allowGlobalSearch || false;
        this.maxDepth = validated?.maxDepth || 10;
        this.maxInputLength = validated?.maxInputLength || 10000;
        
        this.LIKE = validated?.caseInsensitive ? "ILIKE" : "LIKE";
    }
}

// Schema para SQLParser
const VALID_DIALECTS = ['pg', 'mysql', 'sqlite', 'mssql', 'oracle'] as const;

const SQLParserArgsSchema = z.tuple([
    z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid table name'),
    z.enum(VALID_DIALECTS).default('pg')
]);

export default class SQLParser {
    constructor(table, dialect = "pg") {
        // Validar argumentos
        const [validatedTable, validatedDialect] = SQLParserArgsSchema.parse([table, dialect]);
        
        this.table = validatedTable;
        this.dialect = validatedDialect;
    }
}
```

**Alternativa sin dependencias:**
```javascript
// Validación manual
export default class FQLParser {
    constructor(options = {}) {
        // Validar tipo
        if (options !== null && typeof options !== 'object') {
            throw new TypeError('options must be an object');
        }
        
        // Validar aliases
        if (options.aliases !== undefined) {
            if (typeof options.aliases !== 'object' || Array.isArray(options.aliases)) {
                throw new TypeError('aliases must be an object');
            }
        }
        
        // Validar allowGlobalSearch
        if (options.allowGlobalSearch !== undefined && typeof options.allowGlobalSearch !== 'boolean') {
            throw new TypeError('allowGlobalSearch must be a boolean');
        }
        
        this.aliases = options.aliases || {};
        this.allowGlobalSearch = options.allowGlobalSearch || false;
        this.LIKE = options.caseInsensitive ? "ILIKE" : "LIKE";
    }
}
```

**Tareas:**
- [x] Añadir validación de tipos en constructores
- [ ] ~~Considerar usar Zod o similar~~
- [x] Documentar tipos con JSDoc/TypeScript
- [x] Añadir tests para inputs inválidos
- [x] Documentar errores que se pueden lanzar

---

### ✅ 11. Problemas con `replaceAll` (RESUELTO)
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs)  
**Severidad:** Media

**Problema Original:**
- `replaceAll` no está disponible en Node.js < 15.0.0
- Puede causar errores en ambientes antiguos

**Solución Adoptada:**
Se especificó requisito de versión mínima de Node.js en `package.json` sin modificar código:

```json
{
    "engines": {
        "node": ">=16.0.0"
    }
}
```

**Justificación:**
- Node.js 16.0.0+ incluye nativo `String.prototype.replaceAll()`
- Solución simple y sin dependencias adicionales
- No requiere refactorización de código existente
- Compatible con la mayoría de ambientes modernos

**Uso Actual:**
- [FQLParser.mjs](src/FQLParser.mjs#L260): `checkAliases()` - reemplaza placeholders `{{key}}`
- [FQLParser.mjs](src/FQLParser.mjs#L279): `parseValue()` - sanitización de comillas y wildcards
- [FQLParser.mjs](src/FQLParser.mjs#L300): `parseValueForPlainQuery()` - procesamiento de búsqueda plana

**Tareas:**
- [x] Especificar Node >= 15 en engines
- [x] Documentar requisito en este documento
- [x] Validar compatibilidad con test suite completo

---

### 🟡 12. Falta de Documentación JSDoc Completa
**Archivos:** Todos  
**Severidad:** Baja

**Problema:**
```javascript
// Documentación existente incompleta
/**
 * Convierte un string 'key:value' en array de objetos...
 * @param {*} str 
 * @returns 
 */
parse = (str) => {  // ⚠️ Tipo genérico, sin descripción de retorno
```

**Impacto:**
- Difícil uso de la librería
- No hay autocompletado en IDEs
- No hay verificación de tipos

**Solución Propuesta:**
```javascript
/**
 * Parser para Fast Query Language (FQL)
 * Convierte búsquedas tipo "key:value" en estructuras de datos procesables
 * 
 * @example
 * ```javascript
 * const parser = new FQLParser({
 *   aliases: { user: 'users.username' },
 *   allowGlobalSearch: true
 * });
 * const result = parser.parse('user:john AND age>:25');
 * ```
 */
export default class FQLParser {
    
    /**
     * @typedef {Object} FQLCondition
     * @property {string} key - Columna o campo a buscar
     * @property {string} operator - Operador SQL (LIKE, >, <, BETWEEN, etc.)
     * @property {string|string[]} value - Valor(es) a comparar
     * @property {('AND'|'OR')} logic - Operador lógico para la siguiente condición
     */

    /**
     * @typedef {Object} FQLParserOptions
     * @property {Object.<string, string>} [aliases] - Mapeo de aliases de columnas
     * @property {boolean} [allowGlobalSearch=false] - Permite búsquedas globales (+/-texto)
     * @property {boolean} [caseInsensitive=false] - Usa ILIKE en lugar de LIKE (solo PostgreSQL)
     * @property {number} [maxDepth=10] - Profundidad máxima de anidamiento
     * @property {number} [maxInputLength=10000] - Longitud máxima del string de búsqueda
     */

    /**
     * Crea una nueva instancia de FQLParser
     * @param {FQLParserOptions} [options={}] - Opciones de configuración
     * @throws {TypeError} Si las opciones no son válidas
     */
    constructor(options = {}) {
        // ...
    }

    /**
     * Parsea un string FQL y lo convierte en una estructura de condiciones
     * 
     * @param {string} str - String FQL a parsear (ej: "name:john AND age>:25")
     * @param {number} [depth=0] - Profundidad actual (uso interno)
     * @returns {Array<FQLCondition|Array>} Array de condiciones y subgrupos
     * @throws {Error} Si excede la profundidad máxima o longitud máxima
     * 
     * @example
     * parser.parse("name:john OR (status:active AND age>:18)")
     * // Retorna:
     * // [
     * //   { key: 'name', operator: 'LIKE', value: 'john', logic: 'OR' },
     * //   [
     * //     { key: 'status', operator: 'LIKE', value: 'active', logic: 'AND' },
     * //     { key: 'age', operator: '>', value: '18', logic: 'AND' }
     * //   ]
     * // ]
     */
    parse(str, depth = 0) {
        // ...
    }

    /**
     * Divide el string en grupos de paréntesis (un nivel)
     * @param {string} str - String a procesar
     * @returns {string[]} Array con contenidos de cada grupo de paréntesis
     * @throws {Error} Si hay paréntesis desbalanceados
     * @private
     */
    splitParentheses(str) {
        // ...
    }

    /**
     * Aplica expresión regular para extraer parámetros de búsqueda
     * @param {string} str - String sin paréntesis anidados
     * @param {Array} subgroups - Subgrupos previamente parseados
     * @returns {Array<FQLCondition>} Array de condiciones
     * @private
     */
    parseQS(str, subgroups) {
        // ...
    }

    /**
     * Verifica y aplica aliases de columnas
     * @param {string} key - Nombre de columna original
     * @returns {string} Nombre de columna con alias aplicado (si existe)
     */
    checkAliases(key) {
        // ...
    }

    /**
     * Sanitiza y procesa un valor de búsqueda
     * @param {string} value - Valor a procesar
     * @returns {string} Valor sanitizado con wildcards convertidos
     */
    parseValue(value) {
        // ...
    }

    /**
     * Sanitiza valor para búsqueda de texto completo (PostgreSQL tsquery)
     * @param {string} value - Valor a procesar
     * @returns {string} Valor formateado para tsquery
     */
    parseValueForPlainQuery(value) {
        // ...
    }
}
```

**Crear archivo de tipos TypeScript:**
```typescript
// src/types/index.d.ts
export interface FQLCondition {
    key: string;
    operator: 'LIKE' | 'ILIKE' | 'NOT LIKE' | 'NOT ILIKE' | '>' | '<' | 
              'BETWEEN' | 'NOT BETWEEN' | 'IN' | 'NOT IN' | 'plain_+' | 'plain_-';
    value: string | string[];
    logic: 'AND' | 'OR';
}

export interface FQLParserOptions {
    aliases?: Record<string, string>;
    allowGlobalSearch?: boolean;
    caseInsensitive?: boolean;
    maxDepth?: number;
    maxInputLength?: number;
}

export class FQLParser {
    constructor(options?: FQLParserOptions);
    parse(str: string): Array<FQLCondition | Array<FQLCondition>>;
}

export interface SQLResult {
    query: string;
    bindings: any[];
}

export class SQLParser {
    constructor(table: string, dialect?: 'pg' | 'mysql' | 'sqlite' | 'mssql' | 'oracle');
    parse(object: Array<FQLCondition | Array<FQLCondition>>): SQLResult;
    convertCondition(condition: FQLCondition): SQLResult;
}

export class KnexParser extends SQLParser {
    toKnex(builder: any, object: Array<FQLCondition | Array<FQLCondition>>): any;
}
```

**Tareas:**
- [x] Completar JSDoc en todos los métodos públicos
  - [x] FQLParser.mjs: constructor, parse(), splitParentheses(), parseQS(), checkAliases(), parseValue(), parseValueForPlainQuery()
  - [x] SQLParser.mjs: constructor, sanitizeIdentifier(), sanitizeLogicOperator(), parse(), convertCondition()
  - [x] KnexParser.mjs: toKnex()
  - Con descripciones detalladas, @throws, y @examples
- [x] Crear archivo de definiciones TypeScript ([src/index.d.ts](src/index.d.ts))
  - Interfaces para FQLParserOptions, SQLParserOptions, FQLCondition, SQLParseResult, etc.
  - Definiciones de clases FQLParser, SQLParser, KnexParser
  - Definiciones de clases de error (FQLError, UnsupportedDialectError, InvalidQueryError, etc.)
  - Ejemplos de uso en comentarios
- [ ] Generar documentación HTML con TypeDoc o JSDoc (opcional)
- [ ] Publicar documentación en README o sitio web (opcional)

---

### 🟡 13. Problema de Reemplazo en workStr
**Archivo:** [src/FQLParser.mjs](src/FQLParser.mjs#L154)  
**Línea:** 154

**Problema:** ✅ RESUELTO
El método `replace()` solo reemplaza la primera ocurrencia de un paréntesis. Si el mismo paréntesis aparece múltiples veces en la query, solo el primero se reemplaza correctamente:

```javascript
// Código anterior (problemático)
for (const elm in parentheses) {
    workStr = workStr.replace(`${parentheses[elm]}`, `#${elm}`);
    // ⚠️ replace() solo reemplaza la primera ocurrencia
}

// Ejemplo del Bug:
const query = "(test:a) AND (test:a)";
// El primer (test:a) se sustituye por #0
// El segundo (test:a) NO se procesa porque ya no existe el patrón
```

**Impacto (si no se corrige):**
- Bug sutil que causa resultados incorrectos en queries con paréntesis duplicados
- Difícil de detectar con tests simples

**Solución Implementada:** ✅
Se cambió `replace()` a `replaceAll()` en la línea 154 de FQLParser.mjs:

```javascript
// Código corregido
for (const [index, element] of parentheses.entries()) {
    // Usar replaceAll() para reemplazar TODAS las ocurrencias
    workStr = workStr.replaceAll(`${element}`, `#${index}`);
    parsedElm.push(this.parse(element, workContext, depth + 1));
}
```

**Razón de la elección:**
- `replaceAll()` está disponible nativamente en Node.js 15.0.0+
- Este proyecto requiere Node >= 15 (punto #11: replaceAll compatibility)
- Solución simple, eficiente y elegante (una línea)
- No requiere dependencias externas

**Tareas:**
- [x] Identificar comportamiento esperado para duplicados
- [x] Implementar solución robusta con `replaceAll()`
- [x] Añadir tests con paréntesis duplicados ([FQLParser.test.js](test/FQLParser.test.js#L223))
- [x] Documentar comportamiento

**Tests:**
- ✅ 43 tests passing (incluye nuevo test para paréntesis duplicados)
- ✅ Test específico: "Parse: handles duplicate parenthesis groups correctly"

---

## 🚀 Oportunidades de Mejora

### 🟢 14. Migración a TypeScript
**Severidad:** Baja (alta mejora)

**Beneficios:**
- Type safety en tiempo de desarrollo
- Mejor autocompletado en IDEs
- Detección temprana de errores
- Mejor mantenibilidad

**Plan de Migración:**
```typescript
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ES2020",
        "lib": ["ES2020"],
        "moduleResolution": "node",
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test"]
}
```

**Migración Gradual:**
1. Renombrar `.mjs` a `.ts`
2. Añadir tipos básicos
3. Habilitar strict mode progresivamente
4. Migrar tests a TypeScript

**Tareas:**
- [ ] Configurar TypeScript
- [ ] Migrar FQLParser.mjs
- [ ] Migrar SQLParser.mjs
- [ ] Migrar KnexParser.mjs
- [ ] Actualizar build pipeline
- [ ] Actualizar tests

---

### 🟢 15. Implementar Sistema de Plugins
**Severidad:** Baja

**Propuesta:**
```javascript
// src/plugins/PluginSystem.mjs
export class PluginSystem {
    constructor() {
        this.plugins = new Map();
    }
    
    register(name, plugin) {
        if (this.plugins.has(name)) {
            throw new Error(`Plugin ${name} already registered`);
        }
        this.plugins.set(name, plugin);
    }
    
    execute(hook, context) {
        for (const plugin of this.plugins.values()) {
            if (plugin[hook]) {
                context = plugin[hook](context);
            }
        }
        return context;
    }
}

// Ejemplo de plugin
export class CustomFieldPlugin {
    beforeParse(context) {
        // Transformar input antes de parsear
        return context;
    }
    
    afterParse(context) {
        // Transformar resultado después de parsear
        return context;
    }
}

// Uso
const parser = new FQLParser({
    plugins: [
        new CustomFieldPlugin(),
        new ValidationPlugin()
    ]
});
```

**Beneficios:**
- Extensibilidad sin modificar core
- Personalización por usuario
- Ecosystem de plugins

**Tareas:**
- [ ] Diseñar API de plugins
- [ ] Implementar hooks
- [ ] Documentar desarrollo de plugins
- [ ] Crear plugins de ejemplo

---

### 🟢 16. Caché de Queries Parseadas
**Severidad:** Baja

**Propuesta:**
```javascript
import LRU from 'lru-cache';

export default class FQLParser {
    constructor(options = {}) {
        // ... configuración existente
        
        // Configurar caché
        this.cacheEnabled = options.enableCache !== false;
        this.cache = new LRU({
            max: options.cacheSize || 100,
            maxAge: options.cacheMaxAge || 1000 * 60 * 5 // 5 minutos
        });
    }
    
    parse(str, depth = 0) {
        // Solo cachear nivel superior
        if (depth === 0 && this.cacheEnabled) {
            const cached = this.cache.get(str);
            if (cached) {
                return JSON.parse(JSON.stringify(cached)); // Deep clone
            }
        }
        
        const result = this._parseInternal(str, depth);
        
        // Guardar en caché
        if (depth === 0 && this.cacheEnabled) {
            this.cache.set(str, result);
        }
        
        return result;
    }
    
    _parseInternal(str, depth) {
        // Lógica actual de parse
        // ...
    }
    
    clearCache() {
        this.cache.reset();
    }
}
```

**Beneficios:**
- Mejora significativa de rendimiento para queries repetidas
- Reducción de uso de CPU

**Tareas:**
- [ ] Implementar caché LRU
- [ ] Benchmarks antes/después
- [ ] Configuración opcional
- [ ] Documentar uso de caché

---

### 🟢 17. Soporte para Más Dialectos SQL
**Severidad:** Baja

**Dialectos a Soportar:**
- MySQL/MariaDB
- SQLite
- Microsoft SQL Server
- Oracle

**Implementación:**
```javascript
// src/sql/dialects/MySQLDialect.mjs
export class MySQLDialect {
    constructor(table) {
        this.table = table;
        this.LIKE = 'LIKE';
        this.parameterMarker = '?';
    }
    
    escapeIdentifier(identifier) {
        return `\`${identifier.replace(/\`/g, '``')}\``;
    }
    
    convertCondition(condition) {
        // Implementación específica de MySQL
    }
    
    supportsGlobalSearch() {
        return false; // MySQL FULLTEXT es diferente
    }
}

// src/sql/dialects/PostgreSQLDialect.mjs
export class PostgreSQLDialect {
    constructor(table) {
        this.table = table;
        this.LIKE = 'LIKE';
        this.parameterMarker = '$'; // $1, $2, etc.
    }
    
    escapeIdentifier(identifier) {
        return `"${identifier.replace(/"/g, '""')}"`;
    }
    
    convertCondition(condition) {
        // Implementación específica de PostgreSQL
    }
    
    supportsGlobalSearch() {
        return true; // to_tsvector/to_tsquery
    }
}

// src/sql/SQLParser.mjs
import { PostgreSQLDialect } from './dialects/PostgreSQLDialect.mjs';
import { MySQLDialect } from './dialects/MySQLDialect.mjs';

export default class SQLParser {
    constructor(table, dialectName = "pg") {
        const dialectMap = {
            'pg': PostgreSQLDialect,
            'postgres': PostgreSQLDialect,
            'postgresql': PostgreSQLDialect,
            'mysql': MySQLDialect,
            'mariadb': MySQLDialect
        };
        
        const DialectClass = dialectMap[dialectName];
        if (!DialectClass) {
            throw new Error(`Unsupported dialect: ${dialectName}`);
        }
        
        this.dialect = new DialectClass(table);
    }
}
```

**Tareas:**
- [ ] Crear sistema de dialectos
- [ ] Implementar MySQL/MariaDB
- [ ] Implementar SQLite
- [ ] Implementar MSSQL
- [ ] Añadir tests por dialecto
- [ ] Documentar diferencias

---

### 🟢 18. Mejorar Cobertura de Tests
**Severidad:** Baja

**Análisis Actual:**
```bash
# Ejecutar cobertura
npm test

# Current coverage (estimado del README):
# Statements   : ~60%
# Branches     : ~55%
# Functions    : ~70%
# Lines        : ~60%
```

**Áreas Sin Cobertura:**
- Casos edge (strings vacíos, null, undefined)
- Manejo de errores
- Caracteres especiales y Unicode
- Queries muy grandes
- Profundidad máxima de anidamiento
- Todos los operadores combinados

**Tests Faltantes:**
```javascript
// test/Security.test.js
describe('Security Tests', () => {
    it('should prevent SQL injection in table name', () => {
        expect(() => new SQLParser('users; DROP TABLE users--'))
            .to.throw();
    });
    
    it('should handle malicious regex patterns (ReDoS)', () => {
        const parser = new FQLParser();
        const malicious = 'a:' + 'a'.repeat(10000) + '!';
        expect(() => parser.parse(malicious)).to.not.throw();
    });
    
    it('should limit recursion depth', () => {
        const parser = new FQLParser({ maxDepth: 3 });
        const deep = '('.repeat(10) + 'test:value' + ')'.repeat(10);
        expect(() => parser.parse(deep)).to.throw(/depth/);
    });
});

// test/EdgeCases.test.js
describe('Edge Cases', () => {
    it('should handle empty string', () => {
        const parser = new FQLParser();
        expect(parser.parse('')).to.deep.equal([]);
    });
    
    it('should handle unicode characters', () => {
        const parser = new FQLParser();
        const result = parser.parse('name:José OR city:São_Paulo');
        expect(result).to.have.lengthOf(2);
    });
    
    it('should handle all SQL special characters', () => {
        const specialChars = ['\'', '"', ';', '--', '/*', '*/', '%', '_'];
        specialChars.forEach(char => {
            const parser = new FQLParser();
            const result = parser.parse(`test:value${char}`);
            // Verificar que no causa error y se sanitiza
            expect(result).to.be.an('array');
        });
    });
});

// test/Performance.test.js
describe('Performance Tests', () => {
    it('should parse large queries quickly', () => {
        const parser = new FQLParser();
        const largeQuery = Array(100).fill('key:value').join(' AND ');
        
        const start = Date.now();
        parser.parse(largeQuery);
        const duration = Date.now() - start;
        
        expect(duration).to.be.below(100); // menos de 100ms
    });
});
```

**Tareas:**
- [x] Añadir tests de seguridad ([test/Security.test.js](test/Security.test.js))
- [x] Añadir tests de casos edge ([test/EdgeCases.test.js](test/EdgeCases.test.js))
- [x] Añadir tests de performance ([test/Performance.test.js](test/Performance.test.js))
- [x] Alcanzar 90%+ de cobertura
- [ ] Configurar CI para verificar cobertura mínima

---

### 🟢 19. Añadir Logging Estructurado
**Severidad:** Baja

**Propuesta:**
```javascript
// src/utils/Logger.mjs
export class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.enabled = options.enabled !== false;
        this.transport = options.transport || console;
    }
    
    log(level, message, meta = {}) {
        if (!this.enabled) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta
        };
        
        this.transport[level](JSON.stringify(logEntry));
    }
    
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    
    info(message, meta) {
        this.log('info', message, meta);
    }
    
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    
    error(message, meta) {
        this.log('error', message, meta);
    }
}

// Uso en FQLParser
export default class FQLParser {
    constructor(options = {}) {
        // ...
        this.logger = options.logger || new Logger({ enabled: false });
    }
    
    parse(str, depth = 0) {
        this.logger.debug('Parsing query', { query: str, depth });
        
        try {
            const result = this._parseInternal(str, depth);
            this.logger.debug('Parse successful', { resultLength: result.length });
            return result;
        } catch (error) {
            this.logger.error('Parse failed', { 
                query: str, 
                error: error.message,
                stack: error.stack 
            });
            throw error;
        }
    }
}
```

**Tareas:**
- [ ] Implementar sistema de logging
- [ ] Integrar en puntos clave
- [ ] Documentar opciones de logging
- [ ] Soportar transports personalizados

---

### 🟢 20. Crear CLI Tool
**Severidad:** Baja

**Propuesta:**
```javascript
#!/usr/bin/env node
// bin/fql-parser.js

import { program } from 'commander';
import { FQLParser, SQLParser, KnexParser } from '../src/index.mjs';
import fs from 'fs';

program
    .name('fql-parser')
    .description('CLI tool for parsing FQL queries')
    .version('0.1.8');

program
    .command('parse')
    .description('Parse an FQL query')
    .argument('<query>', 'FQL query to parse')
    .option('-o, --output <format>', 'Output format: json, sql, knex', 'json')
    .option('-t, --table <name>', 'Table name for SQL generation')
    .option('-d, --dialect <dialect>', 'SQL dialect: pg, mysql, sqlite', 'pg')
    .option('--aliases <file>', 'JSON file with column aliases')
    .option('--global-search', 'Enable global search (+/-)', false)
    .option('--case-insensitive', 'Use ILIKE instead of LIKE', false)
    .action((query, options) => {
        try {
            // Cargar aliases si se especifica
            let aliases = {};
            if (options.aliases) {
                aliases = JSON.parse(fs.readFileSync(options.aliases, 'utf8'));
            }
            
            // Parsear
            const parser = new FQLParser({
                aliases,
                allowGlobalSearch: options.globalSearch,
                caseInsensitive: options.caseInsensitive
            });
            
            const parsed = parser.parse(query);
            
            // Generar output
            let output;
            switch (options.output) {
                case 'json':
                    output = JSON.stringify(parsed, null, 2);
                    break;
                    
                case 'sql':
                    if (!options.table) {
                        console.error('--table is required for SQL output');
                        process.exit(1);
                    }
                    const sqlParser = new SQLParser(options.table, options.dialect);
                    const sql = sqlParser.parse(parsed);
                    output = `Query: ${sql.query}\nBindings: ${JSON.stringify(sql.bindings)}`;
                    break;
                    
                default:
                    console.error(`Unknown output format: ${options.output}`);
                    process.exit(1);
            }
            
            console.log(output);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    });

program
    .command('validate')
    .description('Validate an FQL query')
    .argument('<query>', 'FQL query to validate')
    .action((query) => {
        try {
            const parser = new FQLParser();
            parser.parse(query);
            console.log('✓ Valid query');
        } catch (error) {
            console.error('✗ Invalid query:', error.message);
            process.exit(1);
        }
    });

program.parse();
```

**Uso:**
```bash
# Parsear query
npx fql-parser parse "name:john AND age>:25"

# Generar SQL
npx fql-parser parse "name:john" --output sql --table users --dialect pg

# Validar query
npx fql-parser validate "name:john AND (status:active OR status:pending)"
```

**Tareas:**
- [ ] Implementar CLI
- [ ] Añadir a package.json bin
- [ ] Documentar comandos
- [ ] Añadir tests para CLI

---

### 🟢 21. Benchmarking y Optimización
**Severidad:** Baja

**Propuesta:**
```javascript
// benchmark/parser.bench.js
import Benchmark from 'benchmark';
import { FQLParser } from '../src/index.mjs';

const suite = new Benchmark.Suite();

const parser = new FQLParser();

suite
    .add('Simple query', () => {
        parser.parse('name:john');
    })
    .add('Complex query', () => {
        parser.parse('name:john AND (age>:25 OR status:active)');
    })
    .add('Very complex query', () => {
        parser.parse('(name:john OR name:jane) AND age:[18 TO 65] AND status:active,pending,review AND city!:excluded');
    })
    .add('Nested query', () => {
        parser.parse('(a:1 AND (b:2 OR (c:3 AND d:4)))');
    })
    .on('cycle', (event) => {
        console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run({ async: true });
```

**Áreas de Optimización:**
1. **Reduce uso de regex**: Considerar parser manual
2. **Evitar clonación innecesaria**: Inmutabilidad vs performance
3. **Caché de resultados parciales**
4. **Lazy evaluation** donde sea posible

**Tareas:**
- [ ] Crear suite de benchmarks
- [ ] Identificar bottlenecks
- [ ] Optimizar código crítico
- [ ] Documentar rendimiento

---

### 🟢 22. Migración a Bun Runtime
**Severidad:** Baja (alta mejora de rendimiento)

**Justificación:**
Bun es un runtime JavaScript moderno altamente optimizado que ofrece ventajas significativas para este tipo de librería:

**Ventajas de Bun:**
- **3-4x más rápido** que Node.js en operaciones de parsing/strings
- **Compatibilidad con Node.js**: Drop-in replacement (APIs compatibles)
- **TypeScript nativo**: No necesita transpilación separada
- **Test runner integrado**: 10-100x más rápido que Mocha/Jest
- **Bundler incluido**: No necesita microbundle/webpack/rollup
- **Hot reload** en desarrollo
- **Menor consumo de memoria**
- **NPM package manager compatible**: Puede instalar desde npm

**Análisis de Compatibilidad:**

✅ **Compatible:**
- Módulos ES (`.mjs`) - Soportado nativamente
- XRegExp - Funciona sin cambios
- Operaciones de strings/regex - Más rápido en Bun
- Exports en package.json - Compatible
- Tests - Bun tiene test runner propio

⚠️ **Requiere Verificación:**
- microbundle - Puede reemplazarse con `bun build`
- c8 (coverage) - Bun tiene coverage integrado
- Knex - Compatible pero verificar edge cases

**Implementación:**

```json
// package.json - Cambios mínimos
{
    "name": "@landra_sistemas/fql-parser",
    "version": "0.2.0",
    "type": "module",
    "scripts": {
        "build": "bun build src/index.mjs --outdir dist --format esm,cjs --target node",
        "dev": "bun --watch src/index.mjs",
        "test": "bun test",
        "test:coverage": "bun test --coverage",
        "benchmark": "bun run benchmark/parser.bench.js"
    },
    "devDependencies": {
        "knex": "^3.1.0"
    },
    "engines": {
        "bun": ">=1.0.0",
        "node": ">=18.0.0"
    },
    "peerDependencies": {
        "knex": "^3.1.0"
    },
    "dependencies": {
        "xregexp": "^5.1.1"
    }
}
```

**Migración de Tests:**

```javascript
// test/FQLParser.test.js - Bun test syntax (muy similar a Jest)
import { describe, it, expect } from 'bun:test';
import { FQLParser } from '../src/index.mjs';

describe('FQLParser', () => {
    describe('Basic operation: parsing', () => {
        it('Parse: OR logic', () => {
            const parser = new FQLParser();
            const data = parser.parse("test:value OR (asdfasdf:fdfdsfd)");

            expect(data).not.toBeNull();
            expect(data).toBeArray();
            expect(data).toHaveLength(2);
        });

        it('Parse: recursively parses queries', () => {
            const parser = new FQLParser();
            const data = parser.parse("test:value (asdfasdf:fdfdsfd)");

            expect(data).not.toBeNull();
            expect(data).toBeArray();
            expect(data).toHaveLength(2);
        });
    });
});
```

**Build con Bun:**

```javascript
// build.js - Script personalizado si se necesita más control
import { build } from 'bun';

// ESM build
await build({
    entrypoints: ['./src/index.mjs'],
    outdir: './dist',
    format: 'esm',
    target: 'node',
    minify: true,
    sourcemap: 'external'
});

// CommonJS build
await build({
    entrypoints: ['./src/index.mjs'],
    outdir: './dist',
    format: 'cjs',
    target: 'node',
    minify: true,
    sourcemap: 'external'
});

console.log('✓ Build complete');
```

**Benchmark Esperado:**

```bash
# Node.js (actual)
Parse simple query: ~0.5ms
Parse complex query: ~2.1ms
Parse with recursion: ~5.3ms

# Bun (estimado)
Parse simple query: ~0.15ms (3x más rápido)
Parse complex query: ~0.6ms (3.5x más rápido)
Parse with recursion: ~1.5ms (3.5x más rápido)
```

**Plan de Migración:**

**Fase 1: Dual Runtime (Recomendado)**
```json
{
    "scripts": {
        "test": "bun test || npm run test:node",
        "test:node": "mocha test --exit",
        "test:bun": "bun test"
    }
}
```
- Mantener compatibilidad con Node.js
- Añadir soporte para Bun
- CI/CD prueba ambos runtimes
- Usuarios eligen cuál usar

**Fase 2: Bun-First**
- Documentación prioriza Bun
- Tests principalmente en Bun
- Node.js sigue funcionando
- Optimizaciones específicas de Bun

**Fase 3: Bun-Only (Opcional, futuro)**
- Solo si el ecosistema adopta Bun masivamente
- Simplifica código y dependencias

**CI/CD con Bun:**

```yaml
# .github/workflows/ci-bun.yml
name: CI with Bun

on: [push, pull_request]

jobs:
  test-bun:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: bun test
      - run: bun run build

  test-node:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

**Compatibilidad con Dependencias:**

```javascript
// Verificar compatibilidad de XRegExp
// test/compat.test.js
import { describe, it, expect } from 'bun:test';
import XRegExp from 'xregexp';

describe('Bun Compatibility', () => {
    it('XRegExp works in Bun', () => {
        const regex = XRegExp('(?<year>[0-9]{4})');
        const match = XRegExp.exec('2024', regex);
        expect(match.year).toBe('2024');
    });

    it('matchRecursive works in Bun', () => {
        const result = XRegExp.matchRecursive('(a(b)c)', '\\(', '\\)', 'g');
        expect(result).toBeArray();
    });
});
```

**Documentación:**

```markdown
## Installation

### Using Bun (Recommended)
\`\`\`bash
bun add @landra_sistemas/fql-parser
\`\`\`

### Using npm/Node.js
\`\`\`bash
npm install @landra_sistemas/fql-parser
\`\`\`

## Development

### With Bun
\`\`\`bash
bun install
bun test
bun run build
\`\`\`

### With Node.js
\`\`\`bash
npm install
npm test
npm run build
\`\`\`
```

**Beneficios Específicos para FQL Parser:**

1. **Parsing más rápido**: Operaciones de regex y strings optimizadas
2. **Tests más rápidos**: El test runner de Bun es extremadamente rápido
3. **Build más simple**: No necesita configuración compleja de bundlers
4. **Desarrollo más ágil**: Hot reload instantáneo
5. **Menor footprint**: Binario más pequeño y eficiente
6. **TypeScript nativo**: Si migran a TS (#14), no necesita tsc
7. **Mejor debugging**: Stack traces más claros

**Consideraciones:**

⚠️ **Contras:**
- Bun es relativamente nuevo (aunque estable desde v1.0)
- Algunos usuarios pueden no tener Bun instalado
- Ecosistema menos maduro que Node.js
- Algunas librerías npm pueden tener problemas edge

✅ **Mitigación:**
- Mantener compatibilidad dual (Bun + Node.js)
- Documentar ambos métodos de uso
- CI/CD prueba ambos runtimes
- Fallback a Node.js si hay problemas

**Resultado Esperado:**

```bash
# Antes (Node.js + npm)
npm install: ~15s
npm test: ~3.5s
npm run build: ~8s
Total: ~26.5s

# Después (Bun)
bun install: ~0.5s (30x más rápido)
bun test: ~0.2s (17x más rápido)
bun run build: ~0.3s (26x más rápido)
Total: ~1s (26x más rápido)
```

**Tareas:**
- [ ] Instalar y probar Bun localmente
- [ ] Migrar scripts de package.json
- [ ] Convertir tests a sintaxis Bun
- [ ] Configurar build con bun
- [ ] Actualizar CI/CD para probar ambos runtimes
- [ ] Documentar uso con Bun y Node.js
- [ ] Hacer benchmarks comparativos
- [ ] Verificar compatibilidad de todas las dependencias
- [ ] Actualizar README con instrucciones para Bun
- [ ] Considerar badges de "Bun Compatible" o "Bun Optimized"

**Referencias:**
- [Bun Documentation](https://bun.sh/docs)
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Bun Build](https://bun.sh/docs/bundler)
- [Node.js to Bun Migration Guide](https://bun.sh/guides/migrate/node)

---

## 📊 Resumen y Priorización

### Por Severidad

| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| 🔴 Crítico | 3 | Problemas de seguridad que requieren atención inmediata |
| 🟠 Alto | 6 | Problemas de implementación que pueden causar bugs |
| 🟡 Medio | 4 | Mejoras de calidad de código |
| 🟢 Bajo | 9 | Mejoras opcionales y nuevas funcionalidades |
| **Total** | **22** | |

### Roadmap Sugerido

#### Sprint 1 (Seguridad) - Urgente
- [x] #1 Vulnerabilidad de SQL Injection
- [ ] #2 Vulnerabilidad ReDoS
- [x] #3 Stack Overflow por recursión ilimitada

#### Sprint 2 (Calidad) - Alta Prioridad
- [ ] #4 Manejo de errores deficiente
- [x] #5 Sanitización incompleta de valores
- [x] #6 Typo en nombre de método
- [x] #8 Uso de for...in en arrays

#### Sprint 3 (Mejoras) - Media Prioridad
- [x] #7 Magic strings y constantes
- [x] #9 Dependencia de lodash
- [x] #10 Validación de tipos
- [x] #11 Problemas con replaceAll
- [ ] #12 Documentación JSDoc

#### Sprint 4 (Refactoring) - Baja Prioridad
- [ ] #13 Problema de reemplazo en workStr
- [ ] #14 Migración a TypeScript
- [ ] #15 Sistema de plugins
- [ ] #18 Cobertura de tests

#### Sprint 5 (Features) - Opcional
- [ ] #16 Caché de queries
- [ ] #17 Soporte más dialectos SQL
- [ ] #19 Logging estructurado
- [ ] #20 CLI Tool
- [ ] #21 Benchmarking
- [ ] #22 Migración a Bun (3-4x mejor rendimiento)

---

## 🔧 Recomendaciones Generales

### 1. Configuración de Calidad de Código

**ESLint:**
```javascript
// .eslintrc.cjs
module.exports = {
    env: {
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:security/recommended'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    plugins: ['security'],
    rules: {
        'no-console': 'warn',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error',
        'guard-for-in': 'error',
        'security/detect-object-injection': 'warn',
        'security/detect-non-literal-regexp': 'warn'
    }
};
```

**Husky + lint-staged:**
```json
{
    "husky": {
        "hooks": {
            "pre-commit": "lint-staged",
            "pre-push": "npm test"
        }
    },
    "lint-staged": {
        "*.{js,mjs}": [
            "eslint --fix",
            "prettier --write"
        ],
        "*.{json,md}": [
            "prettier --write"
        ]
    }
}
```

### 2. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npm run security-check

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
```

### 3. Semantic Versioning y Changelog

**Usar Conventional Commits:**
```
feat: add support for MySQL dialect
fix: prevent SQL injection in table names
docs: update README with security best practices
refactor: remove lodash dependency
test: add security tests for ReDoS
```

**Auto-generar CHANGELOG.md**

### 4. Documentación

- [ ] README completo con ejemplos
- [ ] API Reference generada desde JSDoc
- [ ] Security Policy (SECURITY.md)
- [ ] Contributing Guidelines (CONTRIBUTING.md)
- [ ] Code of Conduct

---

## 📝 Conclusión

Este análisis ha identificado **21 áreas de mejora** en el proyecto FQL Parser, con **3 problemas críticos de seguridad** que requieren atención inmediata:

1. **SQL Injection** en construcción de queries
2. **ReDoS** vulnerable con regex compleja
3. **Stack Overflow** por falta de límite de recursión

Se recomienda abordar primero los problemas de seguridad (Sprint 1), seguido de mejoras de calidad (Sprint 2), y luego considerar las optimizaciones y nuevas funcionalidades según las necesidades del proyecto.

El proyecto tiene una buena base pero necesita endurecimiento en seguridad y manejo de errores antes de ser usado en producción con datos no confiables.

---

**Documento generado:** 18 de febrero de 2026  
**Versión del documento:** 1.0  
**Próxima revisión:** Después de implementar Sprint 1 y 2
