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

      switch (actionName) {
        case `add`:
          if (!existingRecord) {
            try {
              const result = await cf.dnsRecords.add(cfZoneID, {
                type: opts.recordType,
                name: `${parsed.hostname}`,
                content: serverIP,
                ttl: 1,
                proxied: true
              });
              if (result.success) {
                log(`Domain: ${domain} added to cloudflare`);
                return {
                  domain: domain,
                  ok: true
                };
              } else {
                log(`Domain: ${domain} failed to add. Messages below:`);
                result.messages.map(message => log(`Message: ${message}`));
                return {
                  domain: domain,
                  ok: false,
                  code: "failed_add"
                };
              }
            } catch (e) {
              logError(`Domain ${domain} error on add: ${e.statusMessage}`);
              return {
                domain: domain,
                ok: false,
                code: "failed_add_unknown"
              };
            }
          } else {
            log(`Record for ${domain} already exists. Updating`);
            try {
              const result = await cf.dnsRecords.edit(
                cfZoneID,
                existingRecord.id,
                {
                  content: serverIP,
                  proxied: opts.proxied,
                  ttl: opts.ttl,
                  name: existingRecord.name,
                  type: opts.recordType
                }
              );
              if (result.success) {
                log(`Domain: ${domain} updated in cloudflare`);
                return {
                  domain: domain,
                  ok: true
                };
              } else {
                log(`Domain: ${domain} failed to update. Messages below:`);
                result.messages.map(message => log(`Message: ${message}`));
                return {
                  domain: domain,
                  ok: false,
                  code: "failed_update"
                };
              }
            } catch (e) {
              logError(`Domain ${domain} error on update: ${e.statusMessage}`);
              return {
                domain: domain,
                ok: false,
                code: "failed_validation_unknown"
              };
            }
          }
          break;
        case `remove`:
          if (!existingRecord) {
            logError(`Domain: ${domain} not found in cloudflare`);
            return {
              domain: domain,
              ok: false,
              code: "failed_remove_not_found"
            };
          } else {
            try {
              const result = await cf.dnsRecords.del(
                cfZoneID,
                existingRecord.id
              );
              if (result.success) {
                log(`Domain: ${domain} removed from cloudflare`);
                return {
                  domain: domain,
                  ok: true
                };
              } else {
                log(`Domain: ${domain} failed to remove. Messages below:`);
                result.messages.map(message => log(`Message: ${message}`));
                return {
                  domain: domain,
                  ok: false,
                  code: "failed_remove"
                };
              }
            } catch (e) {
              logError(`Domain ${domain} error on remove: ${e.statusMessage}`);
              return {
                domain: domain,
                ok: false,
                code: "failed_remove_unknown"
              };
            }
          }
          break;
        case `clear`:
          log(`Not implemented`);
          break;
      }
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
    const domains = await execute(
      `dokku domains:report ${appName} --domains-app-vhosts --quiet`
    );
    return domains.split(" ");
  } catch (e) {
    //TODO ??
    return [];
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
