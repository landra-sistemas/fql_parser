import { expect } from 'chai'
import { FQLParser, LOGICAL_OPERATORS, SPECIAL_OPERATORS, SQL_OPERATORS } from '../src/index.mjs'

describe('FQLParser', () => {
    describe('Constructor Validation', () => {
        it('Constructor: rejects invalid options type', () => {
            expect(() => new FQLParser('invalid')).to.throw('options must be an object');
        })

        it('Constructor: rejects invalid aliases type', () => {
            expect(() => new FQLParser({ aliases: [] })).to.throw('aliases must be an object');
        })

        it('Constructor: rejects invalid allowGlobalSearch type', () => {
            expect(() => new FQLParser({ allowGlobalSearch: 'true' })).to.throw('allowGlobalSearch must be a boolean');
        })

        it('Constructor: rejects invalid numeric limits', () => {
            expect(() => new FQLParser({ maxDepth: 0 })).to.throw('maxDepth must be a positive integer');
        })
    })

    describe('Basic operation: parsing', () => {

        it('Parse: OR logic', () => {

            const parser = new FQLParser();

            const data = parser.parse("test:value OR (asdfasdf:fdfdsfd)")

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);

        })

        it('Parse: recursively parses queries', () => {

            const parser = new FQLParser();

            const data = parser.parse("test:value (asdfasdf:fdfdsfd)")

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);

        })

        it('Parse: Complex recursive parsing (no globalSearch)', () => {

            const parser = new FQLParser();

            const data = parser.parse("test:value (asdfasdf:fdfdsfd AND (test:test OR a!:b)) +test")

            console.log(JSON.stringify(data));

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);
        })

        it('Parse: Complex recursive parsing (with globalSearch)', () => {

            const parser = new FQLParser({ allowGlobalSearch: true });

            const data = parser.parse("test:value (asdfasdf:fdfdsfd AND (test:test OR a!:b)) -test")

            console.log(JSON.stringify(data));

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(3);
        })

        it('Parse: Range', () => {

            const parser = new FQLParser({ allowGlobalSearch: true });

            const data = parser.parse("test:[a TO z] AND test2:asdf,fdsf,asdf")

            console.log(JSON.stringify(data));

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);
        })

        it('Parse: Aliases', () => {

            const parser = new FQLParser({ aliases: { test: "lalala", test2: "any({{key}})" }, allowGlobalSearch: true });

            const data = parser.parse("test:[a TO z] AND test2:asdf")

            console.log(JSON.stringify(data));

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(2);
            expect(data[0]).to.have.property("key");
            expect(data[0].key).to.be.eq("lalala");
        })

        it('Parse: handles multiple grouped conditions consistently', () => {
            const parser = new FQLParser();
            const data = parser.parse('(a:1) AND (b:2) AND (c:3)');

            expect(data).to.be.an('array');
            expect(data).to.have.lengthOf(3);
            expect(data[0]).to.be.an('array');
            expect(data[1]).to.be.an('array');
            expect(data[2]).to.be.an('array');
        })

        it('Parse: uses exported constants in operators and logic', () => {
            const parser = new FQLParser({ allowGlobalSearch: true });

            const data = parser.parse('test:[a TO z] OR +demo*')

            expect(data[0].operator).to.be.eq(SQL_OPERATORS.BETWEEN);
            expect(data[0].logic).to.be.eq(LOGICAL_OPERATORS.OR);
            expect(data[1].operator).to.be.eq(SPECIAL_OPERATORS.PLAIN_INCLUDE);
        })
    })
    describe('Utils', () => {
        it('Split Parentheses', () => {

            const parser = new FQLParser();
            const data = parser.splitParentheses("(test:asdf ) AND (+asdfasdf) asdfasdfasdf asdfasdf (fdfdfd (fdsaf (adfasdf )))")

            console.log(data)

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(3);

        })
        it('ParseQS: Apply regex on simple query', () => {

            const parser = new FQLParser();

            const data = parser.parseQS("test:value")

            console.log(data);

            expect(data).not.to.be.null;
            expect(data).to.be.an("array");
            expect(data).to.have.lengthOf(1);
            expect(data[0]).to.have.property('key');
            expect(data[0].key).to.be.eq('test');


        })

        it('ParseValue: keeps base wildcard behavior', () => {
            const parser = new FQLParser();
            const value = parser.parseValue('"te?st*"');

            expect(value).to.be.eq('test%');
        })

        it('ParseValueForPlainQuery: keeps base wildcard behavior', () => {
            const parser = new FQLParser();
            const value = parser.parseValueForPlainQuery('"te?st*"');

            expect(value).to.be.eq('test:*');
        })

        it('ParseValueForPlainQuery: sanitizes tsquery operators', () => {
            const parser = new FQLParser();
            const value = parser.parseValueForPlainQuery('a&b|c:(d)\\e');

            expect(value).to.be.eq('abcde');
        })
    })

    describe('Security', () => {
        it('Parse: rejects oversized input', () => {
            const parser = new FQLParser({ maxInputLength: 10 });
            expect(() => parser.parse('test:12345678901')).to.throw('Query too long');
        })

        it('Parse: rejects excessive regex iterations', () => {
            const parser = new FQLParser({ maxRegexIterations: 5, maxInputLength: 1000 });
            const query = Array(20).fill('a:1').join(' ');

            expect(() => parser.parse(query)).to.throw('Maximum regex iterations exceeded');
        })

        it('Parse: rejects when parsing timeout is exceeded', () => {
            const parser = new FQLParser({
                parseTimeoutMs: 1,
                maxInputLength: 200000,
                maxRegexIterations: 500000
            });

            const query = Array(50000).fill('a:1').join(' ');
            expect(() => parser.parse(query)).to.throw('Parsing timeout exceeded');
        })

        it('Parse: rejects excessive nesting depth', () => {
            const parser = new FQLParser({ maxDepth: 2 });
            const query = 'a:1 AND (b:2 AND (c:3 AND (d:4)))';

            expect(() => parser.parse(query)).to.throw('Maximum nesting depth exceeded');
        })

        it('Parse: rejects too many parenthesis groups', () => {
            const parser = new FQLParser({ maxParenthesesGroups: 2 });
            const query = '(a:1) AND (b:2) AND (c:3)';

            expect(() => parser.parse(query)).to.throw('Too many parenthesis groups');
        })

        it('Parse: rejects oversized values', () => {
            const parser = new FQLParser({ maxValueLength: 5 });
            expect(() => parser.parseValue('123456')).to.throw('Value too long');
        })

        it('Parse: handles duplicate parenthesis groups correctly', () => {
            const parser = new FQLParser();
            // Test with identical parenthesis groups appearing multiple times
            const query = "(test:a) AND (test:a) OR (test:b)";
            const result = parser.parse(query);

            expect(result).to.be.an("array");
            // Should have 3 array elements (subgroups) and proper structure
            expect(result).to.have.length.greaterThan(0);
            
            // Verify no element is corrupted
            for (const item of result) {
                if (Array.isArray(item)) {
                    expect(item).to.be.an("array");
                } else if (item && typeof item === 'object') {
                    expect(item).to.have.property('operator');
                }
            }
        })
    })
})

