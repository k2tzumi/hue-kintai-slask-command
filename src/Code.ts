import { Slack } from "./slack/types/index.d";
import { OAuth2Handler } from "./OAuth2Handler";
import { UserCredentialStore, UserCredential } from "./UserCredentialStore";
import { SlackApiClient } from "./SlackApiClient";
import { WorksClient, WorksClientError } from "./WorksClient";
import { SlackWebhooks } from "./SlackWebhooks";
import { SlackHandler } from "./SlackHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { NetworkAccessError } from "./NetworkAccessError";
// import { JobBroker } from "apps-script-jobqueue";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type DoGet = GoogleAppsScript.Events.DoGet;
type Commands = Slack.SlashCommand.Commands | Record<string, any>;
type ViewSubmission = Slack.Interactivity.ViewSubmission;
type BlockActions = Slack.Interactivity.BlockActions;
type AppMentionEvent =
  | Slack.CallbackEvent.AppMentionEvent
  | Record<string, any>;

const properties = PropertiesService.getScriptProperties();

const CLIENT_ID: string = properties.getProperty("CLIENT_ID");
const CLIENT_SECRET: string = properties.getProperty("CLIENT_SECRET");
const WORKS_DOMAIN: string = properties.getProperty("WORKS_DOMAIN");
const WORKS_PROXY_DOMAIN: string = properties.getProperty("WORKS_PROXY_DOMAIN");

const worksClient = new WorksClient(WORKS_PROXY_DOMAIN, WORKS_DOMAIN);
let handler: OAuth2Handler;

const handleCallback = (request): HtmlOutput => {
  initializeOAuth2Handler();
  return handler.authCallback(request);
};

function initializeOAuth2Handler(): void {
  handler = new OAuth2Handler(
    CLIENT_ID,
    CLIENT_SECRET,
    PropertiesService.getUserProperties(),
    handleCallback.name
  );
}

/**
 * Authorizes and makes a request to the Slack API.
 */
function doGet(request: DoGet): HtmlOutput {
  initializeOAuth2Handler();

  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.hasOwnProperty("logout")) {
    handler.clearService();
    const template = HtmlService.createTemplate(
      'Logout<br /><a href="<?= requestUrl ?>" target="_blank">refresh</a>.'
    );
    template.requestUrl = handler.requestURL;
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  if (handler.verifyAccessToken()) {
    return HtmlService.createHtmlOutput("OK");
  } else {
    const template = HtmlService.createTemplate(
      'RedirectUri:<?= redirectUrl ?> <br /><a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>.'
    );
    template.authorizationUrl = handler.authorizationUrl;
    template.redirectUrl = handler.redirectUri;
    return HtmlService.createHtmlOutput(template.evaluate());
  }
}

const asyncLogging = (): void => {
  JobBroker.consumeAsyncJob((parameter: Record<string, any>) => {
    console.info(JSON.stringify(parameter));
  }, "asyncLogging");
};

const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");
const COMMAND = "/kintai";

function doPost(e: DoPost): TextOutput {
  initializeOAuth2Handler();

  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCommandListener(COMMAND, executeSlashCommand);
  slackHandler.addInteractivityListener(
    "view_submission",
    executeViewSubmission
  );
  slackHandler.addInteractivityListener("button", executeBlockActions);
  slackHandler.addCallbackEventListener("app_mention", executeAppMentionEvent);

  try {
    const process = slackHandler.handle(e);

    if (process.performed) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      JobBroker.enqueueAsyncJob(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const executeSlashCommand = (
  commands: Commands
): { response_type: string; text: string } | null => {
  const store = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(commands.user_id)
  );
  const credential: UserCredential = store.getUserCredential(commands.user_id);

  const response = {
    response_type: null,
    text: null,
  };

  const slackApiClient = new SlackApiClient(handler.token);

  if (credential === null) {
    slackApiClient.openViews(createConfigureView(), commands.trigger_id);

    response.response_type = "ephemeral";
    response.text = "Not exists credential.";
  } else {
    switch (commands.text) {
      case "s":
      case "start":
        JobBroker.enqueueAsyncJob(executeCommandStartKintai, commands);
        response.response_type = "in_channel";
        response.text = `<@${commands.user_id}>\nおはようございます。出勤打刻します。`;
        break;
      case "e":
      case "end":
        JobBroker.enqueueAsyncJob(executeCommandEndKintai, commands);
        response.response_type = "in_channel";
        response.text = `<@${commands.user_id}>\nおつかれさまでした。退勤打刻します。`;
        break;
      case "config":
        slackApiClient.openViews(
          createConfigureView(credential.userID),
          commands.trigger_id
        );

        return null;
      case "help":
      default:
        response.response_type = "ephemeral";
        response.text = `*Usage*\n* ${COMMAND} [s|start]\n* ${COMMAND} [e|end]\n* ${COMMAND} config\n* ${COMMAND} help\n* Send message \`@huekintaibot おはよう\``;
        break;
    }
  }

  return response;
};

function makePassphraseSeeds(user_id: string): string {
  return CLIENT_ID + user_id + CLIENT_SECRET;
}

function createConfigureView(userID: string = ""): {} {
  let blocks = [
    {
      type: "input",
      block_id: "userID",
      element: {
        type: "plain_text_input",
        action_id: "userID",
        placeholder: {
          type: "plain_text",
          text: "100010",
        },
        initial_value: userID,
        max_length: 20,
      },
      label: {
        type: "plain_text",
        text: "ユーザID",
      },
      hint: {
        type: "plain_text",
        text: "ユーザIDを入力してください",
      },
    },
    {
      type: "input",
      block_id: "password",
      element: {
        type: "plain_text_input",
        action_id: "password",
        placeholder: {
          type: "plain_text",
          text: "*****",
        },
        max_length: 20,
      },
      label: {
        type: "plain_text",
        text: "パスワード",
      },
      hint: {
        type: "plain_text",
        text: "パスワードを入力してください",
      },
    },
  ];
  if (userID !== "") {
    const resetBlock: Record<string, any> = {
      type: "section",
      block_id: "reset",
      text: {
        type: "plain_text",
        text: "パスワードを更新します。\n削除する場合はResetを押してください。",
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reset",
        },
        value: "reset",
        action_id: "reset",
        style: "danger",
        confirm: {
          title: {
            type: "plain_text",
            text: "ユーザーIDとパスワードをリセットしても良いですか？",
          },
          text: {
            type: "plain_text",
            text: "リセットすると勤怠登録ができなくなります",
          },
          confirm: {
            type: "plain_text",
            text: "リセット",
          },
          deny: {
            type: "plain_text",
            text: "やめる",
          },
        },
      },
    };

    blocks = [resetBlock, ...blocks];
  }

  const view = {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Setting Credential",
    },
    callback_id: "save-credential",
    submit: {
      type: "plain_text",
      text: userID === "" ? "Save" : "Update",
    },
    blocks,
  };

  return view;
}

