import { expect } from 'chai'
import { parseQS, splitPatentheses } from '../src'

describe('parser', () => {
    describe('Basic operation: simple parse', () => {
        it('Parses 1 operand', () => {

            const data = parseQS("test:value")

            console.log(data);

        })
    })
    describe('Utils', () => {
        it('Split Parentheses', () => {

            splitPatentheses("(test (asdf) asdfasdf) asdasd")

            

        })
    })
})

