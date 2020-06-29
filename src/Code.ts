import { OAuth2Handler } from "./OAuth2Handler";
import { Commands } from "./Commands";
import { UserCredentialStore, UserCredential } from "./UserCredentialStore";
import { SlackClient } from "./SlackClient";
import { ViewSubmission } from "./ViewSubmission";
import { HueClient } from "./HueClient";
import { JobBroker } from "./JobBroker"
import { SlackWebhooks } from "./SlackWebhooks";
import { BlockActions } from "./BlockActions";

type TextOutput = GoogleAppsScript.Content.TextOutput
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;

const properties = PropertiesService.getScriptProperties();

const CLIENT_ID: string = properties.getProperty("CLIENT_ID");
const CLIENT_SECRET: string = properties.getProperty("CLIENT_SECRET");
const handler = new OAuth2Handler(CLIENT_ID, CLIENT_SECRET, PropertiesService.getUserProperties(), 'handleCallback');
const HUE_SUB_DOMAIN: string = properties.getProperty("HUE_SUB_DOMAIN");
const hueClient: HueClient = new HueClient(HUE_SUB_DOMAIN);

/**
 * Authorizes and makes a request to the Slack API.
 */
function doGet(request): HtmlOutput {
  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.logout) {
    handler.clearService();
    const template = HtmlService.createTemplate('Logout<br /><a href="<?= requestUrl ?>" target="_blank">refresh</a>.');
    template.requestUrl = getRequestURL();
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  if (handler.verifyAccessToken()) {
    return HtmlService.createHtmlOutput('OK');
  } else {
    const template = HtmlService.createTemplate('RedirectUri:<?= redirectUrl ?> <br /><a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>.');
    template.authorizationUrl = handler.authorizationUrl;
    template.redirectUrl = handler.redirectUri;
    return HtmlService.createHtmlOutput(template.evaluate());
  }
}

function getRequestURL() {
  const serviceURL = ScriptApp.getService().getUrl();
  return serviceURL.replace('/dev', '/exec');
}

function handleCallback(request): HtmlOutput {
  return handler.authCallback(request);
}

function doPost(e): TextOutput {
  const { token, command, payload } = e.parameter;

  if (command) {
    validateVerificationToken(token);

    return executeSlashCommand(e.parameter);
  }

  if (payload) {
    const request = JSON.parse(payload);

    validateVerificationToken(request.token);

    switch (request.type) {
      case 'view_submission':
        return executeViewSubmission(request);
      case 'block_actions':
        return executeBlockActions(request);
      default:
        throw new Error("Unkonw request.");
    }
  }

  throw new Error("Unkonw request.");
}

const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");

function validateVerificationToken(token: string | null): void {
  if (token !== VERIFICATION_TOKEN) {
    console.warn("Invalid verification toekn: %s", token);
    throw new Error("Invalid verification token.");
  }
}

function executeSlashCommand(commands: Commands): TextOutput {
  const store: UserCredentialStore = new UserCredentialStore(PropertiesService.getUserProperties(), makePassphrase(commands.user_id));
  const credential: UserCredential = store.getUserCredential(commands.user_id);

  let response = {
    "response_type": null,
    "text": null
  };

  const slackClient = new SlackClient(handler.token);

  if (credential === null) {
    slackClient.openViews(createConfigureView(), commands.trigger_id);

    response.response_type = 'ephemeral';
    response.text = "Not exists credential.";
  } else {
    switch (commands.text) {
      case 's':
      case 'start':
        new JobBroker().enqueue('executeStartKintai', commands);
        response.response_type = 'in_channel';
        response.text = `<@${commands.user_id}>\nおはようございます。出勤打刻します。`;
        break;
      case 'e':
      case 'end':
        new JobBroker().enqueue('executeEndKintai', commands);
        response.response_type = 'in_channel';
        response.text = `<@${commands.user_id}>\nおつかれさまでした。退勤打刻します。`;
        break;
      case 'config':
        slackClient.openViews(createConfigureView(credential.userID), commands.trigger_id);

        return ContentService.createTextOutput('');
      case 'help':
      default:
        response.response_type = 'ephemeral';
        response.text = "*Usage*\n* /kintai [s|start]\n* /kintai [e|end]\n* /kintai config\n* /kintai help";
        break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function makePassphrase(seeds: string): string {
  const digest: number[] = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1,
    CLIENT_ID + seeds + CLIENT_SECRET,
    Utilities.Charset.US_ASCII);

  return digest.map(function (b) { return ("0" + (b < 0 && b + 256 || b).toString(16)).substr(-2) }).join("");
}

function createConfigureView(userID: string = '') {
  let view = {
    "type": "modal",
    "title": {
      "type": "plain_text",
      "text": "Setting HUE Credential.",
    },
    "callback_id": "save-credential",
    "submit": {
      "type": "plain_text",
      "text": userID === '' ? "Save" : "Update",
    },
    "blocks": [
      {
        "type": "input",
        "block_id": "userID",
        "element": {
          "type": "plain_text_input",
          "action_id": "userID",
          "placeholder": {
            "type": "plain_text",
            "text": "100010"
          },
          "initial_value": userID,
          "max_length": 20
        },
        "label": {
          "type": "plain_text",
          "text": "ユーザID"
        },
        "hint": {
          "type": "plain_text",
          "text": "ユーザIDを入力してください"

        }
      },
      {
        "type": "input",
        "block_id": "password",
        "element": {
          "type": "plain_text_input",
          "action_id": "password",
          "placeholder": {
            "type": "plain_text",
            "text": "*****"
          },
          "max_length": 20
        },
        "label": {
          "type": "plain_text",
          "text": "パスワード"
        },
        "hint": {
          "type": "plain_text",
          "text": "パスワードを入力してください"

        }
      },
    ]
  };

  if (userID !== '') {
    const resetBlock = {
      "type": "section",
      "block_id": "reset",
      "text": {
        "type": "plain_text",
        "text": "パスワードを更新します。\n削除する場合はResetを押してください。"
      },
      "accessory": {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Reset"
        },
        "value": "reset",
        "action_id": "reset",
        "style": "danger",
        "confirm": {
          "title": {
            "type": "plain_text",
            "text": "ユーザーIDとパスワードをリセットしても良いですか？",
          },
          "text": {
            "type": "plain_text",
            "text": "リセットすると勤怠登録ができなくなります"
          },
          "confirm": {
            "type": "plain_text",
            "text": "リセット"
          },
          "deny": {
            "type": "plain_text",
            "text": "やめる"
          }
        }
      }
    };

    view.blocks.unshift(resetBlock);
  }

  return view;
}

function executeViewSubmission(viewSubmission: ViewSubmission): TextOutput {
  try {
    const errors: object | null = validateViewSubmisstion(viewSubmission);

    if (errors) {
      return ContentService.createTextOutput(JSON.stringify(errors)).setMimeType(
        ContentService.MimeType.JSON
      );
    } else {
      const store: UserCredentialStore = new UserCredentialStore(PropertiesService.getUserProperties(), makePassphrase(viewSubmission.user.id));
      store.setUserCredential(viewSubmission.user.id, hueClient.credential);

      const update = {
        "response_action": "update",
        "view": createCredentialModal("Credential save successfull")
      };

      return ContentService.createTextOutput(JSON.stringify(update)).setMimeType(
        ContentService.MimeType.JSON
      );
    }
  } catch (e) {
    new JobBroker().enqueue('asyncLogging', { message: e.message, stack: e.stack });

    const failure = {
      "response_action": "update",
      "view": createCredentialModal(`executeViewSubmission failure.\nname: ${e.name}\nmessage: ${e.message}\nstack: ${e.stack}`)
    };

    return ContentService.createTextOutput(JSON.stringify(failure)).setMimeType(
      ContentService.MimeType.JSON
    );
  }
}

function createCredentialModal(message: string): object {
  return {
    "type": "modal",
    "title": {
      "type": "plain_text",
      "text": "Setting HUE Credential"
    },
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": message
        }
      }
    ]
  };
}

