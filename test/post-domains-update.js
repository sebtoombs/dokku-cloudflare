"use strict";

const args = process.argv.slice(2);
const exec = require("child_process").exec;

//TODO  not sure what format domains is? is it spaces, csv?
const [app = "", actionName = "", domains = ""] = args;
console.log(`Post Domains Update`);
console.log(`appName: ${app}, actionName: ${actionName}, domains: ${domains}`);
console.log(`ENV:`, process.env);

log("Test log");

async function test() {
  console.log("Test execute:");
  console.log(typeof exec);
  exec("dokku config:get --global CURL_TIMEOUT", function(
    error,
    stdout,
    stderr
  ) {
    console.log("exec response", stdout, stderr);
  });
}
test();

function log() {
  console.log.call(null, ...arguments);
}
