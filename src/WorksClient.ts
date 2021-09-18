import { UserCredential } from "./UserCredentialStore";
import { NetworkAccessError } from "./NetworkAccessError";
import { BaseError } from "./BaseError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

class WorksClientError extends BaseError {
  constructor(public message: string, e?: string) {
    super(e);
  }
}

class WorksClient {
  public credential: UserCredential = null;

  public constructor(private proxyDomain: string, domain: string) {}

  public get authenticated(): boolean {
    return this.credential !== null;
  }

  public doLogin(credential: UserCredential): WorksClient {
    const formData = {
      username: credential.userID,
      password: credential.password
    };
    const options: URLFetchRequestOptions = {
      contentType: "application/json",
      method: "post",
      muteHttpExceptions: true,
      payload: JSON.stringify(formData),
      followRedirects: false
    };

    const response = UrlFetchApp.fetch(this.loginEndpoint(), options);

    switch (response.getResponseCode()) {
      case 200:
      case 400:
      case 401:
      case 500:
        this.credential = credential;
        return this;
      default:
        console.warn(
          `Works login error. endpoint: ${this.loginEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          `contents: ${response.getContentText()}, endPoint: ${this.loginEndpoint()}`
        );
    }
  }

  public doPunchIn(credential: UserCredential): string {
    const formData = {
      username: credential.userID,
      password: credential.password
    };
    const options: URLFetchRequestOptions = {
      contentType: "application/json",
      method: "post",
      muteHttpExceptions: true,
      payload: JSON.stringify(formData),
      followRedirects: false
    };

    const response = UrlFetchApp.fetch(this.punchInEndpoint(), options);

    switch (response.getResponseCode()) {
      case 200:
      case 400:
      case 401:
      case 500:
        return JSON.parse(response.getContentText()).result;
      default:
        console.warn(
          `Works punch in error. endpoint: ${this.punchInEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          `contents: ${response.getContentText()}, endPoint: ${this.punchInEndpoint()}`
        );
    }
  }

  public doPunchOut(credential: UserCredential): string {
    const formData = {
      username: credential.userID,
      password: credential.password
    };
    const options: URLFetchRequestOptions = {
      contentType: "application/json",
      method: "post",
      muteHttpExceptions: true,
      payload: JSON.stringify(formData),
      followRedirects: false
    };

    const response = UrlFetchApp.fetch(this.punchOutEndpoint(), options);

    switch (response.getResponseCode()) {
      case 200:
        return JSON.parse(response.getContentText()).result;
      case 400:
      case 401:
      case 500:
        throw new WorksClientError(JSON.parse(response.getContentText()).error);
      default:
        console.warn(
          `Works punch out error. endpoint: ${this.punchOutEndpoint()}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          `contents: ${response.getContentText()}, endPoint: ${this.punchOutEndpoint()}`
        );
    }
  }

  private loginEndpoint(): string {
    return `https://${this.proxyDomain}/.netlify/functions/login`;
  }

  private punchOutEndpoint(): string {
    return `https://${this.proxyDomain}/.netlify/functions/punchout`;
  }

  private punchInEndpoint(): string {
    return `https://${this.proxyDomain}/.netlify/functions/punchin`;
  }

  public get punchingURLForPc(): string {
    return `https://${this.domain}/self-workflow/cws/srwtimerec?@DIRECT=true`;
  }
}

export { WorksClient, WorksClientError };
