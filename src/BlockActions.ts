import { InteractionPayloads } from "./InteractionPayloads";

export interface BlockActions extends InteractionPayloads {
    container: { type: string; view_id: string };
    message?: object;
    view?: { id: string; hash: string };
    response_url?: string;
    actions: object[];
}