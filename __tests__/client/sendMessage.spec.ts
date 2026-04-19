import bigInt from "big-integer";
import { sendMessage } from "../../gramjs/client/messages";
import { Api } from "../../gramjs/tl/api";

describe("sendMessage", () => {
    const buildStubClient = () => {
        const sendAsPeer = new Api.InputPeerChannel({
            channelId: bigInt(99),
            accessHash: bigInt(1),
        });
        const targetPeer = new Api.InputPeerSelf();
        let captured: any;
        const client: any = {
            parseMode: undefined,
            getInputEntity: jest.fn(async (e: any) =>
                e === "channel-handle" ? sendAsPeer : targetPeer
            ),
            invoke: jest.fn(async (req: any) => {
                captured = req;
                return {} as any;
            }),
            buildReplyMarkup: () => undefined,
            _getResponseMessage: () => undefined,
        };
        return { client, sendAsPeer, targetPeer, getCaptured: () => captured };
    };

    test("forwards resolved sendAs InputPeer onto Api.messages.SendMessage", async () => {
        const { client, sendAsPeer, getCaptured } = buildStubClient();

        await sendMessage(client, "me", {
            message: "hi",
            sendAs: "channel-handle",
        });

        expect(client.getInputEntity).toHaveBeenCalledWith("channel-handle");
        const req = getCaptured();
        expect(req).toBeInstanceOf(Api.messages.SendMessage);
        expect(req.sendAs).toBe(sendAsPeer);
    });

    test("leaves sendAs undefined when option not provided", async () => {
        const { client, getCaptured } = buildStubClient();

        await sendMessage(client, "me", { message: "hi" });

        const req = getCaptured();
        expect(req).toBeInstanceOf(Api.messages.SendMessage);
        expect(req.sendAs).toBeUndefined();
    });
});
