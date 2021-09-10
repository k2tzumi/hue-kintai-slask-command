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

  private cookies: { [key: string]: string };
  private credential: UserCredential = null;

  public constructor(
    private domain: string,
    private authDomain: string,
    private samlRequest: string
  ) {
    if (this.samlRequest) {
      this.samlRequest = `https://${this.authDomain}/saml/sso?SAMLRequest=${this.samlRequest}`;
    }
  }

  public get authenticated(): boolean {
    return this.credential !== null;
  }

  private get headers(): HttpHeaders {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; ja-jp) AppleWebKit/533.17.9 (KHTML,like Gecko) Version/5.0.2 Mobile/8C148a Safari/6533.18.5"
    };
    if (this.cookie) {
      headers.cookie = this.cookie;
    }

    return headers;
  }

  private get cookie(): string | null {
    if (this.cookies) {
      return Object.keys(this.cookies)
        .map(key => {
          return `${key}=${this.cookies[key]}`;
        })
        .join("; ");
    } else {
      return null;
    }
  }

  private loginEndpoint(): string {
    return `https://${this.domain}/self-workflow/cws/mbl/MblActLogin?@REDIRECT=&@REDIRECT=&@JUMP=`;
  }

  private accessResource(): string {
    const responses = UrlFetchApp.fetchAll([
      {
        method: "get",
        followRedirects: false,
        muteHttpExceptions: false,
        headers: this.headers,
        url: this.loginEndpoint()
      }
    ]);

    const response = responses[0];

    this.appendCookie(response);
    this.logginResponse(response);

    return response.getHeaders().Location;
  }

  private logginResponse(response: HTTPResponse): void {
    console.log(
      `responseCode: ${response.getResponseCode()}, Location: ${
        response.getHeaders().Location
      }, contents: ${response.getContentText()}`
    );
  }

  public get punchingURLForPc(): string {
    return `https://${this.domain}/self-workflow/cws/srwtimerec?@DIRECT=true`;
  }

  public doLogin(credential: UserCredential): HueClient {
    try {
      if (!this.samlRequest) {
        this.samlRequest = this.accessResource();
      }

      console.log(`samlRequest: ${this.samlRequest}`);

      let formData = this.authnRequest(this.samlRequest);
      formData.username = credential.userID;

      formData = this.inputName(formData);
      formData.password = credential.password;

      formData = this.inputPassword(formData);

      formData = this.redirectWithSAMLart(formData);

      console.log(`cookie: ${this.cookie}`);

      this.credential = credential;

      return this;
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }
  }

  private authnRequest(samlRequest: string): { [key: string]: string } {
    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "get",
      headers: this.headers,
      muteHttpExceptions: true,
      followRedirects: false
    };
    const response = UrlFetchApp.fetch(samlRequest, options);

    this.logginResponse(response);
    this.appendCookie(response);
    return this.collectHiddenValues(response);
  }

  private inputName(formData: {
    [key: string]: string;
  }): { [key: string]: string } {
    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "post",
      headers: this.headers,
      muteHttpExceptions: true,
      payload: formData,
      followRedirects: false
    };

    const response = UrlFetchApp.fetch(this.samlLoginEndpoint(), options);

    this.logginResponse(response);
    this.appendCookie(response);
    return this.collectHiddenValues(response);
  }

  private inputPassword(formData: {
    [key: string]: string;
  }): { [key: string]: string } {
    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "post",
      headers: this.headers,
      muteHttpExceptions: true,
      payload: formData,
      followRedirects: false
    };

    const response = UrlFetchApp.fetch(this.samlLoginEndpoint(), options);

    this.logginResponse(response);
    this.appendCookie(response);
    return this.collectHiddenValues(response);
  }

  private redirectWithSAMLart(formData: {
    [key: string]: string;
  }): { [key: string]: string } {
    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "post",
      headers: this.headers,
      muteHttpExceptions: true,
      payload: formData,
      followRedirects: false
    };

    const response = UrlFetchApp.fetch(this.loginEndpoint(), options);

    this.logginResponse(response);
    this.appendCookie(response);
    return this.collectHiddenValues(response);
  }

  private samlLoginEndpoint(): string {
    return `https://${this.authDomain}/saml/login`;
  }

  private collectHiddenValues(
    reesponse: HTTPResponse
  ): { [key: string]: string } {
    const hiddenMatcher = /<input type=\"hidden\" name=\"(.*?)\" value=\"(.*?)\"( \/)*>/g;
    const hiddens = reesponse.getContentText().match(hiddenMatcher);
    const hiddenValues: { [key: string]: string } = {};

    if (hiddens === null) {
      return {};
    }

    for (const hidden of hiddens) {
      const name = hidden.match(/name=\"(.*?)\"/)[1];
      const value = hidden.match(/value=\"(.*?)\"/)[1];
      hiddenValues[name] = value;
    }

    return hiddenValues;
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
        return this.collectHiddenValues(response);
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
    const formData = {
      submit: type
    };

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
      this.logginResponse(response);
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

  private appendCookie(response: HTTPResponse): void {
    const headers = response.getAllHeaders();

    if (typeof headers["Set-Cookie"] !== "undefined") {
      const cookieValues =
        typeof headers["Set-Cookie"] === "string"
          ? [headers["Set-Cookie"]]
          : headers["Set-Cookie"];
      Object.keys(cookieValues).map(key => {
        const cookieValue = cookieValues[key].split(";")[0];
        const [name, value] = cookieValue.split("=");

        if (!this.cookies) {
          this.cookies = {};
        }
        this.cookies[name] = value;
      });
    }
  }
}

export { HueClient, HueClientError };
