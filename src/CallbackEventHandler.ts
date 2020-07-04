import { SlackBaseHandler } from "./SlackBaseHandler";
import { CallbackEvent } from "./CallbackEvent";

type TextOutput = GoogleAppsScript.Content.TextOutput;

interface OuterEvent {
    token: string;
    team_id: string;
    api_app_id: string;
    event: CallbackEvent;
    type: string;
    authed_users: string[];
    event_id: string;
    event_time: number;
}

class CallbackEventHandler extends SlackBaseHandler {

    public handle(e): { performed: boolean; output: TextOutput | null } {
        if (e.postData) {
            const postData = JSON.parse(e.postData.getDataAsString());

            switch (postData.type) {
                case "url_verification":
                    this.validateVerificationToken(postData.token);
                    return { performed: true, output: this.convertJSONOutput({ challenge: postData.challenge }) };
                case "event_callback":
                    console.log({ message: "event_callback called.", data: postData });
                    return { performed: true, output: this.convertJSONOutput(this.bindEvent(postData)) };
                default:
                    break;
            }
        }

        return { performed: false, output: null };
    }

    private bindEvent(outerEvent: OuterEvent): {} {
        const { token, event_id, event_time, event } = outerEvent;

        this.validateVerificationToken(token);

        if (this.isHandleProceeded(event_id + event_time)) {
            throw new Error(`event duplicate called. type: ${event.type}, event_id: ${event_id}, event_time: ${event_time} event_ts: ${event.event_ts}`);
        }

        const listner: Function | null = this.getListener(event.type);

        if (listner) {
            return { performed: true, output: this.convertJSONOutput(listner(event)) };
        }

        throw new Error(`Undifine event type listner. type: ${event.type}`);
    }
}

export { CallbackEventHandler }