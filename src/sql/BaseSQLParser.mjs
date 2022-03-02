export default class BaseSQLParser {

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
    convertCondition(condition) { }
}