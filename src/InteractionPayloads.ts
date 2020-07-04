interface InteractionPayloads {
    type: string;
    team: { id: string; domain: string; };
    user: { id: string; name: string; };
    api_app_id: string;
    token: string;
    hash?: string;
    trigger_id?: string;
}

export { InteractionPayloads }