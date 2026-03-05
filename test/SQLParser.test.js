import { expect } from 'chai'
import { FQLParser, SQLParser } from '../src/index.mjs'

describe('SQLParser', () => {

    describe('Constructor Validation', () => {
        it('Constructor: rejects invalid table type', () => {
            expect(() => new SQLParser(123)).to.throw('table must be a non-empty string when provided');
        })

        it('Constructor: rejects invalid dialect type', () => {
            expect(() => new SQLParser('users', 123)).to.throw('dialect must be a non-empty string');
        })

        it('Constructor: rejects unsupported dialect', () => {
            expect(() => new SQLParser('users', 'mongo')).to.throw('Unsupported dialect: mongo');
        })
    })

    describe('Parse Simple Query', () => {

        it('Parse: OR logic', () => {

            const parser = new FQLParser();

            const data = parser.parse("test:value OR (asdfasdf:fdfdsfd)")

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);

            const str = new SQLParser().parse(data);

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

            const str = new SQLParser().parse(data);

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

            const str = new SQLParser().parse(data);

            expect(str).to.be.an("object");
            expect(str).to.have.property("query");
            expect(str.query).to.contain("IN");

            console.log(str);

        })

        it('Parse: withQuotes', () => {

            const parser = new FQLParser();

            const data = parser.parse('test:"query larga con espacios"')

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(1);

            const str = new SQLParser().parse(data);

            expect(str).to.be.an("object");
            expect(str).to.have.property("query");
            expect(str.query).to.contain("LIKE");

            console.log(str);

        })

        it('Parse: fulltext', () => {

            const parser = new FQLParser({ allowGlobalSearch: true });

            const data = parser.parse('+testing')

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(1);

            const str = new SQLParser("table").parse(data);

            expect(str).to.be.an("object");
            expect(str).to.have.property("query");
            expect(str.query).to.contain("vector");

            console.log(str);

        })

    })

    describe('Security', () => {

        it('Parse: rejects invalid table names in fulltext queries', () => {

            const parser = new FQLParser({ allowGlobalSearch: true });

            const data = parser.parse('+testing')

            expect(() => new SQLParser('users; DROP TABLE users; --').parse(data)).to.throw('Invalid table name');

        })

        it('Parse: rejects invalid logic operators', () => {

            const parser = new SQLParser('users');

            expect(() => parser.parse([
                {
                    key: 'name',
                    operator: 'LIKE',
                    value: 'john',
                    logic: 'OR 1=1'
                }
            ])).to.throw('Invalid logic operator');

        })

        it('Parse: rejects unknown element types', () => {
            const parser = new SQLParser('users');

            expect(() => parser.parse(['bad-element'])).to.throw('Unknown type detected in qry');
        })

        it('Parse: rejects non array query object', () => {
            const parser = new SQLParser('users');

            expect(() => parser.parse({ key: 'name' })).to.throw('Expected query object array');
        })

        it('Parse: rejects fulltext on unsupported dialect', () => {
            const parser = new SQLParser('users', 'mysql');

            expect(() => parser.parse([
                {
                    operator: 'plain_+',
                    value: 'testing',
                    logic: 'AND'
                }
            ])).to.throw("does not support: global searching");
        })

    })

})

