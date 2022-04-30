import { TLMessage } from "./TLMessage";
import { RPCResult } from "./RPCResult";
import { MessageContainer } from "./MessageContainer";
import { GZIPPacked } from "./GZIPPacked";

export const coreObjects = new Map<number, Function>([
    [RPCResult.CONSTRUCTOR_ID, RPCResult],
    [GZIPPacked.CONSTRUCTOR_ID, GZIPPacked],
    [MessageContainer.CONSTRUCTOR_ID, MessageContainer],
]);
export { RPCResult, TLMessage, MessageContainer, GZIPPacked };
