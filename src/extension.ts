import * as vscode from 'vscode';
import { Credentials } from './credentials';
import { pushCommit } from './service/githubService';

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
      const octokit = await credentials.getOctokit();
      const userInfo = await octokit.users.getAuthenticated();
      const repoOwner = userInfo.data.login; 
      const config = vscode.workspace.getConfiguration('devtrack');
      const repoName = config.get<string>('repoName') || 'code-tracking';

      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${credentials.token}` 
        }
      });

      if (response.ok) {
        const commits = await response.json();
        console.log(commits);
        vscode.window.showInformationMessage('Started tracking repository!');
      } else {
        console.error('Failed to fetch commits:', response.status, response.statusText);
        vscode.window.showErrorMessage(`Failed to fetch commits: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error during the tracking operation:", error);
      vscode.window.showErrorMessage(`Failed to start tracking the repository: ${error}`);
    }
  });

  const createCommit = vscode.commands.registerCommand('devtrack.createCommit', async () => {
    pushCommit();
  });

  context.subscriptions.push(
    auth,
    startTracking,
    createCommit
  );
}

