import { NetworkAccessError } from "./NetworkAccessError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

interface Response {
    ok: boolean;
    error?: string;
}

class SlackClient {

    static readonly BASE_PATH = 'https://slack.com/api/';

    public constructor(private token: string) {
    }

    public oepnDialog(dialog: {}, trigger_id: string): void {
        const endPoint = SlackClient.BASE_PATH + 'dialog.open';
        const payload: {} = {
            dialog: dialog,
            trigger_id: trigger_id
        };

        const response: Response = this.invokeAPI(endPoint, payload);

        if (!response.ok) {
            console.warn(response.error);
            throw new Error(`open dialog faild. ${JSON.stringify(response)}`);
        }
    }

    public openViews(views: {}, trigger_id: string): void {
        const endPoint = SlackClient.BASE_PATH + 'views.open';
        const payload: {} = {
            view: views,
            trigger_id: trigger_id
        };

        const response: Response = this.invokeAPI(endPoint, payload);

        if (!response.ok) {
            console.warn(response.error);
            throw new Error(`open views faild. ${JSON.stringify(response)}`);
        }
    }

    public updateViews(views: {}, hash: string, view_id: string): void {
        const endPoint = SlackClient.BASE_PATH + 'views.update';
        const payload: {} = {
            view: views,
            hash: hash,
            view_id: view_id
        };

        const response: Response = this.invokeAPI(endPoint, payload);

        if (!response.ok) {
            console.warn(response.error);
            throw new Error(`update views faild. ${JSON.stringify(response)}`);
        }
    }

    public addReactions(channel: string, name: string, timestamp: string): boolean {
        const endPoint = SlackClient.BASE_PATH + 'reactions.add';
        const payload: {} = {
            channel: channel,
            name: name,
            timestamp: timestamp
        };

        const response: Response = this.invokeAPI(endPoint, payload);

        if (!response.ok) {
            if (response.error === 'already_reacted') {
                return false;
            }

            console.warn(response.error);
            throw new Error(`add reactions faild. ${JSON.stringify(response)}`);
        }

        return true;
    }

    public postEphemeral(channel: string, text: string, user: string): void {
        const endPoint = SlackClient.BASE_PATH + 'chat.postEphemeral';
        const payload: {} = {
            channel: channel,
            text: text,
            user: user
        };

        const response: Response = this.invokeAPI(endPoint, payload);

        if (!response.ok) {
            console.warn(response.error);
            throw new Error(`post ephemeral faild. ${JSON.stringify(response)}`);
        }
    }

    public postMessage(channel: string, text: string, thread_ts: string = null): void {
        const endPoint = SlackClient.BASE_PATH + 'chat.postMessage';
        let payload: {} = {
            channel: channel,
            text: text
        };
        if (thread_ts) {
            payload = { ...payload, thread_ts: thread_ts };
        }

        const response: Response = this.invokeAPI(endPoint, payload);

        if (!response.ok) {
            console.warn(response.error);
            throw new Error(`post message faild. ${JSON.stringify(response)}`);
        }
    }

    private requestHeader() {
        return {
            'content-type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${this.token}`,
        }
    }

    private requestOptions(payload: string | {}): URLFetchRequestOptions {
        const options: URLFetchRequestOptions = {
            method: 'post',
            headers: this.requestHeader(),
            muteHttpExceptions: true,
            payload: (payload instanceof String) ? payload : JSON.stringify(payload)
        };

        return options;
    }

    /**
     * @param endPoint Slack API endpoint
     * @param options 
     * @throws NetworkAccessError
     */
    private invokeAPI(endPoint: string, payload: {}): Response {
        var response;

        try {
            response = UrlFetchApp.fetch(endPoint, this.requestOptions(payload));
        } catch (e) {
            console.warn(`DNS error, etc. ${e.message}`);
            throw new NetworkAccessError(500, e.message);
        }

        switch (response.getResponseCode()) {
            case 200:
                return JSON.parse(response.getContentText());
            default:
                console.warn(`Slack API error. endpoint: ${endPoint}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`);
                throw new NetworkAccessError(response.getResponseCode(), response.getContentText());
        }
    }
}

export { SlackClient }