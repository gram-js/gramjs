import {Button} from "./tl/custom/button";
import {Api} from "./tl/api";

type ValueOf<T> = T[keyof T];
type Phone = string;
type Username = string;
type PeerID = number;
type Entity = Api.User | Api.Chat | Api.Channel;
type FullEntity = Api.UserFull | Api.messages.ChatFull | Api.ChatFull | Api.ChannelFull;
type PeerLike = Api.TypePeer | Api.TypeInputPeer | Entity | FullEntity
type EntityLike = Phone | Username | PeerID | Api.TypePeer | Api.TypeInputPeer | Entity | FullEntity ;

type EntitiesLike = EntityLike[];
type MessageIDLike = number | types.Message | types.TypeInputMessage;
type MessageLike = string | Api.Message;

type LocalPath = string;
type ExternalUrl = string;
type BotFileID = string;

type FileLike =
    LocalPath |
    ExternalUrl |
    BotFileID |
    Buffer |
    Api.TypeMessageMedia |
    Api.TypeInputFile |
    Api.TypeInputFileLocation
type ProgressCallback = (total: number, downloaded: number) => void;
type ButtonLike = Api.TypeKeyboardButton | Button;

type MarkupLike = types.TypeReplyMarkup |
    ButtonLike |
    ButtonLike[] |
    ButtonLike[][];
type DateLike = number;
