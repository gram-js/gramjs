import {Api} from "../api";
import {Message as _Message} from "../custom/message"
import {Mixin} from 'ts-mixer';
import {tlobjects} from "../AllTLObjects";

class MessageEmpty extends Mixin(_Message, Api.MessageEmpty) {

}

class MessageService extends Mixin(_Message, Api.MessageService) {

}

class Message extends Mixin(_Message, Api.MessageEmpty) {

}

tlobjects[MessageEmpty.CONSTRUCTOR_ID] = MessageEmpty;
tlobjects[MessageService.CONSTRUCTOR_ID] = MessageService;
tlobjects[Message.CONSTRUCTOR_ID] = Message;
console.log("called");
