import { OAuth2Handler } from "./OAuth2Handler";
import {
  UserCredentialStore,
  type UserCredential,
} from "./UserCredentialStore";
import { Slack } from "./slack/types/index.d";
import { SlackApiClient } from "./SlackApiClient";
import { WorksClient, WorksClientError } from "./WorksClient";
import { SlackWebhooks } from "./SlackWebhooks";
import { SlackHandler } from "./SlackHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { NetworkAccessError } from "./NetworkAccessError";
import { SlackCredentialStore } from "./SlackCredentialStore";
import { SlackConfigurator } from "./SlackConfigurator";
import "apps-script-jobqueue";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type DoGet = GoogleAppsScript.Events.DoGet;
type Commands = Slack.SlashCommand.Commands | Record<string, any>;
type ViewSubmission = Slack.Interactivity.ViewSubmission;
type BlockActions = Slack.Interactivity.BlockActions;
type AppsManifest = Slack.Tools.AppsManifest;
type Parameter = AppsScriptJobqueue.Parameter;
type TimeBasedEvent = AppsScriptJobqueue.TimeBasedEvent;
type AppMentionEvent = Slack.CallbackEvent.AppMentionEvent;

const properties = PropertiesService.getScriptProperties();

let handler: OAuth2Handler;

const handleCallback = (request): HtmlOutput => {
  initializeOAuth2Handler();
  return handler.authCallback(request);
};

function jobEventHandler(event: TimeBasedEvent): void {
  JobBroker.consumeJob(event, globalThis);
}

function initializeOAuth2Handler(): void {
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);
  const credential = slackCredentialStore.getCredential();

  handler = new OAuth2Handler(
    credential,
    PropertiesService.getUserProperties(),
    handleCallback.name,
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
    const properties = PropertiesService.getScriptProperties();
    const slackCredentialStore = new SlackCredentialStore(properties);
    slackCredentialStore.removeCredential();
    const slackConfigurator = new SlackConfigurator();
    slackConfigurator.deleteApps();

    const template = HtmlService.createTemplate(
      'Logout<br /><a href="<?= requestUrl ?>" target="_parent">refresh</a>.',
    );
    template.requestUrl = ScriptApp.getService().getUrl();
    return HtmlService.createHtmlOutput(template.evaluate());
  }
  // Reinstall the Slack app by accessing it with the get parameter `?reinstall=true`
  if (request.parameter.hasOwnProperty("reinstall")) {
    const slackConfigurator = new SlackConfigurator();
    const permissionsUpdated = slackConfigurator.updateApps(
      createAppsManifest([handler.callbackURL], handler.requestURL),
    );

    let template: HtmlTemplate;
    if (permissionsUpdated) {
      template = HtmlService.createTemplate(
        `You’ve changed the permission scopes your app uses. Please <a href="<?= reInstallUrl ?>" target="_parent">reinstall your app</a> for these changes to take effect.`,
      );
      template.reInstallUrl = handler.reInstallUrl;
    } else {
      template = HtmlService.createTemplate(
        `Reinstallation is complete.<br /><a href="<?= requestUrl ?>" target="_parent">refresh</a>.`,
      );
      template.requestUrl = ScriptApp.getService().getUrl();
    }
    return HtmlService.createHtmlOutput(template.evaluate()).setTitle("");
  }

  if (handler.verifyAccessToken()) {
    const template = HtmlService.createTemplate(
      "OK!<br />" +
        '<a href="<?!= reInstallUrl ?>" target="_parent" style="align-items:center;color:#000;background-color:#fff;border:1px solid #ddd;border-radius:4px;display:inline-flex;font-family:Lato, sans-serif;font-size:16px;font-weight:600;height:48px;justify-content:center;text-decoration:none;width:236px"><svg xmlns="http://www.w3.org/2000/svg" style="height:20px;width:20px;margin-right:12px" viewBox="0 0 122.8 122.8"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"></path><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"></path><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"></path><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"></path></svg>Reinstall to Slack</a>',
    );
    template.reInstallUrl = handler.requestURL + "?reinstall=true";
    return HtmlService.createHtmlOutput(template.evaluate()).setTitle(
      "Installation on Slack is complete",
    );
  }
  if (request.parameter.hasOwnProperty("token")) {
    return configuration(request.parameter);
  } else {
    const template = HtmlService.createTemplate(
      '<a href="https://api.slack.com/authentication/config-tokens#creating" target="_blank">Create configuration token</a><br />' +
        '<form action="<?!= requestURL ?>" method="get" target="_parent"><p>Configuration Tokens(Refresh Token):<input type="password" name="token" value="<?!= refreshToken ?>"></p><input type="submit" name="" value="Create App"></form>',
    );
    template.requestURL = handler.requestURL;
    template.refreshToken = new SlackConfigurator().refresh_token;
    return HtmlService.createHtmlOutput(template.evaluate()).setTitle(
      "Start Slack application configuration.",
    );
  }
}

