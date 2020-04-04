"use strict";

const args = process.argv.slice(2);

//TODO  not sure what format domains is? is it spaces, csv?
const [app = "", actionName = "", domains = ""] = args;
console.log(`Post Domains Update`);
console.log(`appName: ${app}, actionName: ${actionName}, domains: ${domains}`);
console.log(`DOKKU_ROOT: ${process.env.DOKKU_ROOT}`);

async function test() {
  await log(`Await log`);
  log(`Log without await`);
}
test();

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

function log(string) {
  if (process.env.DOKKU_ROOT) {
    try {
      return execute(`dokku_log_info2 "${string}"`);
    } catch (e) {
      console.log("Failed to log to dokku. Log below:");
      console.log(string);
    }
  } else {
    console.log(string);
    return Promise.resolve();
  }
}
