import * as vscode from 'vscode';
import { pullAll } from './pullAllHandler';

export const activate = async (context: vscode.ExtensionContext) => {
	getCommands().forEach(command => context.subscriptions.push(command));
}

export function deactivate() {}

const getCommands = () => [
	vscode.commands.registerCommand('multi-git.pullAll', pullAll),
];