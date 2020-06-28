import { Commands } from "./Commands";
import { ViewSubmission } from "./ViewSubmission";
import { executeSlashCommand, executeViewSubmission } from "./Code"

function testExecuteSlashCommand() {
  const commands: Commands =
  {
    token: "gIkuvaNzQIHg97ATvDxqgjtO",
    team_id: "T0001",
    team_domain: "example",
    enterprise_id: "E0001",
    enterprise_name: "Globular%20Construct%20Inc",
    channel_id: "C2147483705",
    channel_name: "test",
    user_id: "U2147483697",
    user_name: "Steve",
    command: "/weather",
    text: "94070",
    response_url: "https://hooks.slack.com/commands/1234/5678",
    trigger_id: "13345224609.738474920.8088930838d88f008e0"
  };

  executeSlashCommand(commands);
}

function testExecuteViewSubmission() {
  const ViewSubmission: ViewSubmission =
  {
    token: "gIkuvaNzQIHg97ATvDxqgjtO",
    team: { id: "T0001", domain: "example" },
    user: { id: "U2147483697", name: "test" },
    view: {
      id: "VNHU13V36",
      type: "modal",
      title: { type: "plain_text", text: "test" },
      private_metadata: "shhh-its-secret",
      callback_id: "modal -with-inputs",
      state: {
        values: {
          "multi-line": {
            "ml-value": {
              "type": "plain_text_input",
              "value": "This is my example inputted value"
            }
          }
        }
      },
      hash: "156663117.cd33ad1f"
    }
  };

  executeViewSubmission(ViewSubmission);
}
