import { flags, SfdxCommand } from '@salesforce/command';
import { Aliases, AuthInfo, Messages } from '@salesforce/core';
import { AnyJson, getString } from '@salesforce/ts-types';
import * as jsforce from 'jsforce';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-password-login', 'xlogin');

export default class SfdxXLogin extends SfdxCommand {
  public static description = messages.getMessage('auth.username.login.description');
  public static examples = [];

  public static readonly flagsConfig = {
    instanceurl: flags.url({
      char: 'r',
      description: messages.getMessage('auth.username.login.flags.instanceurl'),
    }),
    username: flags.string({
      char: 'u',
      description: messages.getMessage('auth.username.login.flags.username'),
      required: true,
    }),
    alias: flags.string({
      char: 'a',
      description: messages.getMessage('auth.username.login.flags.alias'),
    }),
    password: flags.string({
      char: 'p',
      description: messages.getMessage('auth.username.login.flags.password'),
    }),
  };

  public async run(): Promise<AnyJson> {
    const username = this.flags.username;
    const alias = this.flags.alias;
    let password = this.flags.password;
    let instanceUrl = this.flags.instanceurl;

    if (!instanceUrl) {
      instanceUrl = 'https://login.salesforce.com';
    }

    if (!password) {
      password = await this.ux.prompt(`password for ${username}`, { type: 'mask' });
    }

    const conn = new jsforce.Connection({
      // you can change loginUrl to connect to sandbox or prerelease env.
      loginUrl: instanceUrl,
    });

    await conn.login(username, password);

    const accessTokenOptions = {
      accessToken: conn.accessToken,
      clientId: 'PlatformCLI',
      instanceUrl: conn.instanceUrl,
      loginUrl: instanceUrl,
      orgId: getString(conn, 'userInfo.organizationId'),
    };

    const auth = await AuthInfo.create({ username, accessTokenOptions });
    await auth.save();

    if (alias) {
      await Aliases.parseAndUpdate([`${alias}=${username}`]);
    }

    this.ux.log(`Success: Authorized to ${username}, alias : ${alias}`);

    return { username, accessTokenOptions };
  }
}
