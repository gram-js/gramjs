"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAll = void 0;
const api_1 = require("../api");
const message_1 = require("../custom/message");
function getGetter(obj, prop) {
    while (obj) {
        let getter = Object.getOwnPropertyDescriptor(obj, prop);
        if (getter && getter.get) {
            return getter.get;
        }
        obj = Object.getPrototypeOf(obj);
    }
}
function getSetter(obj, prop) {
    while (obj) {
        let getter = Object.getOwnPropertyDescriptor(obj, prop);
        if (getter && getter.set) {
            return getter.set;
        }
        obj = Object.getPrototypeOf(obj);
    }
}
const getInstanceMethods = (obj) => {
    let keys = {
        methods: new Set(),
        setters: new Set(),
        getters: new Set(),
    };
    let topObject = obj;
    const mapAllMethods = (property) => {
        const getter = getGetter(topObject, property);
        const setter = getSetter(topObject, property);
        if (getter) {
            keys["getters"].add(property);
        }
        else if (setter) {
            keys["setters"].add(property);
        }
        else {
            if (!(property == "constructor")) {
                keys["methods"].add(property);
            }
        }
    };
    do {
        Object.getOwnPropertyNames(obj).map(mapAllMethods);
        // walk-up the prototype chain
        obj = Object.getPrototypeOf(obj);
    } while (
    // not the the Object prototype methods (hasOwnProperty, etc...)
    obj &&
        Object.getPrototypeOf(obj));
    return keys;
};
function patchClass(clazz) {
    const { getters, setters, methods } = getInstanceMethods(message_1.CustomMessage.prototype);
    for (const getter of getters) {
        Object.defineProperty(clazz.prototype, getter, {
            get: getGetter(message_1.CustomMessage.prototype, getter),
        });
    }
    for (const setter of setters) {
        Object.defineProperty(clazz.prototype, setter, {
            set: getSetter(message_1.CustomMessage.prototype, setter),
        });
    }
    for (const method of methods) {
        clazz.prototype[method] = message_1.CustomMessage.prototype[method];
    }
}
function patchAll() {
    patchClass(api_1.Api.Message);
    patchClass(api_1.Api.MessageService);
}
exports.patchAll = patchAll;
