const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const webpackConfig = require("./webpack.config");
webpackConfig.entry = path.resolve(__dirname, "browser/index.js");
/**
 * Generates a webpack build and put it in browser folder
 */

function addBuffer(dir) {
  fs.readdirSync(dir).forEach((file) => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      addBuffer(fullPath);
    } else {
      if (
        (fullPath.endsWith(".ts") || fullPath.endsWith(".js")) &&
        (!fullPath.endsWith(".d.ts") ||
          fullPath.endsWith("api.d.ts") ||
          fullPath.endsWith("define.d.ts"))
      ) {
        const tsFile = fs.readFileSync(fullPath, "utf8");
        if (tsFile.includes("Buffer")) {
          const newTsFile = 'import { Buffer } from "buffer/";\n' + tsFile;
          fs.writeFileSync(fullPath, newTsFile, "utf8");
        }
      }
    }
  });
}

function renameFiles(dir, action) {
  fs.readdirSync(dir).forEach((file) => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      renameFiles(fullPath, action);
    } else {
      if (fullPath.includes("example")) {
        fs.unlinkSync(fullPath);
      }

      if (fullPath.includes("-BROWSER")) {
        console.log(action, fullPath);

        if (action === "rename") {
          fs.renameSync(fullPath, fullPath.replace("-BROWSER", ""));
        } else if (action === "delete") {
          fs.unlinkSync(fullPath);
        }
      }
    }
  });
}

function copyFolderSync(from, to) {
  fs.mkdirSync(to);
  fs.readdirSync(from).forEach((element) => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

fs.rmSync("browser", { recursive: true, force: true });
fs.rmSync("tempBrowser", { recursive: true, force: true });
copyFolderSync("gramjs", "tempBrowser");
addBuffer("tempBrowser");
renameFiles("tempBrowser", "rename");

const tsconfig = fs.readFileSync("tsconfig.json", "utf8");
let newTsconfig = tsconfig.replace(/\.\/dist/g, "./browser");
newTsconfig = newTsconfig.replace(/gramjs/g, "tempBrowser");
fs.writeFileSync("tsconfig.json", newTsconfig, "utf8");
const packageJSON = JSON.parse(fs.readFileSync("package.json", "utf8"));
const oldValueStorage = packageJSON.dependencies["node-localstorage"];
const oldValueSocks = packageJSON.dependencies["socks"];
delete packageJSON.dependencies["node-localstorage"];
delete packageJSON.dependencies["socks"];
fs.writeFileSync(
  "package.json",
  JSON.stringify(packageJSON, null, "  "),
  "utf8"
);

const npmi = exec("npm i");
npmi.on("close", (code) => {
  if (code !== 0) {
    throw new Error("Error happened " + code);
  }

  const tsc = exec("npx tsc");
  tsc.stdout.on("data", function (data) {
    console.log("stdout: " + data.toString());
  });

  tsc.stderr.on("data", function (data) {
    console.error("stderr: " + data.toString());
  });
  tsc.on("close", (code) => {
    if (code !== 0) {
      throw new Error("Error happened " + code);
    }

    fs.copyFileSync("package.json", "browser/package.json");
    fs.copyFileSync("README.md", "browser/README.md");
    fs.copyFileSync("LICENSE", "browser/LICENSE");
    fs.copyFileSync("gramjs/tl/api.d.ts", "browser/tl/api.d.ts");
    fs.copyFileSync("gramjs/define.d.ts", "browser/define.d.ts");
    fs.rmSync("tempBrowser", { recursive: true, force: true });
    const tsconfig = fs.readFileSync("tsconfig.json", "utf8");
    let newTsconfig = tsconfig.replace(/\.\/browser/g, "./dist");
    newTsconfig = newTsconfig.replace(/tempBrowser/g, "gramjs");
    fs.writeFileSync("tsconfig.json", newTsconfig, "utf8");
    const packageJSON = JSON.parse(fs.readFileSync("package.json", "utf8"));
    packageJSON.dependencies["node-localstorage"] = oldValueStorage;
    packageJSON.dependencies["socks"] = oldValueSocks;
    fs.writeFileSync(
      "package.json",
      JSON.stringify(packageJSON, null, "  "),
      "utf8"
    );

    webpack(webpackConfig, (err, stats) => {
      if (err || stats.hasErrors()) {
        console.log("SOME ERROR HAPPENED");
        process.exit(0);
      }
      if (process.env.CI) {
        exec("npm ci");
      } else {
        exec("npm i");
      }
      console.log(
        "DONE!. File created at ",
        path.resolve(__dirname, "browser/telegram.js")
      );
    });
  });
});
