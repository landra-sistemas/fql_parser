import Knex from "knex";
import SQLParser from "./SQLParser.mjs";

export default class KnexParser extends SQLParser {

    /**
     * 
     * @param {Knex} builder 
     * @param {object} object 
     */
    toKnex(builder, object) {
        const parsed = this.parse(object);
        return builder.whereRaw(parsed.query, parsed.bindings);
    }
}