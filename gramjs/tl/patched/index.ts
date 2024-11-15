import { Api } from "../api";
import { CustomMessage } from "../custom/message";
import { tlobjects } from "../AllTLObjects";

function getGetter(obj: any, prop: string) {
    while (obj) {
        let getter = Object.getOwnPropertyDescriptor(obj, prop);
        if (getter && getter.get) {
            return getter.get;
        }
        obj = Object.getPrototypeOf(obj);
    }
}

function getSetter(obj: any, prop: string) {
    while (obj) {
        let getter = Object.getOwnPropertyDescriptor(obj, prop);
        if (getter && getter.set) {
            return getter.set;
        }
        obj = Object.getPrototypeOf(obj);
    }
}

const getInstanceMethods = (obj: any) => {
    let keys = {
        methods: new Set<string>(),
        setters: new Set<string>(),
        getters: new Set<string>(),
    };
    let topObject = obj;

    const mapAllMethods = (property: string) => {
        const getter = getGetter(topObject, property);
        const setter = getSetter(topObject, property);
        if (getter) {
            keys["getters"].add(property);
        } else if (setter) {
            keys["setters"].add(property);
        } else {
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
        Object.getPrototypeOf(obj)
    );

    return keys;
};

function patchClass(clazz: Function) {
    const { getters, setters, methods } = getInstanceMethods(
        CustomMessage.prototype
    );
    for (const getter of getters) {
        Object.defineProperty(clazz.prototype, getter, {
            get: getGetter(CustomMessage.prototype, getter),
        });
    }
    for (const setter of setters) {
        Object.defineProperty(clazz.prototype, setter, {
            set: getSetter(CustomMessage.prototype, setter),
        });
    }
    for (const method of methods) {
        clazz.prototype[method] = (CustomMessage.prototype as any)[method];
    }
}

function patchAll() {
    patchClass(Api.Message);
    patchClass(Api.MessageService);
    patchClass(Api.MessageEmpty);
}

export { patchAll };
