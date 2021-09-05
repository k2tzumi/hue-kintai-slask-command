import { NetworkAccessError } from "./NetworkAccessError";
import { BaseError } from "./BaseError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
type HttpMethod = GoogleAppsScript.URL_Fetch.HttpMethod;
type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;
type Blob = GoogleAppsScript.Base.Blob;

interface Response {
  ok: boolean;
  error?: string;
}

interface Message {
  type: string;
  ts: string;
  user: string;
  team: string;
  blocks?: Block[];
}

interface TextCompositionObject {
  type: string;
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

interface Block {
  type: string;
  block_id?: string;
}

// type=divider
type DividerBlock = Block;
interface ContextBlock extends Block {
  // type=context
  elements: (TextCompositionObject | {})[];
}

interface ActionsBlock extends Block {
  // type=actions
  elements: {}[];
}

interface HeaderBlock extends Block {
  // type=header
  text: TextCompositionObject;
}

interface SectionBlock extends Block {
  // type=section
  text: TextCompositionObject;
  fields: {}[];
  accessory: {};
}

interface User {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {};
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  updated: number;
  is_app_user: boolean;
  has_2fa: boolean;
  locale?: string;
}

interface Channel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_read_only: boolean;
  is_shared: boolean;
  parent_conversation: object;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  pending_shared: [];
  is_pending_ext_shared: boolean;
  is_member: boolean;
  is_private: boolean;
  is_mpim: boolean;
  last_read: string;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  previous_names: string[];
  locale?: string;
}

interface File {
  id: string;
  created: number;
  timestamp: number;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  pretty_type: string;
  user: string;
  editable: boolean;
  size: number;
  mode: string;
  is_external: boolean;
  external_type: string;
  is_public: boolean;
  public_url_shared: boolean;
  display_as_bot: boolean;
  username: string;
  url_private: string;
  url_private_download: string;
  media_display_type?: string;
  thumb_64?: string;
  thumb_80?: string;
  thumb_360?: string;
  thumb_360_w?: number;
  thumb_360_h?: number;
  thumb_160?: string;
  original_w?: number;
  original_h?: number;
  thumb_tiny?: string;
  permalink: string;
  permalink_public: string;
  edit_link?: string;
  preview?: string;
  preview_highlight?: string;
  lines?: number;
  lines_more?: number;
  preview_is_truncated?: boolean;
  comments_count: number;
  is_starred: boolean;
  shares: {
    public: Record<string, FileComment[]>;
  };
  channels: string[];
  groups: [];
  ims: [];
  has_rich_preview: boolean;
}

interface FileComment {
  reply_users: [];
  reply_users_count: number;
  reply_count: number;
  ts: string;
  channel_name: string;
  team_id: string;
  share_user_id: string;
}

interface Bot {
  id: string;
  deleted: boolean;
  name: string;
  updated: number;
  app_id: string;
  user_id: string;
  icons: {
    image_36: string;
    image_48: string;
    image_72: string;
  };
}

interface ChatScheduleMessageResponse extends Response {
  channel: string;
  scheduled_message_id: string;
  post_at: string;
  message: Message;
}

interface ChatPostMessageResponse extends Response {
  channel: string;
  ts: string;
  message: Message;
}

interface ConversationsHistoryResponse extends Response {
  messages: Message[];
  has_more: boolean;
  pin_count: number;
  response_metadata: { next_cursor: string };
}

interface UserResponse extends Response {
  user: User;
}

interface ConversationsResponse extends Response {
  channel: Channel;
}

interface FileResponse extends Response {
  file: File;
}

interface BotResponse extends Response {
  bot: Bot;
}

interface AuthTestResponse extends Response {
  url: string;
  team: string;
  user: string;
  team_id: string;
  user_id: string;
}

class NotInChannelError extends BaseError {
  constructor() {
    super();
  }
}

class SlackApiClient {
  static readonly BASE_PATH = "https://slack.com/api/";

  public constructor(private token: string) {}

  public oepnDialog(dialog: {}, trigger_id: string): void {
    const endPoint = SlackApiClient.BASE_PATH + "dialog.open";
    const payload = {
      dialog,
      trigger_id
    };

    const response: Response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      throw new Error(
        `open dialog faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }
  }

  public openViews(views: {}, trigger_id: string): void {
    const endPoint = SlackApiClient.BASE_PATH + "views.open";
    const payload = {
      view: views,
      trigger_id
    };

    const response: Response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      throw new Error(
        `open views faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }
  }

