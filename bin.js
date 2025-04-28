#!/usr/bin/env node

const readline = require("readline");
const { spawn, exec } = require("child_process");
const fs = require("fs");

import { execSync } from "node:child_process";

function hasYarn() {
  try {
    execSync("yarn --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const useYarn = hasYarn();
const PM = useYarn ? "yarn" : "npm";

const usePM = (command) => {
  return "${PM} ${command}";
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function getProjectName() {
  return new Promise((resolve) => {
    rl.question("Project name: ", (name) => {
      resolve(name);
    });
  });
}

function getWebPort() {
  return new Promise((resolve) => {
    rl.question("Port: ", (port) => {
      resolve(+port);
    });
  });
}

let PROJECT_NAME = "my-app";
let WEB_PORT = 8080;

function createProject() {
  return new Promise((resolve) => {
    const process = spawn("git", [
      "clone",
      "https://github.com/lukeb06/create-l3-app",
      `./${PROJECT_NAME}`,
      "--depth",
      "1",
    ]);

    process.on("close", (code) => {
      resolve(code);
    });
  });
}

function runCommand(command) {
  return new Promise((resolve) => {
    exec(`cd ${PROJECT_NAME} && ${command}`, () => {
      resolve();
    });
  });
}

async function removeDefaultGit() {
  return await runCommand("rm -rf .git && rm README.md");
}

async function createNewGit() {
  return await runCommand("git init");
}

async function installDeps() {
  return await runCommand(usePM("install"));
}

async function initialCommit() {
  return await runCommand(
    'git add . && git commit -m "Initialized with create-l3-app"',
  );
}

function replaceInFile(file, search, replace) {
  return new Promise((resolve, reject) => {
    fs.readFile(`./${PROJECT_NAME}/${file}`, "utf8", (err, data) => {
      if (err) return reject(err);

      const newContent = data.replaceAll(search, replace);

      fs.writeFile(`./${PROJECT_NAME}/${file}`, newContent, "utf8", (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function createFile(file, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(`./${PROJECT_NAME}/${file}`, content, "utf8", (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function cloneFile(file, newName) {
  return new Promise((resolve, reject) => {
    fs.copyFile(
      `./${PROJECT_NAME}/${file}`,
      `./${PROJECT_NAME}/${newName}`,
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });
}

async function rewritePackageJSON() {
  await replaceInFile("package.json", "create-l3-app", PROJECT_NAME);
}

async function rewritePort() {
  await cloneFile(".env.example", ".env");
  await replaceInFile(".env", "PORT=8080", `PORT=${WEB_PORT}`);
}

async function createREADME() {
  await createFile(
    "README.md",
    `# ${PROJECT_NAME}\n\nCreated with [create-l3-app](https://github.com/lukeb06/create-l3-app)`,
  );
}

async function main() {
  const projectName = await getProjectName();
  const webPort = await getWebPort();

  PROJECT_NAME = projectName;
  WEB_PORT = webPort;

  console.log("Creating project...");
  await createProject();
  await removeDefaultGit();
  await createNewGit();

  console.log("Installing dependencies...");
  await installDeps();

  await rewritePackageJSON();
  await rewritePort();
  await createREADME();

  await initialCommit();

  console.log("Project created!");

  process.exit(0);
}

main();
