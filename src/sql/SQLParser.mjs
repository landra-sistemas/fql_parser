export default class SQLParser {

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
        if (!condition.key) {
            console.warn('PlainSQL doest not support global searching');
            return "";
        }

        let { key, operator, value, logic } = condition;

        let binding = "?";
        let parsedValue = [value.replaceAll('"', '')]; //Eliminar las dobles comillas

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