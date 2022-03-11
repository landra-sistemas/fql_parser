import BaseSQLParser from "./BaseSQLParser.mjs";

export class PlainSQLParser extends BaseSQLParser {


    /**
     * 
     * @param condition 
     * @returns 
     */
    convertCondition(condition) {
        if (!condition.key) {
            console.warn('PlainSQL doest not support global searching');
            return "";
        }

        let { key, operator, value, logic } = condition;

        //TODO check value has ""

        let binding = "?";
        let parsedValue = [value];

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