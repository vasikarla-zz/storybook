/* eslint-disable no-console */
const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const fs = require('fs');
const log = require('npmlog');
const { babelify } = require('./utils/compile-babel');
const { tscfy } = require('./utils/compile-tsc');

function getPackageJson() {
  const modulePath = path.resolve('./');

  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(path.join(modulePath, 'package.json'));
}

function removeDist() {
  shell.rm('-rf', 'dist');
}

const ignore = [
  '__mocks__',
  '__snapshots__',
  '__testfixtures__',
  '__tests__',
  '/tests/',
  /.+\.test\..+/,
];

function cleanup() {
  // remove files after babel --copy-files output
  // --copy-files option doesn't work with --ignore
  // https://github.com/babel/babel/issues/6226
  if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
    const files = shell.find('dist').filter((filePath) => {
      // Do not remove folder
      // And do not clean anything for:
      // - @storybook/cli/dist/generators/**/template*
      // - @storybook/cli/dist/frameworks/*
      // because these are the template files
      // that will be copied to init SB on users' projects
      if (
        fs.lstatSync(filePath).isDirectory() ||
        /generators\/.+\/template.*/.test(filePath) ||
        /dist\/frameworks\/.*/.test(filePath)
      ) {
        return false;
      }

      // Remove all copied TS files (but not the .d.ts)
      if (/\.tsx?$/.test(filePath) && !/\.d\.ts$/.test(filePath)) {
        return true;
      }

      return ignore.reduce((acc, pattern) => {
        return acc || !!filePath.match(pattern);
      }, false);
    });
    if (files.length) {
      shell.rm('-f', ...files);
    }
  }
}

function logError(type, packageJson, errorLogs) {
  log.error(`FAILED (${type}) : ${errorLogs}`);
  log.error(
    `FAILED to compile ${type}: ${chalk.bold(`${packageJson.name}@${packageJson.version}`)}`
  );
}

const packageJson = getPackageJson();

removeDist();

babelify({ errorCallback: (errorLogs) => logError('js', packageJson, errorLogs) });
tscfy({ errorCallback: (errorLogs) => logError('ts', packageJson, errorLogs) });

cleanup();

console.log(chalk.gray(`Built: ${chalk.bold(`${packageJson.name}@${packageJson.version}`)}`));
