import { NetworkAccessError } from "./NetworkAccessError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;

class SlackWebhooks {
  public constructor(private incomingWebhookUrl: string) {}

  public invoke(payload: Record<never, never>): boolean {
    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(
        this.incomingWebhookUrl,
        this.requestOptions(payload),
      );
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        const responseBody = response.getContentText();
        if (responseBody === "ok") {
          return true;
        } else {
          const responseObj = JSON.parse(responseBody);

          if (responseObj.ok) {
            return true;
          } else {
            throw new Error(
              `unknow response. response: ${response.getContentText()}`,
            );
          }
        }
      default:
        console.warn(
          `Incoming Webhook error. status: ${response.getResponseCode()}, content: ${response.getContentText()}`,
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText(),
        );
    }
  }

  public sendText(
    text: string,
    thread_ts = "",
    response_type: string = "in_channel",
  ): boolean {
    let payload: Record<never, never> = {
      text,
    };

    if (thread_ts !== "") {
      payload = { ...payload, thread_ts };
    }
    if (response_type) {
      payload = { ...payload, response_type };
    }

    return this.invoke(payload);
  }

  private requestOptions(
    payload: string | Record<never, never>,
  ): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      headers: this.requestHeader(),
      method: "post",
      muteHttpExceptions: true,
      payload: payload instanceof String ? payload : JSON.stringify(payload),
    };

    return options;
  }

  private requestHeader() {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "content-type": "application/json; charset=UTF-8",
    };
  }
}

export { SlackWebhooks };
