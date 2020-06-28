export interface ViewSubmission {
    type: string;
    team: { id: string; domain: string; };
    user: { id: string; name: string; };
    api_app_id: string;
    token: string;
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