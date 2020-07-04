import { SlackBaseHandler } from "./SlackBaseHandler";
import { InteractionPayloads } from "./InteractionPayloads";

type TextOutput = GoogleAppsScript.Content.TextOutput;

class InteractivityHandler extends SlackBaseHandler {

    public handle(e): { performed: boolean; output: TextOutput | null } {
        const { payload } = e.parameter;

        if (payload) {
            const request = JSON.parse(payload)
            return { performed: true, output: this.convertJSONOutput(this.bindInteractivity(request)) };
        }

        return { performed: false, output: null };
    }

    private bindInteractivity(payload: InteractionPayloads): {} {
        const { type, trigger_id, hash } = payload;
        this.validateVerificationToken(payload.token);

        switch (type) {
            case 'block_actions':
            case 'message_actions':
                if (this.isHandleProceeded(trigger_id)) {
                    throw new Error(`Interaction payloads duplicate called. type: ${type}, trigger_id: ${trigger_id}`);
                }
                break;
            case 'view_submission':
                if (this.isHandleProceeded(hash)) {
                    throw new Error(`Interaction payloads duplicate called. type: ${type}, hash: ${hash}`);
                }
                break;
            case 'view_closed':
                break;
            default:
                throw new Error(`Unknow interaction. type: ${type}`);
        }

        const listner: Function | null = this.getListener(type);

        if (listner) {
            return listner(payload);
        }

        throw new Error(`Undifine interaction listner. type: ${type}`);
    }
}

export { InteractivityHandler }