const executeViewSubmission = (viewSubmission: ViewSubmission): {} => {
  JobBroker.enqueueAsyncJob(validateCredential, viewSubmission);

  return {
    response_action: "update",
    view: createCredentialModal(
      "少々お待ち下さい。\n認証結果はダイレクトメッセージで通知します。"
    ),
  };
};

const validateCredential = () => {
  initializeOAuth2Handler();
  JobBroker.consumeAsyncJob((viewSubmission: ViewSubmission) => {
    try {
      postDirectMessage(viewSubmission.user.id, "認証を開始します");

      worksClient.doLogin(getStateValues(viewSubmission));

      const store: UserCredentialStore = new UserCredentialStore(
        PropertiesService.getUserProperties(),
        makePassphraseSeeds(viewSubmission.user.id)
      );
      store.setUserCredential(viewSubmission.user.id, worksClient.credential);

      postDirectMessage(viewSubmission.user.id, "認証保存成功");
    } catch (e) {
      console.warn(`Validate credential error.${e.stack}`);

      postDirectMessage(
        viewSubmission.user.id,
        convertWorksClientErrorMessage(e, viewSubmission.user.id)
      );
    }
  }, "validateCredential");
};

function createCredentialModal(message: string): {} {
  return {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Setting Credential",
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: message,
        },
      },
    ],
  };
}

function getStateValues(viewSubmission: ViewSubmission): UserCredential {
  const values = viewSubmission.view.state.values;

  const credential: UserCredential = {
    userID: values.userID.userID.value,
    password: values.password.password.value,
  };

  return credential;
}

const executeBlockActions = (blockActions: BlockActions): void => {
  const store: UserCredentialStore = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(blockActions.user.id)
  );

  store.removeUserCredential(blockActions.user.id);

  try {
    const slackApiClient = new SlackApiClient(handler.token);
    slackApiClient.updateViews(
      createCredentialModal("Credential reset successfull"),
      blockActions.view.hash,
      blockActions.view.id
    );
  } catch (e) {
    JobBroker.enqueueAsyncJob(asyncLogging, {
      message: e.message,
      stack: e.stack,
    });
  }
};

function postDirectMessage(userID: string, message: string) {
  const slackApiClient = new SlackApiClient(handler.token);

  const channelID = slackApiClient.conversationsOpen([userID]);

  slackApiClient.chatPostMessage(channelID, message);
}

const START_REACTION: string =
  properties.getProperty("START_REACTION") || "sunny";
const END_REACTION: string =
  properties.getProperty("END_REACTION") || "confetti_ball";

