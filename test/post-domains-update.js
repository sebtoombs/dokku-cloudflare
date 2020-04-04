"use strict";

const args = process.argv.slice(2);
const exec = require("child_process").exec;
const Promise = require("promise-polyfill");

//TODO  not sure what format domains is? is it spaces, csv?
const [app = "", actionName = "", domains = ""] = args;
console.log(`Post Domains Update`);
console.log(`appName: ${app}, actionName: ${actionName}, domains: ${domains}`);
console.log(`ENV:`, process.env);

log("Test log");

async function test() {
  console.log("Test execute:");
  console.log("Exec: ", typeof exec);
  console.log("Promise: ", typeof Promise);
  console.log("Test Promise", await new Promise.resolve("test"));
  console.log(await execute(`dokku config:get --global CURL_TIMEOUT`));
}
test();

function log() {
  console.log.call(null, ...arguments);
}

function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, function(error, stdout, stderr) {
      console.log("exec response", stdout, stderr);
      if (stderr) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}
