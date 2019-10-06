class RequestState {


    constructor(request, after = null) {
        this.containerId = null;
        this.msgId = null;
        this.request = request;
        this.data = request.toBuffer();
        this.after = after

    }
}