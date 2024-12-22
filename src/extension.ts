import * as vscode from 'vscode';
import { Credentials } from './credentials';
import { pushCommit } from './service/githubService';
import * as jsdiff from 'diff';

export async function activate(context: vscode.ExtensionContext) {
  const credentials = new Credentials();
  await credentials.initialize(context);

  const auth = vscode.commands.registerCommand('extension.getGitHubUser', async () => {
    const octokit = await credentials.getOctokit();
    const userInfo = await octokit.users.getAuthenticated();
    vscode.window.showInformationMessage(`Logged into GitHub as ${userInfo.data.login}`);
  });

  const startTracking = vscode.commands.registerCommand('devtrack.startTracking', async () => {
    try {
      const config = vscode.workspace.getConfiguration('devtrack');
      const trackedExtensions = [
        'ts', 'js', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'html', 'jsx', 'tsx', 'vue', 'php', 'rb', 'go', 'rs', 'swift', 'md', 'json', 'yml', 'yaml'
      ];
      const excludePatterns = config.get<string[]>('exclude', []);
      const commitFrequency = config.get<number>('commitFrequency', 30) * 60000;

      const files = await vscode.workspace.findFiles('**/*', `{${excludePatterns.join(',')}}`);
      const fileStatuses = await Promise.all(files
        .filter(file => trackedExtensions.includes(file.fsPath.split('.').pop() || ''))
        .map(async file => {
          const document = await vscode.workspace.openTextDocument(file);
          return {
            path: file.fsPath,
            saved: !document.isDirty,
            content: document.getText()
          };
        }));

      const panel = vscode.window.createWebviewPanel(
        'fileStatus',
        'File Status',
        vscode.ViewColumn.One,
        {}
      );

      const fileStatusHtml = fileStatuses.map(fileStatus => {
        return `<p>File: ${fileStatus.path}, Saved: ${fileStatus.saved}</p><pre>${fileStatus.content}</pre>`;
      }).join('');

      panel.webview.html = `<html><body>${fileStatusHtml}</body></html>`;

      setInterval(async () => {
        const updatedFiles = await vscode.workspace.findFiles('**/*', `{${excludePatterns.join(',')}}`);
        const updatedFileStatuses = await Promise.all(updatedFiles
          .filter(file => trackedExtensions.includes(file.fsPath.split('.').pop() || ''))
          .map(async file => {
            const document = await vscode.workspace.openTextDocument(file);
            return {
              path: file.fsPath,
              saved: !document.isDirty,
              content: document.getText()
            };
          }));

        const changes = updatedFileStatuses.filter(updatedFile => {
          const originalFile = fileStatuses.find(file => file.path === updatedFile.path);
          return originalFile && originalFile.content !== updatedFile.content;
        });

        if (changes.length > 0) {
          changes.forEach(file => {
            const originalFile = fileStatuses.find(f => f.path === file.path);
            const diff = jsdiff.createPatch(file.path, originalFile?.content || '', file.content);
            console.log(`File: ${file.path}`);
            console.log(`Diff:\n${diff}`);            
          });
          vscode.window.showInformationMessage(`Changed files: ${changes.map(file => file.path).join(', ')}`);
        } else {
          vscode.window.showInformationMessage('No files were changed.');
        }
      }, commitFrequency);
    } catch (error) {
      vscode.window.showErrorMessage(`Error starting tracking: ${error}`);
    }
  });

  const createCommit = vscode.commands.registerCommand('devtrack.createCommit', async () => {
    pushCommit();
  });

  context.subscriptions.push(
    auth,
    startTracking,
    createCommit,
  );
}

