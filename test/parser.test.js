import { expect } from 'chai'
import { QStringParser } from '../src'

describe('parser', () => {
    describe('Basic operation: simple parse', () => {
        it('Parses 1 operand', () => {

            const parser = new QStringParser();

            const data = parser.parseQS("test:value OR b:a")

            console.log(data);

        })
        it('Parses recursive', () => {

            const parser = new QStringParser();

            const data = parser.parse("test:value (asdfasdf:fdfdsfd)")

            console.log(data);

        })

        it('Parses multiple recursive', () => {

            const parser = new QStringParser();

            const data = parser.parse("test:value (asdfasdf:fdfdsfd AND (test:test OR a!:b)) +test")

            console.log(JSON.stringify(data));

        })
    })
    describe('Utils', () => {
        it('Split Parentheses', () => {

            const parser = new QStringParser();
            const resp = parser.splitPatentheses("(test:asdf ) AND (+asdfasdf) asdfasdfasdf asdfasdf (fdfdfd (fdsaf (adfasdf )))")

            console.log(resp)
            

        })
    })
})

