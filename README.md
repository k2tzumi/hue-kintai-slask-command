[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
![ci](https://github.com/k2tzumi/hue-kintai-slask-command/workflows/ci/badge.svg)

What is this?
==============================

 This bot can make [HUE](https://www.works-hi.co.jp/products/attendance) attendance from slack slash command.  
 This bot runs as a web app within a Google app script.  
You can make this bot work by registering it as a request URL for the [Slack API](https://api.slack.com/apps) slash command.
 
REQUIREMENTS
--------------------
- `npm`
- [clasp](https://github.com/google/clasp)  
`npm install -g @google/clasp`
- `make`
- GAS Library
  - cCryptoGS
  - OAuth2

USAGE
--------------------

To use it, you need to set up Google apps scripts, and Slack API.

### Install Google apps scripts

1. Enable Google Apps Script API  
https://script.google.com/home/usersettings
2. make push  
3. make deploy  
4. Grant the necessary privileges  
make open  
Publish > Deploy as web app.. > Update  
Grant access

### Register with the Slack API

* Create New App  
https://api.slack.com/apps  
Please make a note of `App Credentials` displayed after registration.

### Setting Script properties

In order to run the application and change its behavior, you need to set the following Google Apps scripts property.

|Property name|Required|Setting Value|Description|
|--|--|--|--|
|VERIFICATION_TOKEN|○|Basic Information > App Credentials > Verification Token|A token that easily authenticates the source of a hooked request|
|CLIENT_ID|○|Basic Information > App Credentials > Client ID|Use with OAuth|
|CLIENT_SECRET|○|Basic Information > App Credentials > Client Secret|Use with OAuth|
|HUE_DOMAIN|○|ex) `lwi0.hue.worksap.com`, `lwi0-cws.company.works-hi.com`|Specify a domain for the the HUE MOBILE login URL.|
|START_REACTION|optional|defalut: sunny (:sunny:) |Set the reaction emoji for Mentored Attendance messages.|
|END_REACTION|optional|defalut: confetti_ball (:confetti_ball:)|Set the reaction emoji for Mentored off messages.|

1. Open Project  
`$ make open`
2. Add Scirpt properties  
File > Project properties > Scirpt properties > Add row  
Setting Property & Value

### OAuth Authentication

#### Settings OAuth & Permissions

* Redirect URLs  
`Add New Redirect URL` > Add Redirect URL  > `Save URLs`  
ex) https://script.google.com/macros/s/miserarenaiyo/usercallback  
You can check the Redirect URL in the following way. The `RedirectUri` of the displayed page.  
`$ make application`  
* Bot Token Scopes  
Click `Add an OAuth Scope` to select the following permissions  
  * [chat:write](https://api.slack.com/scopes/chat:write)
  * [commands](https://api.slack.com/scopes/commands)
  * [reactions:write](https://api.slack.com/scopes/reactions:write)
  * [app_mentions:read](https://api.slack.com/scopes/app_mentions:read)

* Install App to Workspace  
You must specify a destination channel that bot can post to as an app.

### Install App to Workspace

1. Open web application  
`$ make application`  
The browser will be launched with the following URL:  
example) https://script.google.com/macros/s/miserarenaiyo/exec  
2. Click `Authorize.`  
You must specify a destination channel that bot can post to as an app.
3. Click `Allow`  
The following message is displayed when OAuth authentication is successful  
```
Success!
Setting EventSubscriptions
Setting Slash Commands
Setting Interactivity & Shortcuts
```
When prompted, click the `Setting Slash Commands` to set up an Slash Commands.  
Thes click the `Setting Interactivity & Shortcuts` to set up an Interactivity.  
Thes click the `Setting EventSubscriptions` to set up an Event Subscriptions.  

### Settings Slash Commands

* Create New Command  
Setting Request URL.  
example) https://script.google.com/macros/s/miserarenaiyo/exec  

### Setting Interactivity & Shortcuts

Turn on.  
Setting Interactivity Request URL  
example) https://script.google.com/macros/s/miserarenaiyo/exec

### Setting Event Subscriptions  
Turn on.  
Setting Request URL.  
example) https://script.google.com/macros/s/miserarenaiyo/exec  
Add Workspace Event.   
Select `app_mention`.
