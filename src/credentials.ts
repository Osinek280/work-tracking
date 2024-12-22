import * as vscode from 'vscode';
import * as Octokit from '@octokit/rest';

const GITHUB_AUTH_PROVIDER_ID = 'github';
const SCOPES = ['repo', 'user:email']; // Dodano 'repo' scope

export class Credentials {
    private octokit: Octokit.Octokit | undefined;
    public token: string | undefined; // Dodajemy właściwość token

    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.registerListeners(context);
        await this.setOctokit();
    }

    private async setOctokit() {
        const session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: true });

        if (session) {
            this.octokit = new Octokit.Octokit({
                auth: session.accessToken
            });
            this.token = session.accessToken; // Przypisujemy token
            return;
        }

        this.octokit = undefined;
        this.token = undefined; // Resetujemy token
    }

    registerListeners(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.authentication.onDidChangeSessions(async e => {
            if (e.provider.id === GITHUB_AUTH_PROVIDER_ID) {
                await this.setOctokit();
            }
        }));
    }

    async getOctokit(): Promise<Octokit.Octokit> {
        if (this.octokit) {
            return this.octokit;
        }

        const session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: true });
        this.octokit = new Octokit.Octokit({
            auth: session.accessToken
        });
        this.token = session.accessToken; // Przypisujemy token

        return this.octokit;
    }
}