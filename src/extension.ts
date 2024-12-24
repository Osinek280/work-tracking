import * as vscode from 'vscode';
import { Credentials } from './credentials';
import { tracker } from './service/tracker';
import { hanldeStopTracking } from './service/handleStopTracking';

export async function activate(context: vscode.ExtensionContext) {
  const credentials = new Credentials();
  await credentials.initialize(context);

  tracker();

  const repoName = await hanldeStopTracking();

  console.log(repoName);

  const auth = vscode.commands.registerCommand('extension.getGitHubUser', async () => {
    const octokit = await credentials.getOctokit();
    const userInfo = await octokit.users.getAuthenticated();
    vscode.window.showInformationMessage(`Logged into GitHub as ${userInfo.data.login}`);
  });

  context.subscriptions.push(
    auth,
  );
}

