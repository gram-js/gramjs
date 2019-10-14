class RequestState {


    constructor(request, after = null) {
        this.containerId = null;
        this.msgId = null;
        this.request = request;
        this.data = request.bytes;
        this.after = after

    }
}

module.exports = RequestState;