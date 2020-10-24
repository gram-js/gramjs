const Scanner = require('../../gramjs/extensions/Scanner')

const helloScanner = new Scanner('Hello world')

describe('Scanner', () => {
    beforeEach(() => helloScanner.reset())

    test('it should construct a new Scanner', () => {
        expect(helloScanner.str).toEqual('Hello world')
        expect(helloScanner.pos).toEqual(0)
        expect(helloScanner.lastMatch).toBeNull()
    })

    describe('.chr', () => {
        test('it should return the character at the current pos', () => {
            expect(helloScanner.chr).toEqual('H')
        })
    })

    describe('.peek', () => {
        test('it should return the character at the current pos', () => {
            expect(helloScanner.peek()).toEqual('H')
        })

        test('it should return the next n characters', () => {
            expect(helloScanner.peek(3)).toEqual('Hel')
            expect(helloScanner.peek(5)).toEqual('Hello')
        })
    })

    describe('.consume', () => {
        test('it should consume the current character', () => {
            const char = helloScanner.consume()
            expect(char).toEqual('H')
            expect(helloScanner.pos).toEqual(1)
        })

        test('it should consume the next n characters', () => {
            const chars = helloScanner.consume(5)
            expect(chars).toEqual('Hello')
            expect(helloScanner.pos).toEqual(5)
        })
    })

    describe('.reverse', () => {
        test('it should set pos back n characters', () => {
            helloScanner.consume(5)
            helloScanner.reverse(5)
            expect(helloScanner.pos).toEqual(0)
        })

        test('it should not go back further than 0', () => {
            helloScanner.reverse(10)
            expect(helloScanner.pos).toEqual(0)
        })
    })

    describe('.scanUntil', () => {
        test('it should scan the string for a regular expression starting at the current pos', () => {
            helloScanner.scanUntil(/w/)
            expect(helloScanner.pos).toEqual(6)
        })

        test('it should do nothing if the pattern is not found', () => {
            helloScanner.scanUntil(/G/)
            expect(helloScanner.pos).toEqual(0)
        })
    })

    describe('.rest', () => {
        test('it should return the unconsumed input', () => {
            helloScanner.consume(6)
            expect(helloScanner.rest).toEqual('world')
        })
    })

    describe('.reset', () => {
        test('it should reset the pos to 0', () => {
            helloScanner.consume(5)
            helloScanner.reset()
            expect(helloScanner.pos).toEqual(0)
        })
    })

    describe('.eof', () => {
        test('it should return true if the scanner has reached the end of the input', () => {
            expect(helloScanner.eof()).toBe(false)
            helloScanner.consume(11)
            expect(helloScanner.eof()).toBe(true)
        })
    })

    describe('.bof', () => {
        test('it should return true if pos is 0', () => {
            expect(helloScanner.bof()).toBe(true)
            helloScanner.consume(11)
            expect(helloScanner.bof()).toBe(false)
        })
    })
})