function configuration(data: { [key: string]: string }): HtmlOutput {
  const slackConfigurator = new SlackConfigurator(data.token);
  const credentail = slackConfigurator.createApps(createAppsManifest());
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);

  slackCredentialStore.setCredential(credentail);

  const oAuth2Handler = new OAuth2Handler(
    credentail,
    PropertiesService.getUserProperties(),
    handleCallback.name,
  );

  slackConfigurator.updateApps(
    createAppsManifest([oAuth2Handler.callbackURL], oAuth2Handler.requestURL),
  );

  const template = HtmlService.createTemplate(
    '<a href="<?!= installUrl ?>" target="_parent" style="align-items:center;color:#000;background-color:#fff;border:1px solid #ddd;border-radius:4px;display:inline-flex;font-family:Lato, sans-serif;font-size:16px;font-weight:600;height:48px;justify-content:center;text-decoration:none;width:236px"><svg xmlns="http://www.w3.org/2000/svg" style="height:20px;width:20px;margin-right:12px" viewBox="0 0 122.8 122.8"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"></path><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"></path><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"></path><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"></path></svg>Add to Slack</a>',
  );
  template.installUrl = oAuth2Handler.installUrl;

  return HtmlService.createHtmlOutput(template.evaluate()).setTitle(
    "Slack application configuration is complete.",
  );
}

function createAppsManifest(
  redirectUrls: string[] = [],
  requestUrl = "",
): AppsManifest {
  const appsManifest = {
    display_information: {
      name: "hue-kintai-bot",
      long_description:
        "This bot performs attendance and clocking out of the attendance function of [HUE](https://www.worksap.co.jp/hues_features/), an ERP, via the bot.\nIt is developed as open source in [this repository](https://github.com/k2tzumi/hue-kintai-slask-command).",
      description: "This bot can make HUE attendance from slack slash command.",
      background_color: "#50afc8",
    },
  } as AppsManifest;

  if (redirectUrls.length !== 0 && requestUrl !== "") {
    appsManifest.features = {
      bot_user: {
        display_name: "hue-kintai-bot",
        always_online: false,
      },
      slash_commands: [
        {
          command: "/kintai",
          url: requestUrl,
          description: "HUE attendance command",
          usage_hint: "[start|end|config]",
          should_escape: false,
        },
      ],
    };

    appsManifest.oauth_config = {
      redirect_urls: redirectUrls,
      scopes: {
        bot: OAuth2Handler.SCOPE.split(","),
      },
    };

    appsManifest.settings = {
      event_subscriptions: {
        request_url: requestUrl,
        bot_events: ["app_mention"],
      },
      interactivity: {
        is_enabled: true,
        request_url: requestUrl,
      },
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
    };
  }

  return appsManifest;
}

function asyncLogging(parameter: Parameter): boolean {
  console.info(JSON.stringify(parameter));
  return true;
}

