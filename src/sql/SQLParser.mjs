export default class SQLParser {

    constructor(table, dialect = "pg") {
        this.table = table;
        this.dialect = dialect;
    }

    /**
     * Converte una lista de condiciones generada por el FQLParser en una condición String.
     * 
     * Esta clase sirve como base para su extensión aplicando las conversiones necesarias en función del lenguaje a utilizar.
     * 
     * @param {Array} object
     */
    parse(object) {
        let query = "";
        let bindings = [];
        for (let element of object) {
            if (Array.isArray(element)) {
                const { query: subqry, bindings: subbind } = this.parse(element);
                query += `(${subqry})`;
                bindings = [...bindings, ...subbind];
            } else if (typeof element === 'object') {
                const { query: condition, bindings: bind } = this.convertCondition(element);
                query += condition;
                bindings = [...bindings, ...bind];
            } else {
                console.warn('Unknown type detected in qry');
            }
        }
        query = query.replace(/( AND | OR )$/gm, "");
        return { query, bindings }; //Quitar condicion final
    }

    /**
     * Metodo base a ser extendido por los parsers para realizar las conversiones
     * 
     * @param {object} condition 
     */
    convertCondition(condition) {
        let { key, operator, value, logic } = condition;
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

        return { query: `${key} ${operator} ${binding} ${logic} `, bindings: parsedValue }
    }


}