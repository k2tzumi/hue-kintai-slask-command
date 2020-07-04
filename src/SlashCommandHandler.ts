import { SlackBaseHandler } from "./SlackBaseHandler";
import { Commands } from "./Commands";

type TextOutput = GoogleAppsScript.Content.TextOutput;

class SlashCommandHandler extends SlackBaseHandler {

    public handle(e): { performed: boolean; output: TextOutput | null; } {
        const { token, command } = e.parameter;

        if (command) {
            this.validateVerificationToken(token);
            return { performed: true, output: this.convertJSONOutput(this.bindCommand(e.parameter)) };
        }

        return { performed: false, output: null };
    }

    private bindCommand(commands: Commands): {} {
        const { trigger_id, command } = commands;
        if (this.isHandleProceeded(trigger_id)) {
            throw new Error(`Slash command duplicate called. trigger_id: ${trigger_id}, command: ${command}`);
        }

        const listner: Function | null = this.getListener(command);

        if (listner) {
            return listner(commands);
        }

        throw new Error(`Unknow Slash command. command: ${command}`);
    }
}

export { SlashCommandHandler }