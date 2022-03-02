import { expect } from 'chai'
import { FQLParser } from '../src/index.mjs'
import { PlainSQLParser } from '../src/sql/index.mjs'

describe('PlainSQLParser', () => {

    describe('Parse Simple Query', () => {

        it('Parse: OR logic', () => {

            const parser = new FQLParser();

            const data = parser.parse("test:value OR (asdfasdf:fdfdsfd)")

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);

            const sqlparser = new PlainSQLParser();

            const str = sqlparser.parse(data);

            console.log(str);

        })

    })

})

