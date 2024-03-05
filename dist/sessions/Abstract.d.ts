import type { AuthKey } from "../crypto/AuthKey";
import type { EntityLike } from "../define";
import { Api } from "../tl";
export declare abstract class Session {
    /**
     * Creates a clone of this session file
     * @param toInstance {Session|null}
     * @returns {Session}
     */
    /**
     * Sets the information of the data center address and port that
     * the library should connect to, as well as the data center ID,
     * which is currently unused.
     * @param dcId {number}
     * @param serverAddress {string}
     * @param port {number}
     */
    abstract setDC(dcId: number, serverAddress: string, port: number): void;
    /**
     * Returns the currently-used data center ID.
     */
    abstract get dcId(): number;
    /**
     * Returns the server address where the library should connect to.
     */
    abstract get serverAddress(): string;
    /**
     * Returns the port to which the library should connect to.
     */
    abstract get port(): number;
    /**
     * Returns an ``AuthKey`` instance associated with the saved
     * data center, or `undefined` if a new one should be generated.
     */
    abstract get authKey(): AuthKey | undefined;
    /**
     * Sets the ``AuthKey`` to be used for the saved data center.
     * @param value
     */
    abstract set authKey(value: AuthKey | undefined);
    /**
     * Called before using the session
     */
    abstract load(): Promise<void>;
    /**
     *  sets auth key for a dc
     */
    abstract setAuthKey(authKey?: AuthKey, dcId?: number): void;
    /**
     *  gets auth key for a dc
     */
    abstract getAuthKey(dcId?: number): AuthKey | undefined;
    /**
     * Turns the given key into an ``InputPeer`` (e.g. ``InputPeerUser``).
     * The library uses this method whenever an ``InputPeer`` is needed
     * to suit several purposes (e.g. user only provided its ID or wishes
     * to use a cached username to avoid extra RPC).
     */
    abstract getInputEntity(key: EntityLike): Api.TypeInputPeer;
    /**
     * Returns an ID of the takeout process initialized for this session,
     * or `None` if there's no were any unfinished takeout requests.
     */
    /**
     * Sets the ID of the unfinished takeout process for this session.
     * @param value
     */
    /**
     * Returns the ``UpdateState`` associated with the given `entity_id`.
     * If the `entity_id` is 0, it should return the ``UpdateState`` for
     * no specific channel (the "general" state). If no state is known
     * it should ``return None``.
     * @param entityId
     */
    /**
     * Sets the given ``UpdateState`` for the specified `entity_id`, which
     * should be 0 if the ``UpdateState`` is the "general" state (and not
     * for any specific channel).
     * @param entityId
     * @param state
     */
    /**
     * Called on client disconnection. Should be used to
     * free any used resources. Can be left empty if none.
     */
    abstract close(): void;
    /**
     * called whenever important properties change. It should
     * make persist the relevant session information to disk.
     */
    abstract save(): void;
    /**
     * Called upon client.log_out(). Should delete the stored
     * information from disk since it's not valid anymore.
     */
    abstract delete(): void;
    /**
     * Processes the input ``TLObject`` or ``list`` and saves
     * whatever information is relevant (e.g., ID or access hash).
     * @param tlo
     */
    abstract processEntities(tlo: any): void;
}
