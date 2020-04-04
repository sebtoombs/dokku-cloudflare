"use strict";

const args = process.argv.slice(2);

//TODO  not sure what format domains is? is it spaces, csv?
const [app = "", actionName = "", domains = ""] = args;
console.log(`Post Domains Update`);
console.log(`appName: ${app}, actionName: ${actionName}, domains: ${domains}`);
console.log(`ENV:`, process.env);

log("Test log");

async function test() {
  console.log("Test execute:");
  await execute("dokku config:get --global CURL_TIMEOUT");
}
test();

function log() {
  console.log.call(null, [...arguments]);
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
