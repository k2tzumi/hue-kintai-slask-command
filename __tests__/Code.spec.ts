import { Slack } from "../src/slack/types/index.d";
type Commands = Slack.SlashCommand.Commands;

const properites = {
    getProperty: jest.fn(function () {
        return 'dummy';
    }),
    deleteAllProperties: jest.fn(),
    deleteProperty: jest.fn(),
    getKeys: jest.fn(),
    getProperties: jest.fn(),
    setProperties: jest.fn(),
    setProperty: jest.fn()
};

const cipher = {
    decrypt: jest.fn(() => "{}"),
}

PropertiesService['getScriptProperties'] = jest.fn(() => properites);
PropertiesService['getUserProperties'] = jest.fn(() => properites);
Utilities['computeDigest'] = jest.fn(() => []);
Utilities['DigestAlgorithm'] = jest.fn();
Utilities['Charset'] = jest.fn();
cCryptoGS['Cipher'] = jest.fn(() => cipher);
OAuth2['createService'] = jest.fn();

import { executeSlashCommand, initializeOAuth2Handler } from "../src/Code";
describe('Code', () => {
    describe('executeSlashCommand', () => {
        initializeOAuth2Handler();
        it('/', () => {
            const commands: Commands = {} as Commands;

            commands.text = '';
            commands.user_id = 'user_id';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'in_channel');
            expect(actual).toHaveProperty('blocks');
            expect(actual['blocks'][1]).toHaveProperty('type', 'actions');
        });
        it('direct', () => {
            const commands: Commands = {} as Commands;

            commands.text = '10 @user1 @user2';
            commands.user_id = 'user_id';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'in_channel');
            expect(actual['blocks'][1]).toHaveProperty('type', 'actions');
        });
        it('help', () => {
            const commands: Commands = {} as Commands;

            commands.text = 'help';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'ephemeral');
            expect(actual).toHaveProperty('text');
        });
    });
});
