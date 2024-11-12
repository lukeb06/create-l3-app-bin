#!/usr/bin/env node

const readline = require('readline');
const { spawn, exec } = require('child_process');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getProjectName() {
    return new Promise(resolve => {
        rl.question('Project name: ', name => {
            resolve(name);
        });
    });
}

function getWebPort() {
    return new Promise(resolve => {
        rl.question('Web server port: ', port => {
            resolve(+port);
        });
    });
}

function getAPIPort() {
    return new Promise(resolve => {
        rl.question('API server port: ', port => {
            resolve(+port);
        });
    });
}

let PROJECT_NAME = '';
let WEB_PORT = 5170;
let API_PORT = 3001;

function createProject() {
    return new Promise(resolve => {
        const process = spawn('git', ['clone', 'https://github.com/lukeb06/create-l3-app', `./${PROJECT_NAME}`, '--depth', '1']);

        process.on('close', code => {
            resolve(code);
        });
    });
}

function runCommand(command) {
    return new Promise(resolve => {
        exec(`cd ${PROJECT_NAME} && ${command}`, () => {
            resolve();
        });
    });
}

async function removeDefaultGit() {
    return await runCommand('rm -rf .git && rm README.md');
}

async function createNewGit() {
    return await runCommand('git init');
}

async function installDeps() {
    return await runCommand('bun install');
}

async function initialCommit() {
    return await runCommand('git add . && git commit -m "Initialized with create-l3-app"');
}

function replaceInFile(file, search, replace) {
    return new Promise((resolve, reject) => {
        fs.readFile(`./${PROJECT_NAME}/${file}`, 'utf8', (err, data) => {
            if (err) return reject(err);

            const newContent = data.replaceAll(search, replace);

            fs.writeFile(`./${PROJECT_NAME}/${file}`, newContent, 'utf8', err => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
}

function createFile(file, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(`./${PROJECT_NAME}/${file}`, content, 'utf8', err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

async function rewritePackageJSON() {
    await replaceInFile('package.json', 'create-l3-app', PROJECT_NAME);
    await replaceInFile('package.json', '-p 5170', `-p ${WEB_PORT}`)
}

async function rewriteServerPort() {
    await createFile('.env', `PORT=${API_PORT}`);
    await replaceInFile('src/lib/api.ts', '3001', API_PORT);
    await replaceInFile('src/hooks/use-api.tsx', '3001', API_PORT);
}

async function createREADME() {
    await createFile('README.md', `# ${PROJECT_NAME}\n\nCreated with [create-l3-app](https://github.com/lukeb06/create-l3-app)`);
}

async function main() {
    const projectName = await getProjectName();
    const webPort = await getWebPort();
    const apiPort = await getAPIPort();

    PROJECT_NAME = projectName;
    WEB_PORT = webPort;
    API_PORT = apiPort;

    console.log('Creating project...');
    await createProject();
    await removeDefaultGit();
    await createNewGit();

    console.log('Installing dependencies...');
    await installDeps();

    await rewritePackageJSON();
    await rewriteServerPort();
    await createREADME();

    await initialCommit();

    console.log('Project created!');

    process.exit(0);
}

main();

