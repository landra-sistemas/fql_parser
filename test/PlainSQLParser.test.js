import { expect } from 'chai'
import { FQLParser } from '../src/index.mjs'
import { PlainSQLParser } from '../src/index.mjs'

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

            expect(str).to.be.an("object");
            expect(str).to.have.property("query");
            expect(str.query).to.contain("OR");

            console.log(str);

        })
        it('Parse: Between', () => {

            const parser = new FQLParser();

            const data = parser.parse("test:[a TO z]")

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(1);

            const sqlparser = new PlainSQLParser();

            const str = sqlparser.parse(data);

            expect(str).to.be.an("object");
            expect(str).to.have.property("query");
            expect(str.query).to.contain("BETWEEN");

            console.log(str);

        })

        it('Parse: IN', () => {

            const parser = new FQLParser();

            const data = parser.parse("test2:asdf,fdsf,asdf")

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(1);

            const sqlparser = new PlainSQLParser();

            const str = sqlparser.parse(data);

            expect(str).to.be.an("object");
            expect(str).to.have.property("query");
            expect(str.query).to.contain("IN");

            console.log(str);

        })

    })

})

