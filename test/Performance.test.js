import { expect } from 'chai'
import { FQLParser } from '../src/index.mjs'

describe('Performance Tests', () => {
    it('parses large queries within configured limits', () => {
        const parser = new FQLParser({
            maxInputLength: 50000,
            maxRegexIterations: 100000,
            parseTimeoutMs: 2000
        })

        const largeQuery = Array(200).fill('key:value').join(' AND ')
        const result = parser.parse(largeQuery)

        expect(result).to.be.an('array')
        expect(result).to.have.lengthOf(200)
    })
})
