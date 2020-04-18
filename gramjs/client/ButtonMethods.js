const { types, custom } = require('../tl')

const ButtonMethods = (superclass) => class extends superclass {
    static buildReplyMarkup(buttons, inlineOnly = false) {
        if (!buttons) return null

        if (buttons.SUBCLASS_OF_ID === 0xe2e10ef2)
            return buttons

        if (!Array.isArray(buttons))
            buttons = [[buttons]]
        else if (!buttons || !Array.isArray(buttons[0]))
            buttons = [buttons]

        let isInline = false
        let isNormal = false
        let resize = null
        let singleUse = null
        let selective = null

        const rows = []
        for (const row of buttons) {
            const current = []
            for (let button of row) {
                if (button instanceof custom.Button) {
                    // TODO: Implement custom.Button
                    if (button.resize)
                        resize = button.resize
                    if (button.singleUse)
                        singleUse = button.singleUse
                    if (button.selective)
                        selective = button.selective
                } else if (button instanceof custom.MessageButton) {
                    // TODO: Implement custom.MessageButton
                    button = button.button
                }

                isInline = custom.Button._isInline(button)
                isNormal = !isInline

                if (button.SUBCLASS_OF_ID === 0xbad74a3) {
                    // 0xbad74a3 == crc32 of KeyboardButton
                    current.push(button)
                }
            }

            if (current.length > 0) {
                rows.push(new types.KeyboardButtonRow({ buttons: current }))
            }
        }

        if (inlineOnly && isNormal)
            throw new Error('You cannot use non-inline buttons here')
        else if (isInline === isNormal && isNormal)
            throw new Error('You cannot mix inline with normal buttons')
        else if (isInline)
            return new types.ReplyInlineMarkup({ rows: rows })
        else
            return new types.ReplyKeyboardMarkup({ rows, resize, singleUse, selective })
    }
}

module.exports = ButtonMethods
