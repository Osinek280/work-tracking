import * as vscode from 'vscode';
import * as jsdiff from 'diff';

export const tracker = async () => {
  try {
    const config = vscode.workspace.getConfiguration('devtrack');
    const trackedExtensions = [
      'ts', 'js', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'html', 'jsx', 'tsx', 'vue', 'php', 'rb', 'go', 'rs', 'swift', 'md', 'json', 'yml', 'yaml'
    ];
    const excludePatterns = config.get<string[]>('exclude', []);
    const commitFrequency = config.get<number>('commitFrequency', 30) * 60000;

    vscode.window.showInformationMessage(`Start Tracking`);

    let files = await vscode.workspace.findFiles('**/*', `{${excludePatterns.join(',')}}`);
    let fileStatuses = await Promise.all(files
      .filter(file => trackedExtensions.includes(file.fsPath.split('.').pop() || ''))
      .map(async file => {
        const document = await vscode.workspace.openTextDocument(file);
        return {
          path: file.fsPath,
          saved: !document.isDirty,
          content: document.getText()
        };
      }));

    setInterval(async () => {
      files = await vscode.workspace.findFiles('**/*', `{${excludePatterns.join(',')}}`);
      const updatedFileStatuses = await Promise.all(files
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
        const allChanges = changes.reduce((acc, file) => {
          const originalFile = fileStatuses.find(f => f.path === file.path);
          const diff = jsdiff.createPatch(file.path, originalFile?.content || '', file.content);
          return acc + `File: ${file.path}\nDiff:\n${diff}\n\n`;
        }, '');

        console.log('All changes: ');
        console.log(allChanges);

        // const { sucess, error, completion } = await groqMessage(allChanges);
        
        // if (!sucess) {
        //   vscode.window.showErrorMessage(`Error fetching ai content: ${error}`);
        // } else {
        //   const message = completion?.choices[0]?.message.content;

        //   if (message) {

        //   }
        // }

        vscode.window.showInformationMessage(`Changed files: ${changes.map(file => file.path).join(', ')}`);
      } else {
        vscode.window.showInformationMessage('No files were changed.');
      }

      fileStatuses = updatedFileStatuses;
    }, commitFrequency);
  } catch (error) {
    vscode.window.showErrorMessage(`Error starting tracking: ${error}`);
  }
};