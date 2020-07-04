import { CallbackEvent } from "./CallbackEvent"

export interface AppMentionEvent extends CallbackEvent {
    text: string;
    channel: string;
}