  public updateViews(views: {}, hash: string, view_id: string): void {
    const endPoint = SlackApiClient.BASE_PATH + "views.update";
    const payload = {
      view: views,
      hash,
      view_id
    };

    const response: Response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      throw new Error(
        `update views faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }
  }

  public addReactions(
    channel: string,
    name: string,
    timestamp: string
  ): boolean {
    const endPoint = SlackApiClient.BASE_PATH + "reactions.add";
    const payload = {
      channel,
      name,
      timestamp
    };

    const response: Response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      if (response.error === "already_reacted") {
        return false;
      }

      throw new Error(
        `add reactions faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return true;
  }

  public postEphemeral(channel: string, text: string, user: string): void {
    const endPoint = SlackApiClient.BASE_PATH + "chat.postEphemeral";
    const payload = {
      channel,
      text,
      user
    };

    const response: Response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      throw new Error(
        `post ephemeral faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }
  }

  /**
   * @see https://api.slack.com/methods/chat.postMessage
   * @param {string} channel
   * @param {string} text
   * @param {string} [thread_ts]
   * @param {{}[]} [attachments]
   * @param {(Block | Record<string, any>)[]} [blocks]
   * @returns {string}
   * @throws {NotInChannelError}
   */
  public chatPostMessage(
    channel: string,
    text: string,
    thread_ts?: string,
    attachments?: {}[],
    blocks?: (Block | Record<string, any>)[]
  ): string {
    const endPoint = SlackApiClient.BASE_PATH + "chat.postMessage";
    let payload: Record<string, any> = {
      channel
    };
    if (thread_ts) {
      payload = { ...payload, thread_ts };
    }
    if (attachments) {
      payload = { ...payload, attachments };
    }
    if (blocks) {
      if (!text) {
        text = this.convertBlock2Text(blocks);
      }
      payload = { ...payload, blocks };
    }
    payload = { ...payload, text };

    const response = this.invokeAPI(
      endPoint,
      payload
    ) as ChatPostMessageResponse;

    if (!response.ok) {
      if (response.error === "not_in_channel") {
        throw new NotInChannelError();
      }
      throw new Error(
        `post message faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.ts;
  }

  /**
   * @see https://api.slack.com/methods/chat.scheduleMessage
   * @param {string} channel
   * @param {Date} post_at
   * @param {string} text
   * @param {(Block | Record<string, any>)[]} blocks
   * @returns {string}
   * @throws {NotInChannelError}
   */
  public chatScheduleMessage(
    channel: string,
    post_at: Date,
    text?: string,
    blocks?: (Block | Record<string, any>)[]
  ): string {
    const endPoint = SlackApiClient.BASE_PATH + "chat.scheduleMessage";
    let payload: Record<string, any> = {
      channel,
      post_at: Math.ceil(post_at.getTime() / 1000)
    };
    if (blocks) {
      if (!text) {
        text = this.convertBlock2Text(blocks);
      }
      payload = { ...payload, blocks, text };
    }
    payload = { ...payload, text };

    const response = this.invokeAPI(
      endPoint,
      payload
    ) as ChatScheduleMessageResponse;

    if (!response.ok) {
      if (response.error === "not_in_channel") {
        throw new NotInChannelError();
      }
      throw new Error(
        `chat schedule message faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.scheduled_message_id;
  }

  public chatDeleteScheduleMessage(
    channel: string,
    scheduled_message_id: string
  ): boolean {
    const endPoint = SlackApiClient.BASE_PATH + "chat.deleteScheduledMessage";
    const payload = {
      channel,
      scheduled_message_id
    };

    const response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      if (response.error !== "invalid_scheduled_message_id") {
        throw new Error(
          `chat delete schedule message faild. response: ${JSON.stringify(
            response
          )}, payload: ${JSON.stringify(payload)}`
        );
      } else {
        return false;
      }
    }

    return true;
  }

  public conversationsHistory(
    channel: string,
    latest?: string,
    limit?: number,
    oldest?: string
  ): Message[] {
    const endPoint = SlackApiClient.BASE_PATH + "conversations.history";
    let payload: Record<string, any> = {
      channel,
      inclusive: true
    };
    if (latest) {
      payload = { ...payload, latest };
    }
    if (limit) {
      payload = { ...payload, limit };
    }
    if (oldest) {
      payload = { ...payload, oldest };
    }

    const response = this.invokeAPI(
      endPoint,
      payload
    ) as ConversationsHistoryResponse;

    if (!response.ok) {
      throw new Error(
        `conversations history faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.messages;
  }

  public chatUpdate(
    channel: string,
    ts: string,
    text?: string,
    blocks?: (Block | Record<string, any>)[]
  ): void {
    const endPoint = SlackApiClient.BASE_PATH + "chat.update";
    let payload: Record<string, any> = {
      channel,
      ts
    };
    if (blocks) {
      if (!text) {
        text = this.convertBlock2Text(blocks);
      }
      payload = { ...payload, blocks };
    }
    payload = { ...payload, text };

    const response = this.invokeAPI(endPoint, payload) as Response;

    if (!response.ok) {
      throw new Error(
        `chat update faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }
  }

  /**
   * @see https://api.slack.com/methods/users.info
   * @param {string} user
   * @returns {User}
   */
  public usersInfo(user: string): User {
    const endPoint = SlackApiClient.BASE_PATH + "users.info";
    const payload = {
      user,
      include_locale: true
    };

    const response = this.invokeAPI(endPoint, payload) as UserResponse;

    if (!response.ok) {
      throw new Error(
        `users info faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.user;
  }

  /**
   * @see https://api.slack.com/methods/files.upload
   * @param {string} channels
   * @param {Blob} file
   * @param {string} filename
   * @param {string} filetype
   * @param {string} title
   * @param {string} initial_comment
   * @returns {File}
   * @throws {NotInChannelError}
   */
  public filesUpload(
    channels: string,
    file: Blob,
    filename: string,
    filetype: string,
    title: string,
    initial_comment: string
  ): File {
    const endPoint = SlackApiClient.BASE_PATH + "files.upload";
    const payload = {
      channels,
      file,
      filename,
      filetype: filetype ?? file.getContentType().split("/")[1],
      title,
      initial_comment
    };

    const response = this.invokeAPI(endPoint, payload) as FileResponse;

    if (!response.ok) {
      if (response.error === "not_in_channel") {
        throw new NotInChannelError();
      }
      throw new Error(
        `files upload faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.file;
  }

  /**
   * @see https://api.slack.com/methods/files.sharedPublicURL
   * @param {string} file
   * @returns {File}
   */
  public filesSharedPublicURL(file: string): File {
    const endPoint = SlackApiClient.BASE_PATH + "files.sharedPublicURL";
    const payload = {
      file
    };

    const response = this.invokeAPI(endPoint, payload) as FileResponse;

    if (!response.ok) {
      throw new Error(
        `files shared public URL faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.file;
  }

  /**
   * @see https://api.slack.com/methods/files.info
   * @param {string} file
   */
  public filesInfo(file: string) {
    const endPoint = SlackApiClient.BASE_PATH + "files.info";
    const payload = {
      file
    };

    const response = this.invokeAPI(endPoint, payload);

    if (!response.ok) {
      throw new Error(
        `files info faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response;
  }

  public conversationsInfo(channel: string): Channel {
    const endPoint = SlackApiClient.BASE_PATH + "conversations.info";
    const payload = {
      channel,
      include_locale: true
    };

    const response = this.invokeAPI(endPoint, payload) as ConversationsResponse;

    if (!response.ok) {
      throw new Error(
        `conversations info faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.channel;
  }

  /**
   * @see https://api.slack.com/methods/auth.test
   * @returns {AuthTestResponse}
   */
  public authTest(): AuthTestResponse {
    const endPoint = SlackApiClient.BASE_PATH + "auth.test";
    const payload = {};

    const response = this.invokeAPI(endPoint, payload) as AuthTestResponse;

    if (!response.ok) {
      throw new Error(
        `auth test faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    console.log(`auth.test: ${JSON.stringify(response)}`);

    return response;
  }

  /**
   * @see https://api.slack.com/methods/bots.info
   * @param {string} bot
   * @returns {Bot}
   */
  public botsInfo(bot: string): Bot {
    const endPoint = SlackApiClient.BASE_PATH + "bots.info";
    const payload = { bot };

    const response = this.invokeAPI(endPoint, payload) as BotResponse;

    if (!response.ok) {
      throw new Error(
        `bots info faild. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response.bot;
  }

  private convertBlock2Text(blocks: (Block | Record<string, any>)[]): string {
    const textArray = [];
    blocks.forEach(block => {
      if (block.hasOwnProperty("type")) {
        const obj = block as Block;
        switch (obj.type) {
          case "context": {
            if (block.hasOwnProperty("elements")) {
              const contextBlock = block as ContextBlock;
              contextBlock.elements.forEach(element => {
                if (element.hasOwnProperty("text")) {
                  const textCompositionObject = element as TextCompositionObject;

                  textArray.push(textCompositionObject.text);
                }
              });
            }
            break;
          }
          case "header": {
            const headerBlock = block as HeaderBlock;
            textArray.push(headerBlock.text.text);
            break;
          }
          case "section": {
            const sectionBlock = block as SectionBlock;
            textArray.push(sectionBlock.text.text);
            break;
          }
        }
      }
    });
    return textArray.join("\n");
  }

  private postRequestHeader() {
    return {
      "content-type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${this.token}`
    };
  }

  private getRequestHeader() {
    return {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${this.token}`
    };
  }

  private multiPartRequestHeader(boundary: string) {
    return {
      "content-type": `multipart/form-data, boundary=${boundary}`,
      Authorization: `Bearer ${this.token}`
    };
  }

  private postRequestOptions(
    payload: string | Record<string, any>
  ): URLFetchRequestOptions {
    if (this.isFileUpload(payload)) {
      const boundary = this.constructor.name + Utilities.getUuid();

      return {
        method: "post",
        headers: this.multiPartRequestHeader(boundary),
        muteHttpExceptions: true,
        payload: this.createMultipartPayload(
          payload as Record<string, any>,
          boundary
        )
      };
    } else {
      return {
        method: "post",
        headers: this.postRequestHeader(),
        muteHttpExceptions: true,
        payload: payload instanceof String ? payload : JSON.stringify(payload)
      };
    }
  }

  private createMultipartPayload(
    payload: Record<string, any>,
    boundary: string
  ) {
    const parameterCount = Object.keys(payload).length;

    return Object.entries(payload).reduce<number[]>(
      (ar: number[], [k, v], i: number) => {
        let data;
        if (v.toString() === "Blob" && typeof v === "object") {
          data =
            'Content-Disposition: form-data; name="' +
            (k || "sample" + i) +
            '"; filename="' +
            (v.getName() || k || "sample" + i) +
            '"\r\n';
          data +=
            "Content-Type: " +
            (v.getContentType() || "application/octet-stream") +
            "; charset=UTF-8\r\n\r\n";
          Array.prototype.push.apply(ar, Utilities.newBlob(data).getBytes());
          ar = ar.concat(v.getBytes());
        } else {
          data =
            'Content-Disposition: form-data; name="' +
            (k || "sample" + i) +
            '"\r\n\r\n';
          data += v + "\r\n";
          Array.prototype.push.apply(ar, Utilities.newBlob(data).getBytes());
        }

        Array.prototype.push.apply(
          ar,
          Utilities.newBlob(
            "\r\n--" + boundary + (i === parameterCount - 1 ? "--" : "\r\n")
          ).getBytes()
        );
        return ar;
      },
      Utilities.newBlob("--" + boundary + "\r\n").getBytes()
    );
  }

  private isFileUpload(payload: string | Record<string, any>): boolean {
    if (typeof payload === "string") {
      return false;
    }

    return Object.values(payload).some(
      v => v.toString() === "Blob" && typeof v === "object"
    );
  }

  private getRequestOptions(): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "get",
      headers: this.getRequestHeader(),
      muteHttpExceptions: true
    };

    return options;
  }

  /**
   * @param endPoint Slack API endpoint
   * @param options
   * @throws NetworkAccessError
   */
  private invokeAPI(endPoint: string, payload: Record<string, any>): Response {
    let response!: HTTPResponse;

    try {
      switch (this.preferredHttpMethod(endPoint)) {
        case "post":
          response = UrlFetchApp.fetch(
            endPoint,
            this.postRequestOptions(payload)
          );
          break;
        case "get":
          response = UrlFetchApp.fetch(
            this.formUrlEncoded(endPoint, payload),
            this.getRequestOptions()
          );
          break;
      }
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        return JSON.parse(response.getContentText());
      default:
        console.warn(
          `Slack API error. endpoint: ${endPoint}, method: ${this.preferredHttpMethod(
            endPoint
          )}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private preferredHttpMethod(endPoint: string): HttpMethod {
    switch (true) {
      case /(.)*conversations\.history$/.test(endPoint):
      case /(.)*users\.info$/.test(endPoint):
      case /(.)*conversations\.info$/.test(endPoint):
      case /(.)*bots\.info$/.test(endPoint):
        return "get";
      default:
        return "post";
    }
  }

  private formUrlEncoded(
    endPoint: string,
    payload: Record<string, any>
  ): string {
    const query = Object.entries<string>(payload)
      .map(([key, value]) => `${key}=${encodeURI(value)}`)
      .join("&");

    return `${endPoint}?${query}`;
  }
}

export { SlackApiClient, NotInChannelError, File };
