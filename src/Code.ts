import { Slack } from "./slack/types/index.d";
import { OAuth2Handler } from "./OAuth2Handler";
import { UserCredentialStore, UserCredential } from "./UserCredentialStore";
import { SlackApiClient } from "./SlackApiClient";
import { HueClient, HueClientError } from "./HueClient";
import { JobBroker } from "./JobBroker";
import { SlackWebhooks } from "./SlackWebhooks";
import { SlackHandler } from "./SlackHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { NetworkAccessError } from "./NetworkAccessError";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type Commands = Slack.SlashCommand.Commands;
type ViewSubmission = Slack.Interactivity.ViewSubmission;
type BlockActions = Slack.Interactivity.BlockActions;
type AppMentionEvent = Slack.CallbackEvent.AppMentionEvent;

const properties = PropertiesService.getScriptProperties();

const CLIENT_ID: string = properties.getProperty("CLIENT_ID");
const CLIENT_SECRET: string = properties.getProperty("CLIENT_SECRET");
const HUE_SUB_DOMAIN: string = properties.getProperty("HUE_SUB_DOMAIN");
const hueClient: HueClient = new HueClient(HUE_SUB_DOMAIN);
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
function doGet(request): HtmlOutput {
  initializeOAuth2Handler();

  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.logout) {
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
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((parameter: {}) => {
    console.info(JSON.stringify(parameter));
  });
};

const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");
const COMMAND = "/kintai";

function doPost(e): TextOutput {
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
      new JobBroker().enqueue(asyncLogging, {
        message: exception.message,
        stack: exception.stack
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
    text: null
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
        new JobBroker().enqueue(executeCommandStartKintai, commands);
        response.response_type = "in_channel";
        response.text = `<@${commands.user_id}>\nおはようございます。出勤打刻します。`;
        break;
      case "e":
      case "end":
        new JobBroker().enqueue(executeCommandEndKintai, commands);
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
          text: "100010"
        },
        initial_value: userID,
        max_length: 20
      },
      label: {
        type: "plain_text",
        text: "ユーザID"
      },
      hint: {
        type: "plain_text",
        text: "ユーザIDを入力してください"
      }
    },
    {
      type: "input",
      block_id: "password",
      element: {
        type: "plain_text_input",
        action_id: "password",
        placeholder: {
          type: "plain_text",
          text: "*****"
        },
        max_length: 20
      },
      label: {
        type: "plain_text",
        text: "パスワード"
      },
      hint: {
        type: "plain_text",
        text: "パスワードを入力してください"
      }
    }
  ];
  if (userID !== "") {
    const resetBlock: {} = {
      type: "section",
      block_id: "reset",
      text: {
        type: "plain_text",
        text: "パスワードを更新します。\n削除する場合はResetを押してください。"
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reset"
        },
        value: "reset",
        action_id: "reset",
        style: "danger",
        confirm: {
          title: {
            type: "plain_text",
            text: "ユーザーIDとパスワードをリセットしても良いですか？"
          },
          text: {
            type: "plain_text",
            text: "リセットすると勤怠登録ができなくなります"
          },
          confirm: {
            type: "plain_text",
            text: "リセット"
          },
          deny: {
            type: "plain_text",
            text: "やめる"
          }
        }
      }
    };

    blocks = [resetBlock, ...blocks];
  }

  const view = {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Setting HUE Credential."
    },
    callback_id: "save-credential",
    submit: {
      type: "plain_text",
      text: userID === "" ? "Save" : "Update"
    },
    blocks
  };

  return view;
}

const executeViewSubmission = (viewSubmission: ViewSubmission): {} => {
  try {
    const errors: {} | null = validateViewSubmisstion(viewSubmission);

    if (errors) {
      return errors;
    } else {
      const store: UserCredentialStore = new UserCredentialStore(
        PropertiesService.getUserProperties(),
        makePassphraseSeeds(viewSubmission.user.id)
      );
      store.setUserCredential(viewSubmission.user.id, hueClient.credential);

      const update = {
        response_action: "update",
        view: createCredentialModal("Credential save successfull")
      };

      return update;
    }
  } catch (e) {
    new JobBroker().enqueue(asyncLogging, {
      message: e.message,
      stack: e.stack
    });

    const failure: {} = {
      response_action: "update",
      view: createCredentialModal(
        `executeViewSubmission failure.\nname: ${e.name} \nmessage: ${e.message} \nstack: ${e.stack} `
      )
    };

    return failure;
  }
};

function createCredentialModal(message: string): {} {
  return {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Setting HUE Credential"
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: message
        }
      }
    ]
  };
}

