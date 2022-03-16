import XRegExp from "xregexp";
import lodash from "lodash";

export default class FQLParser {

    constructor(options) {
        this.aliases = (options && options.aliases) || {};
        this.allowGlobalSearch = (options && options.allowGlobalSearch) || false;
    }
    /**
     * Convierte un string 'key:value' en array de objetos con las siguientes opciones:
     * 
     * - Objeto: { //Condición Básica
     *  "key": "",
     *  "operator": "LIKE|NOT LIKE|>|<|BETWEEN", //Default LIKE
     *  "value": "",
     *  "logic": "OR|AND" //Default AND
     * }
     * 
     * - Array: Agrupación de condiciones, extraída de un (). Dentro del array llevará otros array o objetos condición
     * 
     * @param {*} str 
     * @returns 
     */
    parse = (str) => {
        let parsedElm = [];
        let workStr = str;
        const parentheses = this.splitPatentheses(str);

        if (!lodash.isEmpty(parentheses)) {
            for (const elm in parentheses) {
                //Reemplazar el la query original cada elemento
                workStr = workStr.replace(`${parentheses[elm]}`, `#${elm}`);
                parsedElm.push(this.parse(parentheses[elm]));
            }

        }
        console.log(workStr);

        return this.parseQS(workStr, parsedElm);

    }


    /**
     * Extrae los bloques entre parentesis (solo un nivel).
     * 
     * @param {*} str 
     * @returns 
     */
    splitPatentheses = (str) => {
        const test = XRegExp.matchRecursive(str, '\\(', '\\)', 'g');
        return test;
    }


    /**
     * Aplica una expresión regular para extraer los parámetros de búsqueda:
     * - key: columna
     * - operator: operador búsqueda
     * - value: valor a buscar
     * - logic: operador logico a utilizar
     * - plain: parametro plano adicional (ejemplo +test o -asdfasdf). Necesario activar allowGlobalSearch
     * @param {*} str 
     * @param {*} subgroups 
     * @returns 
     */
    parseQS = (str, subgroups) => {
        const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)(?<operator>:|!:|>:|<:)(?<value>[^\s|"|\[]+|".*?"|\[.*?\]))? ?(?<logic>OR|AND)? ?(?<plain>[\+|\-|\(#][^\s]+|)? ?/gm;
        let m;

        let data = [];
        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            if (m === null) {
                continue;
            }
            let { key, value, operator, plain, logic } = m.groups;

            if (!operator) {
                operator = ":";
            }

            let type = "LIKE";
            switch (operator) {
                case ":":
                default:
                    type = "LIKE";
                    break;
                case "!:":
                    type = "NOT LIKE";
                    break;
                case ">:":
                    type = ">";
                    break;
                case "<:":
                    type = "<";
                    break;
            }
            //Los corchetes marcan rangos con lo que si se detecta se cambia el tipo LIKE a BETWEEN
            if (value && value.match(/\[.*?\]/)) {
                type = type === 'NOT LIKE' ? "NOT BETWEEN" : "BETWEEN";
            }
            //Las comas implican varios valores con lo que si se detectan se cambia el tipo LIKE a IN
            if (value && value.indexOf(',') !== -1) {
                type = type === 'NOT LIKE' ? "NOT IN" : "IN";
            }

            if (key) {
                data.push({
                    key: this.checkAliases(key),
                    operator: type,
                    value: value,
                    logic: logic || "AND"
                });
            }
            // Gestion para añadir los indices de los subgrupos
            if (plain && plain.indexOf('#') !== -1) {
                const index = plain.replace(/#|\(|\)/g, '');
                data.push(subgroups[parseInt(index)]);
            } else if (this.allowGlobalSearch && plain && plain.indexOf('#') === -1) {
                // Añadir las busquedas plain en caso de estar activadas.
                let op = "plain_+";
                if (plain.startsWith('-')) {
                    op = "plain_-";
                }
                data.push({
                    operator: op,
                    value: plain.replace(/\+|\-/gm, ''),
                    logic: logic || "AND"
                });
            }
        }
        return data;
    }



    /**
     * 
     * @param key 
     * @returns 
     */
    checkAliases(key) {
        if (!this.aliases) {
            return key;
        }
        if (this.aliases[key]) {
            return this.aliases[key]
        }
        if (this.aliases['*']) {
            return this.aliases['*'].replaceAll("{{key}}", key);
        }
        return key;
    }
}
