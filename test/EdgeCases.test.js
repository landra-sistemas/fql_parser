import { expect } from 'chai'
import { FQLParser } from '../src/index.mjs'

describe('Edge Cases', () => {
    it('handles empty string', () => {
        const parser = new FQLParser()
        const result = parser.parse('')
        expect(result).to.be.an('array')
        expect(result).to.have.lengthOf(0)
    })

    it('handles undefined or null values safely', () => {
        const parser = new FQLParser()
        expect(parser.parseValue(undefined)).to.equal('')
        expect(parser.parseValue(null)).to.equal('')
        expect(parser.parseValueForPlainQuery(undefined)).to.equal('')
        expect(parser.parseValueForPlainQuery(null)).to.equal('')
    })

    it('preserves unicode characters in values', () => {
        const parser = new FQLParser()
        const data = parser.parse('name:Jos\u00E9 OR city:S\u00E3o_Paulo')
        expect(data).to.have.lengthOf(2)
        expect(data[0]).to.have.property('value', 'Jos\u00E9')
        expect(data[1]).to.have.property('value', 'S\u00E3o_Paulo')
    })

    it('sanitizes control characters from values', () => {
        const parser = new FQLParser()
        const data = parser.parse('name:"a\u0000b\u001Fc"')
        expect(data).to.have.lengthOf(1)
        expect(data[0]).to.have.property('value', 'abc')
    })
})