function validateViewSubmisstion(viewSubmission: ViewSubmission): {} | null {
  hueClient.doLogin(getStateValues(viewSubmission));

  if (hueClient.authenticated) {
    return null;
  } else {
    return {
      response_action: "errors",
      errors: {
        userID: "ユーザーIDまたはパスワードが間違っています",
        password: "ユーザーIDまたはパスワードが間違っています"
      }
    };
  }
}

function getStateValues(viewSubmission: ViewSubmission): UserCredential {
  const values = viewSubmission.view.state.values;

  const credential: UserCredential = {
    userID: values.userID.userID.value,
    password: values.password.password.value
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
    new JobBroker().enqueue(asyncLogging, {
      message: e.message,
      stack: e.stack
    });
  }
};

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
          "こんにちは"
        ].some(word => message.indexOf(word) !== -1)
      ) {
        if (
          slackApiClient.addReactions(event.channel, START_REACTION, event.ts)
        ) {
          new JobBroker().enqueue(executeMentionStartKintai, event);
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
          "goodby",
          "Goodby",
          "グッバイ",
          "さようなら"
        ].some(word => message.indexOf(word) !== -1)
      ) {
        if (
          slackApiClient.addReactions(event.channel, END_REACTION, event.ts)
        ) {
          new JobBroker().enqueue(executeMentionEndKintai, event);
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
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((commands: Commands) => {
    let startMessage: string;
    try {
      if (DEBUG) {
        startMessage = "executeCommandStartKintai";
      } else {
        startMessage = punchIn(commands.user_id, HueClient.START_SUBMIT);
      }

      const webhook = new SlackWebhooks(commands.response_url);
      webhook.sendText(`<@${commands.user_id}>\n${startMessage}`);
    } catch (e) {
      hueClientErrorCommandHandle(e, commands);
    }
  });
};

const executeMentionStartKintai = (): void => {
  initializeOAuth2Handler();
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((event: AppMentionEvent) => {
    let startMessage: string;
    try {
      if (DEBUG) {
        startMessage = "executeMentionStartKintai";
      } else {
        startMessage = punchIn(event.user, HueClient.START_SUBMIT);
      }

      const client = new SlackApiClient(handler.token);
      client.chatPostMessage(
        event.channel,
        `<@${event.user}>\n${startMessage}`,
        event.ts
      );
    } catch (e) {
      hueClientErrorEventHandle(e, event);
    }
  });
};

const executeCommandEndKintai = (): void => {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((commands: Commands) => {
    let endMessage: string;
    try {
      if (DEBUG) {
        endMessage = "executeCommandEndKintai";
      } else {
        endMessage = punchIn(commands.user_id, HueClient.END_SUBMIT);
      }

      const webhook = new SlackWebhooks(commands.response_url);
      webhook.sendText(`<@${commands.user_id}>\n${endMessage}`);
    } catch (e) {
      hueClientErrorCommandHandle(e, commands);
    }
  });
};

function hueClientErrorCommandHandle(e: Error, commands: Commands): void {
  const webhook = new SlackWebhooks(commands.response_url);
  webhook.sendText(convertHueClientErrorMessage(e), null, "ephemeral");
}

const executeMentionEndKintai = (): void => {
  initializeOAuth2Handler();
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((event: AppMentionEvent) => {
    let endMessage: string;
    try {
      if (DEBUG) {
        endMessage = "executeMentionEndKintai";
      } else {
        endMessage = punchIn(event.user, HueClient.END_SUBMIT);
      }

      const client = new SlackApiClient(handler.token);
      client.chatPostMessage(
        event.channel,
        `<@${event.user}>\n${endMessage}`,
        event.ts
      );
    } catch (e) {
      hueClientErrorEventHandle(e, event);
    }
  });
};

function hueClientErrorEventHandle(e: Error, event: AppMentionEvent): void {
  const client = new SlackApiClient(handler.token);
  client.postEphemeral(
    event.channel,
    convertHueClientErrorMessage(e),
    event.user
  );
}

function convertHueClientErrorMessage(e: Error): string {
  switch (true) {
    case e instanceof HueClientError:
      return `ログインができませんでした。\`${COMMAND} config\` で認証をやり直してください`;
    case e instanceof NetworkAccessError:
      return "HUEに正しくアクセスできませんでした。暫くしてやり直してみてください";
    default:
      return "なにか問題が発生しました。";
  }
}

function punchIn(user: string, type: string): string {
  const store: UserCredentialStore = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(user)
  );
  const credential: UserCredential = store.getUserCredential(user);

  if (credential) {
    return hueClient.doLogin(credential).punchIn(type);
  }

  throw new Error(`Not exists credential. user:${user}`);
}

export { executeSlashCommand, executeViewSubmission, initializeOAuth2Handler };
