import SQLParser from "./SQLParser.mjs";

export default class KnexParser extends SQLParser {

    /**
     * Convierte condiciones FQL a query Knex.js usando whereRaw
     * 
     * Integración con Knex.js query builder. Parsea las condiciones y las
     * ejecuta como whereRaw para máxima flexibilidad.
     * 
     * @param {object} builder - Builder de Knex.js (resultado de db.select(), table(), etc.)
     * @param {Array<FQLCondition|Array<FQLCondition>>} object - Condiciones parseadas por FQLParser
     * @returns {object} Builder de Knex.js para encadenamiento
     * 
     * @example
     * const knex = require('knex')({ client: 'pg' });
     * const parser = new KnexParser('users', 'pg');
     * const fqlParser = new FQLParser();
     * 
     * const conditions = fqlParser.parse('name:john AND age>:25');
     * const query = knex
     *   .select('*')
     *   .from('users');
     * 
     * parser.toKnex(query, conditions);
     * // query.toSQL():
     * // { sql: 'select * from "users" where "name" LIKE ? and "age" > ?',
     * //   bindings: ['john', 25] }
     */
    toKnex(builder, object) {
        const parsed = this.parse(object);
        return builder.whereRaw(parsed.query, parsed.bindings);
    }
}