function doPost(e: DoPost): TextOutput {
  initializeOAuth2Handler();
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);
  const credentail = slackCredentialStore.getCredential();
  const slackHandler = new SlackHandler(credentail.verification_token);

  slackHandler.addCommandListener(COMMAND, executeSlashCommand);
  slackHandler.addInteractivityListener(
    "view_submission",
    executeViewSubmission,
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
      JobBroker.enqueueAsyncJob<Parameter>(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const WORKS_DOMAIN: string = properties.getProperty("WORKS_DOMAIN");
const WORKS_PROXY_DOMAIN: string = properties.getProperty("WORKS_PROXY_DOMAIN");

const worksClient = new WorksClient(WORKS_PROXY_DOMAIN, WORKS_DOMAIN);

const COMMAND = "/kintai";

const executeSlashCommand = (
  commands: Commands,
): { response_type: string; text: string } | null => {
  const store = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(commands.user_id),
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
        JobBroker.enqueueAsyncJob<Commands>(
          executeCommandStartKintai,
          commands,
        );
        response.response_type = "in_channel";
        response.text = `<@${commands.user_id}>\nおはようございます。出勤打刻します。`;
        break;
      case "e":
      case "end":
        JobBroker.enqueueAsyncJob<Commands>(executeCommandEndKintai, commands);
        response.response_type = "in_channel";
        response.text = `<@${commands.user_id}>\nおつかれさまでした。退勤打刻します。`;
        break;
      case "config":
        slackApiClient.openViews(
          createConfigureView(credential.userID),
          commands.trigger_id,
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
  initializeOAuth2Handler();
  return handler.makePassphraseSeeds(user_id);
}

function createConfigureView(userID: string = ""): Record<never, never> {
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

const executeViewSubmission = (
  viewSubmission: ViewSubmission,
): Record<never, never> => {
  JobBroker.enqueueAsyncJob<ViewSubmission>(validateCredential, viewSubmission);

  return {
    response_action: "update",
    view: createCredentialModal(
      "少々お待ち下さい。\n認証結果はダイレクトメッセージで通知します。",
    ),
  };
};

function validateCredential(viewSubmission: ViewSubmission): boolean {
  initializeOAuth2Handler();

  try {
    postDirectMessage(viewSubmission.user.id, "認証を開始します");

    worksClient.doLogin(getStateValues(viewSubmission));

    const store: UserCredentialStore = new UserCredentialStore(
      PropertiesService.getUserProperties(),
      makePassphraseSeeds(viewSubmission.user.id),
    );
    store.setUserCredential(viewSubmission.user.id, worksClient.credential);

    postDirectMessage(viewSubmission.user.id, "認証保存成功");
  } catch (e) {
    console.warn(`Validate credential error.${JSON.stringify(e)}`);

    postDirectMessage(
      viewSubmission.user.id,
      convertWorksClientErrorMessage(e, viewSubmission.user.id),
    );
  }
  return true;
}

function createCredentialModal(message: string): Record<never, never> {
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
    makePassphraseSeeds(blockActions.user.id),
  );

  store.removeUserCredential(blockActions.user.id);

  try {
    const slackApiClient = new SlackApiClient(handler.token);
    slackApiClient.updateViews(
      createCredentialModal("Credential reset successfull"),
      blockActions.view.hash,
      blockActions.view.id,
    );
  } catch (e) {
    JobBroker.enqueueAsyncJob<Parameter>(asyncLogging, {
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
    makePassphraseSeeds(event.user),
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
          JobBroker.enqueueAsyncJob<AppMentionEvent>(
            executeMentionStartKintai,
            event,
          );
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
          JobBroker.enqueueAsyncJob<AppMentionEvent>(
            executeMentionEndKintai,
            event,
          );
        }
        return;
      }
    }

    slackApiClient.chatPostMessage(
      event.channel,
      "なにか御用ですか？ :thinking_face:\nクレームなら作者に言ってくださいな :stuck_out_tongue:",
    );
  } else {
    slackApiClient.postEphemeral(
      event.channel,
      `Not exists credential.\nSend message \`${COMMAND} config\``,
      event.user,
    );
  }
};

const DEBUG: boolean = false;

function executeCommandStartKintai(commands: Commands): boolean {
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
    return false;
  }

  return true;
}

function executeMentionStartKintai(event: AppMentionEvent): boolean {
  initializeOAuth2Handler();
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
      event.ts,
    );
  } catch (e) {
    WorksClientErrorEventHandle(e, event);
    return false;
  }

  return true;
}

function executeCommandEndKintai(commands: Commands): boolean {
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
    return false;
  }

  return true;
}

function WorksClientErrorCommandHandle(e: Error, commands: Commands): void {
  const webhook = new SlackWebhooks(commands.response_url);
  webhook.sendText(
    convertWorksClientErrorMessage(e, commands.user_id),
    null,
    "ephemeral",
  );
}

function executeMentionEndKintai(event: AppMentionEvent): boolean {
  initializeOAuth2Handler();
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
      event.ts,
    );
  } catch (e) {
    WorksClientErrorEventHandle(e, event);
    return false;
  }

  return true;
}

function WorksClientErrorEventHandle(e: Error, event: AppMentionEvent): void {
  const client = new SlackApiClient(handler.token);
  client.postEphemeral(
    event.channel,
    convertWorksClientErrorMessage(e, event.user),
    event.user,
  );
}

function convertWorksClientErrorMessage(e: Error, user: string): string {
  switch (true) {
    case e instanceof WorksClientError:
      return `<@${user}>\nログインができませんでした。${JSON.stringify(
        e.message,
      )}\n\`${COMMAND} config\` で認証をやり直してください\n出退勤を手動で行う場合は<${
        worksClient.punchingURLForPc
      }|こちら>`;
    case e instanceof NetworkAccessError:
      return `<@${user}>\nWorksに正しくアクセスできませんでした。暫くしてやり直してみてください\n出退勤を手動で行う場合は<${worksClient.punchingURLForPc}|こちら>`;
    default:
      return `<@${user}>\nなにか問題が発生しました。\n出退勤を手動で行う場合は<${worksClient.punchingURLForPc}|こちら>\n${e.stack}`;
  }
}

function punch(user: string, action: string): string {
  const store: UserCredentialStore = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(user),
  );
  const credential: UserCredential = store.getUserCredential(user);

  if (credential) {
    return worksClient[action](credential);
  }

  throw new Error(`Not exists credential. user:${user}`);
}

export {
  executeSlashCommand,
  executeViewSubmission,
  initializeOAuth2Handler,
  doGet,
  doPost,
  jobEventHandler,
  validateCredential,
};
