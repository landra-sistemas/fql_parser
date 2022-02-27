import XRegExp from "xregexp";
import lodash from "lodash";

export default class QStringParser {

    constructor(options) {
        this.columns = options.columns || [];
        this.allowGlobalSearch = options.allowGlobalSearch || false;
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
        // const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)(?<operator>:|!:|>:|<:)(?<value>[^\s|"]+|".*?"))? ?(?<plain>[\+|-]?[^\s]+|)? ?(?<logic>OR|AND)? ?/gm; // clave:valor clave2!:valor2
        const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)(?<operator>:|!:|>:|<:)(?<value>[^\s|"]+|".*?"))? ?(?<logic>OR|AND)? ?(?<plain>[\+|-|\(#][^\s]+|)? ?/gm; // clave:valor clave2!:valor2
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

            if (key) {
                data.push({
                    key: key,
                    operator: type,
                    value: value,
                    logic: logic || "AND"
                });
            }
            if (plain && plain.indexOf('#') !== -1) {
                const index = plain.replace(/#|\(|\)/g, '');
                data.push(subgroups[parseInt(index)]);
            }
        }
        return data;
    }
}
