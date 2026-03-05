import { expect } from 'chai'
import { FQLParser, SQLParser } from '../src/index.mjs'

describe('Security Tests', () => {
    it('rejects invalid SQL identifiers', () => {
        const parser = new SQLParser('users')
        expect(() => parser.sanitizeIdentifier('users; DROP TABLE users--')).to.throw('Invalid table name')
        expect(() => parser.sanitizeIdentifier('users name')).to.throw('Invalid table name')
    })

    it('rejects fulltext queries without a valid table name', () => {
        const parser = new FQLParser({ allowGlobalSearch: true })
        const data = parser.parse('+testing')
        expect(() => new SQLParser().parse(data)).to.throw('Invalid table name')
    })

    it('sanitizes dangerous operators in plain queries', () => {
        const parser = new FQLParser()
        const input = 'a&b|c!d:(e)\\f -- /* */'
        const sanitized = parser.parseValueForPlainQuery(input)

        expect(sanitized).to.not.include('&')
        expect(sanitized).to.not.include('|')
        expect(sanitized).to.not.include('!')
        expect(sanitized).to.not.include('(')
        expect(sanitized).to.not.include(')')
        expect(sanitized).to.not.include('\\')
        expect(sanitized).to.not.include('--')
        expect(sanitized).to.not.include('/*')
        expect(sanitized).to.not.include('*/')
    })
})
