import { Slack } from "../src/slack/types/index.d";
import * from "@types/google-apps-script";

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

PropertiesService['getScriptProperties'] = jest.fn(() => properites);
PropertiesService['getUserProperties'] = jest.fn(() => properites);

const service = {
    setAuthorizationBaseUrl: jest.fn(function () {
        return this;
    }),
    setTokenUrl: jest.fn(function () {
        return this;
    }),
    setTokenFormat: jest.fn(function () {
        return this;
    }),
    setClientId: jest.fn(function () {
        return this;
    }),
    setClientSecret: jest.fn(function () {
        return this;
    }),
    setCallbackFunction: jest.fn(function () {
        return this;
    }),
    setPropertyStore: jest.fn(function () {
        return this;
    }),
    setScope: jest.fn(function () {
        return this;
    }),
    setTokenPayloadHandler: jest.fn(function () {
        return this;
    }),
};
OAuth2['createService'] = jest.fn(() => service);

Utilities['computeDigest'] = jest.fn(() => []);

const cipher = {
    decrypt: jest.fn(() => "{}"),
};


Utilities['DigestAlgorithm'] = jest.fn();
Utilities['Charset'] = jest.fn();
cCryptoGS['Cipher'] = jest.fn(() => cipher);

import { executeSlashCommand, initializeOAuth2Handler } from "../src/Code";
describe('Code', () => {
    describe('executeSlashCommand', () => {
        initializeOAuth2Handler();
        it('/', () => {
            const commands: Commands = {} as Commands;

            commands.text = '';
            commands.user_id = 'user_id';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'ephemeral');
            expect(actual).toHaveProperty('text');
        });
        it('direct', () => {
            const commands: Commands = {} as Commands;

            commands.text = '10 @user1 @user2';
            commands.user_id = 'user_id';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'ephemeral');
            expect(actual).toHaveProperty('text');
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
