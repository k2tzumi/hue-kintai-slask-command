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
  - [cCryptoGS](https://github.com/brucemcpherson/cCryptoGS)
  - [OAuth2](https://github.com/googleworkspace/apps-script-oauth2)
  - [JobBroker](https://github.com/k2tzumi/apps-script-jobqueue)

USAGE
--------------------

To use it, you need to set up Google apps scripts, and Slack API.

## Steps

1. Enable Google Apps Script API  
https://script.google.com/home/usersettings
2. Clone this repository to your local machine.
3. Run `make push` to install the dependencies and the necessary libraries, authenticate with Google, create a new GAS project and upload the code.
4. Run `make deploy` to deploy the project as a web app.  
The first time you publish it as a web application, you will need to authorize it, so please follow the steps below.
Open the script editor. (`make open`)  
Click Deploy > New deployment.  
Select Web app as the deployment type.  
Choose who can access your web app and who will execute it.  
Click Deploy.  
For more information, please refer to the official Google documentation.  
https://developers.google.com/apps-script/concepts/deployments
5. Run `make application` to open the deployed web app in your browser. Follow the instructions on the web app to install the Slack app and perform OAuth authentication. The web app will automatically upload the App manifest to Slack and configure the necessary settings for you.


### Register with the Slack API

* Create New App  
https://api.slack.com/apps  
Please make a note of `App Credentials` displayed after registration.

### Setting Script properties

In order to run the application and change its behavior, you need to set the following Google Apps scripts property.

|Property name|Required|Setting Value|Description|
|--|--|--|--|
|WORKS_DOMAIN|○|ex) `lwi0.hue.worksap.com`, `lwi0-cws.company.works-hi.com`|Specify a domain for the the HUE MOBILE login URL.|
|WORKS_PROXY_DOMAIN|○|ex) `miserarenaiyo.netlify.app` |Specify the URL where you deployed [works-kintai-slask-command-netlify-functions](https://github.com/k2tzumi/works-kintai-slask-command-netlify-functions)|
|START_REACTION|optional|defalut: sunny (:sunny:) |Set the reaction emoji for Mentored Attendance messages.|
|END_REACTION|optional|defalut: confetti_ball (:confetti_ball:)|Set the reaction emoji for Mentored off messages.|

1. Open Project  
`$ make open`
2. Add Scirpt properties  
File > Project properties > Scirpt properties > Add row  
Setting Property & Value

# How to use

The usage of this bot is as follows.

1. Invite bots to your channel (e.g. /invite @hue-kintai-bot)
2. Register works authentication  
Enter your user ID and password in the dialog that appears after executing the following slash command.  
`/kintai config`
3. Begin or end attendance  
You can send a message with a mentions or use the slash command to register your attendance.  
  - When you go to work with a message with a Mention  
    ```
    @hue-kintai-bot おはようございます。出勤します
    ```
  - If you use the slash command to go to work  
    ```
    /kintai start
    ```
