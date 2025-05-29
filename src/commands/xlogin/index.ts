import { flags, SfdxCommand } from '@salesforce/command';
import { Aliases, AuthInfo, Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as xml2js from 'xml2js';

interface LoginInfo {
  sf_url: string;
  sf_username: string;
  sf_password: string;
  client_id?: string;
  client_secret?: string;
  apiversion: string;
}

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-password-login', 'xlogin');

async function soapLogin(loginInfo) {
  const { sf_url, sf_username, sf_password, apiversion } = loginInfo;
  const soapBody = `<?xml version="1.0" encoding="utf-8" ?>
        <env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
          <env:Body>
            <n1:login xmlns:n1="urn:partner.soap.sforce.com">
              <n1:username>${sf_username}</n1:username>
              <n1:password>${sf_password}</n1:password>
            </n1:login>
          </env:Body>
        </env:Envelope>`;

  const soapResponse = await fetch(sf_url + '/services/Soap/u/' + apiversion, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      SOAPAction: 'login',
    },
    body: soapBody,
  });
  const soapResult = await soapResponse.text();

  const parser = new xml2js.Parser();
  const xmlDoc = await parser.parseStringPromise(soapResult);
  const result = xmlDoc['soapenv:Envelope']['soapenv:Body'][0]['loginResponse'][0]['result'][0];

  const getInstances = (url: string) => {
    const serverUrl = new URL(url);
    return `${serverUrl.protocol}//${serverUrl.hostname}`;
  };

  return {
    accessToken: result.sessionId[0],
    clientId: 'PlatformCLI',
    instanceUrl: getInstances(result.serverUrl[0]),
    loginUrl: sf_url,
    orgId: result.userInfo[0].organizationId[0],
  };
}

async function restLogin(loginInfo: LoginInfo) {
  const { sf_url, client_id, client_secret, sf_username, sf_password } = loginInfo;
  const body = {
    grant_type: 'password',
    client_id: client_id,
    client_secret: client_secret,
    username: sf_username,
    password: sf_password,
  };
  const response = await fetch(sf_url + '/services/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });

  const data = JSON.parse(await response.text());
  const [orgId] = data?.id.split('/').slice(-2);

  return {
    accessToken: data?.access_token,
    clientId: 'PlatformCLI',
    instanceUrl: data?.instance_url,
    loginUrl: sf_url,
    orgId,
  };
}

async function authorization(loginInfo: LoginInfo) {
  const { sf_url, client_id, client_secret, sf_username, sf_password, apiversion } = loginInfo;
  if (client_id && client_secret) {
    return await restLogin(loginInfo);
  } else {
    return await soapLogin({
      sf_url,
      sf_username,
      sf_password,
      apiversion,
    });
  }
}

export default class SfdxXLogin extends SfdxCommand {
  public static description = messages.getMessage('auth.username.login.description');
  public static examples = [];

  public static readonly flagsConfig = {
    instanceurl: flags.string({
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
    clientid: flags.string({
      char: 'i',
      description: messages.getMessage('auth.username.login.flags.clientid'),
    }),
    clientsecret: flags.string({
      char: 's',
      description: messages.getMessage('auth.username.login.flags.clientsecret'),
    }),
    ver: flags.string({
      description: messages.getMessage('auth.username.login.flags.apiversion'),
      default: '63.0'
    }),
  };

  public async run(): Promise<AnyJson> {
    const username = this.flags.username;
    const alias = this.flags.alias;
    let password = this.flags.password;
    const instanceUrl = this.flags.instanceurl || 'https://login.salesforce.com';

    if (!password) {
      password = await this.ux.prompt(`password for ${username}`, { type: 'mask' });
    }

    try {
      const accessTokenOptions = await authorization({
        sf_url: instanceUrl,
        client_id: this.flags.clientid,
        client_secret: this.flags.clientsecret,
        sf_username: username,
        sf_password: password,
        apiversion: this.flags.ver,
      });

      const auth = await AuthInfo.create({ username, accessTokenOptions });
      await auth.save();

      if (alias) {
        await Aliases.parseAndUpdate([`${alias}=${username}`]);
      }
      this.ux.log(`Success: Authorized to ${username}, alias : ${alias}`);
      return { username, accessTokenOptions };
    } catch (error) {
      this.ux.error(error);
    }
  }
}