function validateViewSubmisstion(viewSubmission: ViewSubmission): object | null {
  hueClient.doLogin(getStateValues(viewSubmission));

  if (hueClient.authenticated) {
    return null;
  } else {
    return {
      "response_action": "errors",
      "errors": {
        "userID": "ユーザーIDまたはパスワードが間違っています",
        "password": "ユーザーIDまたßはパスワードが間違っています"
      }
    };
  }
}

function executeBlockActions(blockActions: BlockActions): TextOutput {
  const store: UserCredentialStore = new UserCredentialStore(PropertiesService.getUserProperties(), makePassphrase(blockActions.user.id));

  store.removeUserCredential(blockActions.user.id);

  try {
    const slackClient = new SlackClient(handler.token);

    slackClient.updateViews(createCredentialModal("Credential reset successfull"), blockActions.view.hash, blockActions.view.id);
  } catch (e) {
    new JobBroker().enqueue('asyncLogging', { message: e.message, stack: e.stack });
  }

  return ContentService.createTextOutput("").setMimeType(
    ContentService.MimeType.JSON
  );
}

function asyncLogging(parameter: any): void {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((parameter: any) => {
    console.info(JSON.stringify(parameter));
  });
}

function getStateValues(viewSubmission: ViewSubmission): UserCredential {
  const values = viewSubmission.view.state.values;

  const credential: UserCredential = {
    userID: values.userID.userID.value,
    password: values.password.password.value
  };

  return credential;
}

function executeStartKintai(): void {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((commands: Commands) => {
    // const slackClient = new SlackClient(handler.token);
    // slackClient.addReactions(commands.channel_id, 'sunny', commands.trigger_id);

    const store: UserCredentialStore = new UserCredentialStore(PropertiesService.getUserProperties(), makePassphrase(commands.user_id));
    const credential: UserCredential = store.getUserCredential(commands.user_id);

    const startMessage = hueClient.doLogin(credential).punchIn(HueClient.START_SUBMIT);

    const webhook: SlackWebhooks = new SlackWebhooks(commands.response_url);
    webhook.invoke(`<@${commands.user_id}>\n${startMessage}`);
  });
}

function executeEndKintai(): void {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((commands: Commands) => {
    // const slackClient = new SlackClient(handler.token);
    // slackClient.addReactions(commands.channel_id, 'checkered_flag', commands.trigger_id);

    const store: UserCredentialStore = new UserCredentialStore(PropertiesService.getUserProperties(), makePassphrase(commands.user_id));
    const credential: UserCredential = store.getUserCredential(commands.user_id);

    const endMessage = hueClient.doLogin(credential).punchIn(HueClient.END_SUBMIT);

    const webhook: SlackWebhooks = new SlackWebhooks(commands.response_url);
    webhook.invoke(`<@${commands.user_id}>\n${endMessage}`);
  });
}

export { executeSlashCommand, executeViewSubmission }