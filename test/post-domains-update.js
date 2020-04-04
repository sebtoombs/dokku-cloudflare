"use strict";

const url = require("url");

//TODO allow opts to be set per app
const opts = {
  //["--global"]: {
  proxied: true, //Proxy through CF
  ttl: 1, //Auto ttl
  recordType: "A"
  //}
};

const config = {
  ["--global"]: {}
};

const args = process.argv.slice(2);

//TODO  not sure what format domains is? is it spaces, csv?
const [app = "", actionName = "", domains = ""] = args;
log(`Post Domains Update`);
log(`appName: ${app}, actionName: ${actionName}, ddomains: ${domains}`);

//Possible actions: add, clear, remove
//Not sure if dokku will let us add domains twice, or remove domains that don't exist?
//http://dokku.viewdocs.io/dokku/development/plugin-triggers/#post-domains-update

async function run() {
  const curlTimeout = await dokkuGetConfig("CURL_TIMEOUT");
  log(`Test curlTimeout: ${curlTimeout}`);
}

run();

function log(string) {
  if (process.env.DOKKU_ROOT) {
    execute(`dokku_log_info2 "${string}"`);
  } else {
    console.log(string);
  }
}

function logError(errorString) {
  if (process.env.DOKKU_ROOT) {
    execute(`dokku_log_fail "${errorString}"`);
  } else {
    console.error(errorString);
  }
}

async function getAppDomains(appName) {
  try {
    await execute(
      `dokku domains:report ${appName} --domains-app-vhosts --quiet`
    );
  } catch (e) {
    //TODO
  }
}

var exec = require("child_process").exec;
function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, function(error, stdout, stderr) {
      //TODO maybe catch 'error' as well? not sure what it is
      if (stderr && stderr.length) return reject(stderr);
      resolve(stdout);
    });
  });
}

function dokkuGetConfig(key, appName = "--global") {
  if (process.env.DOKKU_ROOT) {
    return execute(`dokku config:get ${appName} ${key}`);
  } else {
    return Promise.resolve(config[appName][key]);
  }
}
