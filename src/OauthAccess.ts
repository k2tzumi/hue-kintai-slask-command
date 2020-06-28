export interface OauthAccess {
    ok: boolean;
    error?: string;
    access_token: string;
    token_type: string;
    scope: string;
    bot_user_id: string;
    app_id: string;
    team: Team;
    enterprise: Enterprise;
    authed_user: AuthedUser;
    incoming_webhook: IncomingWebhook;
}

interface Team {
    name: string;
    id: string;
}

interface Enterprise {
    name: string;
    id: string;
}

interface AuthedUser {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
}

interface IncomingWebhook {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
}