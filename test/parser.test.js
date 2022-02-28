import { expect } from 'chai'
import { QStringParser } from '../src'

describe('parser', () => {
    describe('Basic operation: parsing', () => {

        it('Parse: OR logic', () => {

            const parser = new QStringParser();

            const data = parser.parse("test:value OR (asdfasdf:fdfdsfd)")

            console.log(data);

        })

        it('Parse: recursively parses queries', () => {

            const parser = new QStringParser();

            const data = parser.parse("test:value (asdfasdf:fdfdsfd)")

            console.log(data);

        })

        it('Parse: Complex recursive parsing (no globalSearch)', () => {

            const parser = new QStringParser();

            const data = parser.parse("test:value (asdfasdf:fdfdsfd AND (test:test OR a!:b)) +test")

            console.log(JSON.stringify(data));

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);
        })

        it('Parse: Complex recursive parsing (with globalSearch)', () => {

            const parser = new QStringParser({ allowGlobalSearch: true });

            const data = parser.parse("test:value (asdfasdf:fdfdsfd AND (test:test OR a!:b)) -test")

            console.log(JSON.stringify(data));

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(3);
        })
    })
    describe('Utils', () => {
        it('Split Parentheses', () => {

            const parser = new QStringParser();
            const data = parser.splitPatentheses("(test:asdf ) AND (+asdfasdf) asdfasdfasdf asdfasdf (fdfdfd (fdsaf (adfasdf )))")

            console.log(data)

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(3);

        })
        it('ParseQS: Apply regex on simple query', () => {

            const parser = new QStringParser();

            const data = parser.parseQS("test:value")

            console.log(data);

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(1);
            expect(data[0]).to.have.property('key');
            expect(data[0].key).to.be.eq('test');


        })
    })
})

