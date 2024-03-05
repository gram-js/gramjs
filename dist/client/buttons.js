"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReplyMarkup = void 0;
const tl_1 = require("../tl");
const button_1 = require("../tl/custom/button");
const messageButton_1 = require("../tl/custom/messageButton");
const Helpers_1 = require("../Helpers");
// ButtonMethods
/** @hidden */
function buildReplyMarkup(buttons, inlineOnly = false) {
    if (buttons == undefined) {
        return undefined;
    }
    if ("SUBCLASS_OF_ID" in buttons) {
        if (buttons.SUBCLASS_OF_ID == 0xe2e10ef2) {
            return buttons;
        }
    }
    if (!(0, Helpers_1.isArrayLike)(buttons)) {
        buttons = [[buttons]];
    }
    else if (!buttons || !(0, Helpers_1.isArrayLike)(buttons[0])) {
        // @ts-ignore
        buttons = [buttons];
    }
    let isInline = false;
    let isNormal = false;
    let resize = undefined;
    const singleUse = false;
    const selective = false;
    const rows = [];
    // @ts-ignore
    for (const row of buttons) {
        const current = [];
        for (let button of row) {
            if (button instanceof button_1.Button) {
                if (button.resize != undefined) {
                    resize = button.resize;
                }
                if (button.singleUse != undefined) {
                    resize = button.singleUse;
                }
                if (button.selective != undefined) {
                    resize = button.selective;
                }
                button = button.button;
            }
            else if (button instanceof messageButton_1.MessageButton) {
                button = button.button;
            }
            const inline = button_1.Button._isInline(button);
            if (!isInline && inline) {
                isInline = true;
            }
            if (!isNormal && inline) {
                isNormal = false;
            }
            if (button.SUBCLASS_OF_ID == 0xbad74a3) {
                // 0xbad74a3 == crc32(b'KeyboardButton')
                current.push(button);
            }
        }
        if (current) {
            rows.push(new tl_1.Api.KeyboardButtonRow({
                buttons: current,
            }));
        }
    }
    if (inlineOnly && isNormal) {
        throw new Error("You cannot use non-inline buttons here");
    }
    else if (isInline === isNormal && isNormal) {
        throw new Error("You cannot mix inline with normal buttons");
    }
    else if (isInline) {
        return new tl_1.Api.ReplyInlineMarkup({
            rows: rows,
        });
    }
    return new tl_1.Api.ReplyKeyboardMarkup({
        rows: rows,
        resize: resize,
        singleUse: singleUse,
        selective: selective,
    });
}
exports.buildReplyMarkup = buildReplyMarkup;
