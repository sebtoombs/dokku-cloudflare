"use strict";

const args = process.argv.slice(2);

//TODO  not sure what format domains is? is it spaces, csv?
const [app = "", actionName = "", domains = ""] = args;
console.log(`Post Domains Update`);
console.log(`appName: ${app}, actionName: ${actionName}, ddomains: ${domains}`);
