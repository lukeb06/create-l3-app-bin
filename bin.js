#!/usr/bin/env node

const readline = require("readline");
const { spawn, exec, execSync } = require("child_process");
const fs = require("fs");

const crypto = require("crypto");

function hasPnpm() {
  try {
    execSync("pnpm --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const usePnpm = hasPnpm();
const PM = usePnpm ? "pnpm" : "npm";

const usePM = (command) => {
  return `${PM} ${command}`;
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

function getNoAuth() {
  return new Promise((resolve) => {
    rl.question("Remove auth? (y/N): ", (answer) => {
      if (answer.toLowerCase() === "y") resolve(true);
      else resolve(false);
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

function removeFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(`./${PROJECT_NAME}/${file}`, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function removeDir(dir) {
  return new Promise((resolve, reject) => {
    fs.rmdir(`./${PROJECT_NAME}/${dir}`, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function rewriteTitles() {
  const files = ["package.json", "src/data/static.ts"];

  for (const file of files) {
    await replaceInFile(file, "create-l3-app", PROJECT_NAME);
  }
}

async function rewritePort() {
  await cloneFile(".env.example", ".env");
  await replaceInFile(".env", "PORT=8080", `PORT=${WEB_PORT}`);
  await replaceInFile(
    ".env",
    'SECRET="your-secret-key"',
    `SECRET="${crypto.randomUUID()}"`,
  );
}

async function createREADME() {
  await createFile(
    "README.md",
    `# ${PROJECT_NAME}\n\nCreated with [create-l3-app](https://github.com/lukeb06/create-l3-app)`,
  );
}

async function removeAuth() {
  await removeDir("src/app/login");
  await removeDir("src/app/register");
  await removeDir("src/app/(main)/profile");
  await replaceInFile(
    "src/components/nav/mobile.tsx",
    "{ id: 2, href: '/profile', icon: <UserIcon size={32} /> },",
    "",
  );
  await replaceInFile(
    "src/components/nav/classic/index.tsx",
    "import { getAuth } from '@/lib/get-auth';",
    "",
  );
  await replaceInFile(
    "src/components/nav/classic/index.tsx",
    "const { user } = await getAuth();",
    "",
  );
  await replaceInFile(
    "src/components/nav/classic/index.tsx",
    "user={user} ",
    "",
  );

  await replaceInFile(
    "src/components/nav/classic/client.tsx",
    "import type { PublicUser } from '@/lib/actions';",
    "",
  );
  await replaceInFile(
    "src/components/nav/classic/client.tsx",
    "import AuthButton from './auth-button';",
    "",
  );
  await replaceInFile(
    "src/components/nav/classic/client.tsx",
    "{ user }: { user: PublicUser | null }",
    "",
  );
  await replaceInFile(
    "src/components/nav/classic/client.tsx",
    "<AuthButton user={user} />",
    "",
  );
}

async function main() {
  const projectName = await getProjectName();
  const webPort = await getWebPort();
  const noAuth = await getNoAuth();

  PROJECT_NAME = projectName;
  WEB_PORT = webPort;

  console.log("Creating project...");
  await createProject();
  await removeDefaultGit();
  await createNewGit();

  console.log("Installing dependencies...");
  await installDeps();

  await rewriteTitles();
  await rewritePort();
  await createREADME();

  if (noAuth) {
    await removeAuth();
  }

  await initialCommit();

  console.log("Project created!");

  process.exit(0);
}

main();
