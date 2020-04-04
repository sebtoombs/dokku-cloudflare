"use strict";

if (!process.env.DOKKU_ROOT) {
  require("dotenv").config();
}

const url = require("url");
const Promise = require("promise-polyfill");
const exec = require("child_process").exec;

//TODO allow opts to be set per app
const opts = {
  //["--global"]: {
  proxied: true, //Proxy through CF
  ttl: 1, //Auto ttl
  recordType: "A"
  //}
};

const config = {
  ["--global"]: {
    CF_SERVER_IP: process.env.CF_SERVER_IP,
    CF_ZONE_ID: process.env.CF_ZONE_ID,
    CF_TOKEN: process.env.CF_TOKEN
  }
};

const args = process.argv.slice(2);

const [app = "", actionName = "", ...domains] = args;
log(`Post Domains Update`);
log(`appName: ${app}, actionName: ${actionName}, domains: ${domains}`);

//Possible actions: add, clear, remove
//Not sure if dokku will let us add domains twice, or remove domains that don't exist?
//http://dokku.viewdocs.io/dokku/development/plugin-triggers/#post-domains-update

async function run() {
  //Load config from dokku
  const cfToken = await dokkuGetConfig("CF_TOKEN");
  const cfZoneID = await dokkuGetConfig("CF_ZONE_ID");
  const serverIP = await dokkuGetConfig("CF_SERVER_IP");

  console.log(`cfToken: ${cfToken}`);
  console.log(`cfZoneID: ${cfZoneID}`);
  console.log(`serverIP: ${serverIP}`);
  console.log(`App Domains: `, await dokkuGetAppDomains(app));
  console.log(`CURL_TIMEOUT`, await dokkuGetConfig("CURL_TIMEOUT"));

  const cf = require("cloudflare")({
    token: cfToken
  });

  let resp;
  try {
    resp = await cf.dnsRecords.browse(cfZoneID);
  } catch (e) {
    logError(`Failed to get records from cloudflare`);
    process.exit();
    return;
  }

  const records = resp.result.filter(r => r.type === "A");
  console.log(`CF RECORDS`, records);

  const getExistingDomainRecord = domain => {
    const record = records.find(r => r.name === domain);
    //console.log(`Existing: ${JSON.stringify(record)}`);
    return record;
  };

  await Promise.all(
    domains.map(async rawDomain => {
      let parseDomain = rawDomain.replace(/^(https?:)?\/\//, "//");
      parseDomain = `//${parseDomain}`;
      const parsed = url.parse(parseDomain, false, true);

      if (!parsed.hostname) {
        log(`Domain: ${rawDomain} skipped, failed validation`);
        return { domain: rawDomain, ok: false, code: "failed_validation" };
      }

      let domain = parsed.hostname;

      const existingRecord = getExistingDomainRecord(domain);

      console.log(`Actioning: ${domain}`);
      return;
    })
  );
}

run();

function log() {
  /*if (process.env.DOKKU_ROOT) {
    execute(`dokku_log_info2 "${string}"`);
  } else {
    console.log(string);
  }*/
  console.log.call(null, ...arguments);
}

function logError() {
  /*if (process.env.DOKKU_ROOT) {
    execute(`dokku_log_fail "${errorString}"`);
  } else {
    console.error(errorString);
  }*/
  console.error.call(null, ...arguments);
}

async function dokkuGetAppDomains(appName) {
  try {
    return await execute(
      `dokku domains:report ${appName} --domains-app-vhosts --quiet`
    );
  } catch (e) {
    //TODO
  }
}

function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, function(error, stdout, stderr) {
      if (stderr) {
        reject(stderr.trim());
      } else {
        resolve(stdout.trim());
      }
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
