import { UserCredential } from "./UserCredentialStore";
import { NetworkAccessError } from "./NetworkAccessError";
import { BaseError } from "./BaseError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;
type HttpHeaders = GoogleAppsScript.URL_Fetch.HttpHeaders;

class HueClientError extends BaseError {
  constructor(public message: string, e?: string) {
    super(e);
  }
}

class HueClient {
  static readonly START_SUBMIT = "　　　出勤　　　";
  static readonly END_SUBMIT = "　　　退勤　　　";

  public cookie: string;
  public credential: UserCredential = null;

  public constructor(private domain: string) {}

  public get authenticated(): boolean {
    return this.credential !== null;
  }

  public get headers(): HttpHeaders {
    return {
      cookie: this.cookie
    };
  }

  private loginEndpoint(): string {
    return `https://${this.domain}/self-workflow/cws/mbl/MblActLogin@act=submit`;
  }

  public get punchingURLForPc(): string {
    return `https://${this.domain}/self-workflow/cws/srwtimerec?@DIRECT=true`;
  }

  public doLogin(credential: UserCredential): HueClient {
    const formData = {
      user_id: credential.userID,
      password: credential.password,
      submit: "　　ログイン　　",
      shortcut_act: "",
      shortcut_params: ""
    };

    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "post",
      muteHttpExceptions: true,
      payload: formData
    };

    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(this.loginEndpoint(), options);
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        const headers = response.getAllHeaders();
        this.cookie = this.getCookieHeaderValues(headers);
        if (response.getContentText().indexOf("ログアウト") === -1) {
          throw new HueClientError("login failed");
        }
        this.credential = credential;

        return this;
      default:
        console.warn(
          `HUE login error. endpoint: ${this.loginEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  public getHiddenValues(): { [key: string]: string } {
    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "get",
      headers: this.headers,
      muteHttpExceptions: true,
      followRedirects: false
    };

    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(this.timeRecEndpoint(), options);
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        const contents = response.getContentText();
        const hiddenMatcher = /<input type=\"hidden\" name=\"(.*?)\" value=\"(.*?)\"( \/)*>/g;
        const hiddens = contents.match(hiddenMatcher);
        const hiddenValues: { [key: string]: string } = {};

        if (hiddens === null) {
          console.warn(
            `view TimeRec unknown response error. endpoint: ${this.loginEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
          );
          throw new HueClientError("unknown response");
        }

        for (const hidden of hiddens) {
          const name = hidden.match(/name=\"(.*?)\"/)[1];
          const value = hidden.match(/value=\"(.*?)\"/)[1];
          hiddenValues[name] = value;
        }

        return hiddenValues;
      default:
        console.warn(
          `view TimeRec error. endpoint: ${this.loginEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  public punchIn(type: string): string {
    const formData = this.getHiddenValues();
    formData.submit = type;

    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "post",
      headers: this.headers,
      muteHttpExceptions: true,
      payload: formData,
      followRedirects: false
    };

    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(this.timeRecEndpoint("submit"), options);
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        const contents = response.getContentText();
        const messageMatcher = /<div align=\"left\" ID=\"InfoMsg\" style=\"color:#006400;\" >(.*?)<\/div>/g;
        const message = contents.match(messageMatcher)[0];

        return message.match(/ >(.*?)<\/div>/)[1].replace("<br>", "\n");
      default:
        console.warn(
          `punchIn error. endpoint: ${this.loginEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private timeRecEndpoint(action: string | null = null): string {
    let endPoint = `https://${this.domain}/self-workflow/cws/mbl/MblActInputTimeRec`;

    if (action) {
      endPoint += `@act=${action}`;
    }

    return endPoint;
  }

  private getCookieHeaderValues(headers: object): string {
    let values = "";

    if (typeof headers["Set-Cookie"] !== "undefined") {
      const cookies =
        typeof headers["Set-Cookie"] === "string"
          ? [headers["Set-Cookie"]]
          : headers["Set-Cookie"];
      for (const i in cookies)
        values += Utilities.formatString("%s; ", cookies[i].split("; ")[0]);
    }

    return values;
  }
}

export { HueClient, HueClientError };
