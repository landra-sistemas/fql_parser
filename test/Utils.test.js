import { expect } from 'chai'
import isEmpty from '../src/utils/isEmpty.mjs'

describe('Utils: isEmpty', () => {
    it('returns true for null or undefined', () => {
        expect(isEmpty(null)).to.equal(true)
        expect(isEmpty(undefined)).to.equal(true)
    })

    it('returns true for empty strings and arrays', () => {
        expect(isEmpty('')).to.equal(true)
        expect(isEmpty([])).to.equal(true)
    })

    it('returns true for empty objects', () => {
        expect(isEmpty({})).to.equal(true)
    })

    it('returns false for non-empty values', () => {
        expect(isEmpty('a')).to.equal(false)
        expect(isEmpty([1])).to.equal(false)
        expect(isEmpty({ a: 1 })).to.equal(false)
        expect(isEmpty(0)).to.equal(false)
        expect(isEmpty(false)).to.equal(false)
    })
})
