const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// TODO if someone is brave enough to make all of this readable please do

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
// easier that writing two files smh
const tsconfig = fs.readFileSync("tsconfig.json", "utf8");
let newTsconfig = tsconfig.replace(/\.\/dist/g, "./browser");
newTsconfig = newTsconfig.replace(/gramjs/g, "tempBrowser");
fs.writeFileSync("tsconfig.json", newTsconfig, "utf8");
const packageJSON = JSON.parse(fs.readFileSync("package.json", "utf8"));
const oldValueStorage = packageJSON.dependencies["node-localstorage"];
const oldValueSocks = packageJSON.dependencies["socks"];
delete packageJSON.dependencies["node-localstorage"];
delete packageJSON.dependencies["socks"];
const oldVersion = packageJSON.version.split(".");
+oldVersion[2]++;
packageJSON.version = oldVersion.join(".");
console.log("browser version is", packageJSON.version);
fs.writeFileSync(
  "package.json",
  JSON.stringify(packageJSON, null, "  "),
  "utf8"
);
fs.writeFileSync(
  "gramjs/Version.ts",
  `export const version = "${packageJSON.version}";`,
  "utf8"
);

renameFiles("tempBrowser", "rename");

const npmi = exec("npm i");
npmi.on("close", (code) => {
  if (code !== 0) {
    throw new Error("Error happened " + code);
  }

  const tsc = exec("tsc");
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

    const npm_publish = exec("npm publish --tag browser", { cwd: "browser" });
    npm_publish.stdout.on("data", function (data) {
      console.log(data.toString());
    });

    npm_publish.stderr.on("data", function (data) {
      console.error(data.toString());
    });

    npm_publish.on("close", (code) => {
      if (code === 0) {
        console.log("=====================================");
        console.log("FINISHED UPLOADING BROWSER VERSION");
        console.log("=====================================");
        fs.rmSync("tempBrowser", { recursive: true, force: true });
        fs.rmSync("dist", { recursive: true, force: true });
        // easier that writing two files smh
        const tsconfig = fs.readFileSync("tsconfig.json", "utf8");
        let newTsconfig = tsconfig.replace(/\.\/browser/g, "./dist");
        newTsconfig = newTsconfig.replace(/tempBrowser/g, "gramjs");
        fs.writeFileSync("tsconfig.json", newTsconfig, "utf8");
        const packageJSON = JSON.parse(fs.readFileSync("package.json", "utf8"));
        packageJSON.dependencies["node-localstorage"] = oldValueStorage;
        packageJSON.dependencies["socks"] = oldValueSocks;
        const oldVersion = packageJSON.version.split(".");
        +oldVersion[2]++;
        packageJSON.version = oldVersion.join(".");
        console.log("node version is", packageJSON.version);
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

          const tsc = exec("tsc");
          tsc.on("close", (code) => {
            if (code === 0) {
              fs.copyFileSync("package.json", "dist/package.json");
              fs.copyFileSync("README.md", "dist/README.md");
              fs.copyFileSync("LICENSE", "dist/LICENSE");
              fs.copyFileSync("gramjs/tl/api.d.ts", "dist/tl/api.d.ts");
              fs.copyFileSync("gramjs/define.d.ts", "dist/define.d.ts");
              renameFiles("dist", "delete");
              const npm_publish = exec("npm publish --tag latest", {
                cwd: "dist",
              });
              npm_publish.stdout.on("data", function (data) {
                console.log(data.toString());
              });

              npm_publish.stderr.on("data", function (data) {
                console.error(data.toString());
              });
              npm_publish.on("close", (code) => {
                if (code === 0) {
                  console.log("=====================================");
                  console.log("FINISHED UPLOADING NODE VERSION");
                  console.log("=====================================");
                } else {
                  throw new Error("something went wrong");
                }
              });
            } else {
              console.log(code);
              throw new Error("Error happened");
            }
          });
        });
      } else {
        throw new Error("something went wrong");
      }
    });
  });
});
