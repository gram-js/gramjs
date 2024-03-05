"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestState = void 0;
const Deferred_1 = __importDefault(require("../extensions/Deferred"));
class RequestState {
    constructor(request) {
        this.containerId = undefined;
        this.msgId = undefined;
        this.request = request;
        this.data = request.getBytes();
        this.after = undefined;
        this.result = undefined;
        this.finished = new Deferred_1.default();
        this.resetPromise();
    }
    isReady() {
        if (!this.after) {
            return true;
        }
        return this.after.finished.promise;
    }
    resetPromise() {
        var _a;
        // Prevent stuck await
        (_a = this.reject) === null || _a === void 0 ? void 0 : _a.call(this);
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
exports.RequestState = RequestState;
