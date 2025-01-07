import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import ignore from "ignore";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "zip-pack.createZip",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }

      const rootPath = workspaceFolders[0].uri.fsPath;
      const gitignorePath = path.join(rootPath, ".gitignore");

      let ignoredPatterns: string[] = [];
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
        ignoredPatterns = gitignoreContent
          .split(/\r?\n/)
          .filter((line) => line && !line.startsWith("#"));
      }

      ignoredPatterns.push(".compressed");
      const ig = ignore().add(ignoredPatterns);
      const zip = new AdmZip();
      const addFilesToZip = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const relativePath = path.relative(rootPath, filePath);

          if (ig.ignores(relativePath)) {
            continue;
          }

          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            addFilesToZip(filePath);
          } else {
            zip.addLocalFile(filePath, path.dirname(relativePath));
          }
        }
      };

      addFilesToZip(rootPath);

      const currentDate = new Date();
      const formattedDate = `${currentDate
        .getDate()
        .toString()
        .padStart(2, "0")}-${(currentDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${currentDate.getFullYear()}`;
      const workspaceName = path.basename(rootPath);
      const zipFolder = path.join(rootPath, ".compressed");

      // Ensure .compressed directory exists
      if (!fs.existsSync(zipFolder)) {
        fs.mkdirSync(zipFolder);
      }

      let zipFileName = `${workspaceName} ${formattedDate}.zip`;
      let zipPath = path.join(zipFolder, zipFileName);

      // Check if file already exists, and add counter if necessary
      let counter = 1;
      while (fs.existsSync(zipPath)) {
        zipFileName = `${workspaceName} ${formattedDate} ${counter}.zip`;
        zipPath = path.join(zipFolder, zipFileName);
        counter++;
      }

      zip.writeZip(zipPath);

      vscode.window.showInformationMessage(
        `Zip created at .compressed/${zipFileName}`
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
