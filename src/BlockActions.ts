export interface BlockActions {
    type: string;
    team: { id: string; domain: string; };
    user: { id: string; name: string; team_id: string };
    token: string;
    container: { type: string; view_id: string };
    api_app_id: string;
    trigger_id: string;
    message?: object;
    view?: { id: string; hash: string };
    response_url?: string;
    actions: object[];
}