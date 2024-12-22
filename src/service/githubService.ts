import * as vscode from 'vscode';
import { Credentials } from '../credentials';

export const pushCommit = async () => {
  const credentials = new Credentials();
  try {
    const octokit = await credentials.getOctokit();
    const userInfo = await octokit.users.getAuthenticated();
    const owner = userInfo.data.login;
    const repo = 'code-tracking';

    // Create the repository if it doesn't exist
    try {
      await octokit.repos.createForAuthenticatedUser({
        name: repo,
        private: false,
      });
    } catch (err) {
      console.log('Repository might already exist', err);
    }

    // Get branches
    let branches = await octokit.repos.listBranches({
      owner,
      repo,
    });

    if (branches.data.length === 0) {
      // Create an initial branch
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Initial commit',
        content: Buffer.from(`# code-Tracking\n\nAutomated code tracking repository\n\n## Code Tracking Log\n\n| Timestamp | File Path | Commit Message | User |\n|-----------|-----------|----------------|------|\n`).toString('base64'),
        branch: 'main',
      });
    }

    branches = await octokit.repos.listBranches({
      owner,
      repo,
    });

    const defaultBranch = branches.data[0].name;

    // Get branch info
    const branchResponse = await octokit.repos.getBranch({
      owner,
      repo,
      branch: defaultBranch,
    });

    const branchInfo = branchResponse.data;
    const commitSHA = branchInfo.commit.sha;
    const treeSHA = branchInfo.commit.commit.tree.sha;

    // Fetch existing README.md content
    const readmeResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: 'README.md',
    });

    let readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');

    // Prepare new log entry
    const timestamp = new Date().toISOString();
    const filePath = 'src/example/file.ts'; // Replace with actual file path
    const commitMessage = 'Your commit message'; // Replace with actual commit message
    const user = owner;

    const newLogEntry = `| ${timestamp} | ${filePath} | ${commitMessage} | ${user} |\n`;

    // Append new log entry to the table
    const tableEndIndex = readmeContent.lastIndexOf('|------|');
    readmeContent = `${readmeContent.substring(0, tableEndIndex + '|------|\n'.length)}${newLogEntry}${readmeContent.substring(tableEndIndex + '|------|\n'.length)}`;

    // Create a new tree with updated README.md
    const treeResponse = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeSHA,
      tree: [
        {
          path: 'README.md',
          mode: '100644',
          type: 'blob',
          content: readmeContent,
        },
      ],
    });

    const newTreeSHA = treeResponse.data.sha;

    // Create a new commit
    const createCommit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTreeSHA,
      parents: [commitSHA],
    });

    // Update the branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: createCommit.data.sha,
    });

    vscode.window.showInformationMessage(`Commit created and README.md updated successfully.`);
  } catch (error) {
    console.error('Error:', error);
    vscode.window.showErrorMessage(`Failed to push commit: ${error}`);
  }
};
