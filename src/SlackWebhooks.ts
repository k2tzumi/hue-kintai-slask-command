type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

class SlackWebhooks {

    public constructor(private incomingWebhookUrl: string) {
    }

    public invoke(message: string, thread_ts: string = null) {
        const headers = {
            "content-type": "application/json"
        }

        let jsonData = {
            "username": "hue-kintai-bot",
            "icon_emoji": "clipboard",
            "response_type": "in_channel",
            "text": message,
        }

        if (thread_ts) {
            jsonData['thread_ts'] = thread_ts;
        }

        const options: URLFetchRequestOptions = {
            method: "post",
            headers: headers,
            payload: JSON.stringify(jsonData),
        };

        UrlFetchApp.fetch(this.incomingWebhookUrl, options).getContentText();
    }
}

export { SlackWebhooks }