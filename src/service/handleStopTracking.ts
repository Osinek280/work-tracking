import * as vscode from 'vscode';
import { exec } from 'child_process';

export const hanldeStopTracking = async () => {
  const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

  return new Promise((resolve) => {
    exec('git remote get-url origin', { cwd: workspacePath }, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Błąd podczas pobierania repozytorium: ${stderr}`);
            resolve(undefined);
            return;
        }

        // Wyciąganie nazwy repozytorium z URL-a
        const url = stdout.trim();
        const repoNameMatch = url.match(/\/([^/]+)\.git$/); // Dopasowanie nazwy repo z końcówką ".git"
        if (repoNameMatch) {
            resolve(repoNameMatch[1]); // Zwracanie nazwy repozytorium
        } else {
            resolve(undefined);
        }
    });
});
};