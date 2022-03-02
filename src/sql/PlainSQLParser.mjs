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

        const { key, operator, value, logic } = condition;

        //TODO check value has [range]
        //TODO check value has ""


        return { query: `${key} ${operator} ? ${logic} `, bindings: [value] }
    }
}