const executeAppMentionEvent = (event: AppMentionEvent): void => {
  const slackApiClient = new SlackApiClient(handler.token);
  const store = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(event.user)
  );
  const credential: UserCredential = store.getUserCredential(event.user);

  if (credential) {
    const messages = event.text.split("\n");

    for (const message of messages) {
      if (
        [
          "おはよう",
          "始業",
          "開始",
          "hello",
          "Hello",
          "ハロー",
          "こんにちは",
          "出勤",
          "出社",
        ].some((word) => message.indexOf(word) !== -1)
      ) {
        if (
          slackApiClient.addReactions(event.channel, START_REACTION, event.ts)
        ) {
          JobBroker.enqueueAsyncJob(executeMentionStartKintai, event);
        }
        return;
      }
      if (
        [
          "おつかれ",
          "お疲",
          "終業",
          "終了",
          "終わり",
          "早退",
          "goodbye",
          "Goodbye",
          "グッバイ",
          "さようなら",
          "退勤",
        ].some((word) => message.indexOf(word) !== -1)
      ) {
        if (
          slackApiClient.addReactions(event.channel, END_REACTION, event.ts)
        ) {
          JobBroker.enqueueAsyncJob(executeMentionEndKintai, event);
        }
        return;
      }
    }

    slackApiClient.chatPostMessage(
      event.channel,
      "なにか御用ですか？ :thinking_face:\nクレームなら作者に言ってくださいな :stuck_out_tongue:"
    );
  } else {
    slackApiClient.postEphemeral(
      event.channel,
      `Not exists credential.\nSend message \`${COMMAND} config\``,
      event.user
    );
  }
};

const DEBUG: boolean = false;

const executeCommandStartKintai = (): void => {
  JobBroker.consumeAsyncJob((commands: Commands) => {
    let startMessage: string;
    try {
      if (DEBUG) {
        startMessage = "executeCommandStartKintai";
      } else {
        startMessage = punch(commands.user_id, "doPunchIn");
      }

      const webhook = new SlackWebhooks(commands.response_url);
      webhook.sendText(`<@${commands.user_id}>\n${startMessage}`);
    } catch (e) {
      WorksClientErrorCommandHandle(e, commands);
    }
  }, "executeCommandStartKintai");
};

const executeMentionStartKintai = (): void => {
  initializeOAuth2Handler();
  JobBroker.consumeAsyncJob((event: AppMentionEvent) => {
    let startMessage: string;
    try {
      if (DEBUG) {
        startMessage = "executeMentionStartKintai";
      } else {
        startMessage = punch(event.user, "doPunchIn");
      }

      const client = new SlackApiClient(handler.token);
      client.chatPostMessage(
        event.channel,
        `<@${event.user}>\n${startMessage}`,
        event.ts
      );
    } catch (e) {
      WorksClientErrorEventHandle(e, event);
    }
  }, "executeMentionStartKintai");
};

const executeCommandEndKintai = (): void => {
  JobBroker.consumeAsyncJob((commands: Commands) => {
    let endMessage: string;
    try {
      if (DEBUG) {
        endMessage = "executeCommandEndKintai";
      } else {
        endMessage = punch(commands.user_id, "doPunchOut");
      }

      const webhook = new SlackWebhooks(commands.response_url);
      webhook.sendText(`<@${commands.user_id}>\n${endMessage}`);
    } catch (e) {
      WorksClientErrorCommandHandle(e, commands);
    }
  }, "executeCommandEndKintai");
};

function WorksClientErrorCommandHandle(e: Error, commands: Commands): void {
  const webhook = new SlackWebhooks(commands.response_url);
  webhook.sendText(
    convertWorksClientErrorMessage(e, commands.user_id),
    null,
    "ephemeral"
  );
}

const executeMentionEndKintai = (): void => {
  initializeOAuth2Handler();
  JobBroker.consumeAsyncJob((event: AppMentionEvent) => {
    let endMessage: string;
    try {
      if (DEBUG) {
        endMessage = "executeMentionEndKintai";
      } else {
        endMessage = punch(event.user, "doPunchOut");
      }

      const client = new SlackApiClient(handler.token);
      client.chatPostMessage(
        event.channel,
        `<@${event.user}>\n${endMessage}`,
        event.ts
      );
    } catch (e) {
      WorksClientErrorEventHandle(e, event);
    }
  }, "executeMentionEndKintai");
};

function WorksClientErrorEventHandle(e: Error, event: AppMentionEvent): void {
  const client = new SlackApiClient(handler.token);
  client.postEphemeral(
    event.channel,
    convertWorksClientErrorMessage(e, event.user),
    event.user
  );
}

function convertWorksClientErrorMessage(e: Error, user: string): string {
  switch (true) {
    case e instanceof WorksClientError:
      return `<@${user}>\nログインができませんでした。${e.message}\n\`${COMMAND} config\` で認証をやり直してください\n出退勤を手動で行う場合は<${worksClient.punchingURLForPc}|こちら>`;
    case e instanceof NetworkAccessError:
      return `<@${user}>\nWorksに正しくアクセスできませんでした。暫くしてやり直してみてください\n出退勤を手動で行う場合は<${worksClient.punchingURLForPc}|こちら>`;
    default:
      return `<@${user}>\nなにか問題が発生しました。\n出退勤を手動で行う場合は<${worksClient.punchingURLForPc}|こちら>\n${e.stack}`;
  }
}

function punch(user: string, action: string): string {
  const store: UserCredentialStore = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(user)
  );
  const credential: UserCredential = store.getUserCredential(user);

  if (credential) {
    return worksClient[action](credential);
  }

  throw new Error(`Not exists credential. user:${user}`);
}

export { executeSlashCommand, executeViewSubmission, initializeOAuth2Handler };
