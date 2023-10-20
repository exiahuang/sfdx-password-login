# sfdx-password-login

a plugin for sfdx develope and [sfdx-password-login](https://github.com/exiahuang/sfdx-password-login)

## Install

Install as sfdx plugin

```sh
# install
sfdx plugins:install sfdx-password-login

# show plugin
sfdx plugins

# run
sfdx xlogin --help
```

# Usage

## use Username-Password OAuth Authentication

```sh
sfdx xlogin -u username -p password -a alias -r instanceurl

sfdx xlogin -u username -p password -a alias -r https://login.salesforce.com/
sfdx xlogin -u username -p password -a alias -r https://test.salesforce.com/
```

# For Developer

## Install from source

```sh
git clone https://github.com/exiahuang/sfdx-password-login.git
cd sfdx-password-login
npm install
sfdx plugins:link .
```

## just run it

```
./bin/run xlogin
```

# Acknowledgement

-   [Create Your First Salesforce CLI Plugin](https://developer.salesforce.com/blogs/2018/05/create-your-first-salesforce-cli-plugin.html)
-   `src/commands/xlogin/login.ts` is from [wadewegner/sfdx-waw-plugin](https://github.com/wadewegner/sfdx-waw-plugin)
