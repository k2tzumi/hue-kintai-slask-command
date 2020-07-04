import { InteractionPayloads } from "./InteractionPayloads";

export interface ViewSubmission extends InteractionPayloads {
    trigger_id: string;
    view: {
        id: string;
        type: string;
        title: { type: string; text: string; };
        submit: { type: string; text: string; };
        blocks: any;
        private_metadata: string;
        callback_id: string;
        state: {
            values: any;
        };
    };
    response_urls: string[];
}