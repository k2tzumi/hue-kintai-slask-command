export interface DialogSubmission {
    type: string;
    submission: { [key: string]: string; };
    callback_id: string;
    state: string;
    team: { id: string; domain: string; };
    user: { id: string; name: string; };
    channel: { id: string; name: string; };
    action_ts: string;
    token: string;
    response_url: string;
}