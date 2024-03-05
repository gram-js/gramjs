import { Api } from "../tl";
import { NewMessage, NewMessageEvent, NewMessageInterface } from "./NewMessage";
export interface EditedMessageInterface extends NewMessageInterface {
    func?: {
        (event: EditedMessageEvent): boolean;
    };
}
/**
 * Occurs whenever a text message or a message with media was edited.
 * @example
 * ```ts
 * async function editedEventPrint(event: EditedMessageEvent) {
 *   const message = event.message as Api.Message;
 *
 *   console.log(`Message ${message.id} from channel ${message.chatId!.toString();} was edited at ${message.editDate}`)
 * }
 * // adds an event handler for edited messages
 * client.addEventHandler(editedEventPrint, new EditedMessage({}));
 * ```
 */
export declare class EditedMessage extends NewMessage {
    func?: {
        (event: EditedMessageEvent): boolean;
    };
    constructor(editedMessageParams: EditedMessageInterface);
    build(update: Api.TypeUpdate | Api.TypeUpdates, callback: undefined, selfId: bigInt.BigInteger): EditedMessageEvent | undefined;
}
export declare class EditedMessageEvent extends NewMessageEvent {
    constructor(message: Api.Message, originalUpdate: Api.TypeUpdate | Api.TypeUpdates);
}
