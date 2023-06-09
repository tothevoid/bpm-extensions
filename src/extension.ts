import * as vscode from 'vscode';
import { reorderDataBinding } from "./commands/reorder/data-bindings-reorder"
import { removeEmptyDirectories } from './commands/removal/directories-removal';


export const activate = async (context: vscode.ExtensionContext) => {
	const fixDataOrderCommand = vscode.commands.registerCommand('bpmsoft-ext.fixDataOrder', () => {reorderDataBinding();});
	const removeDirsCommand = vscode.commands.registerCommand('bpmsoft-ext.removeDirs', () => {removeEmptyDirectories();});
	context.subscriptions.push(fixDataOrderCommand);
	context.subscriptions.push(removeDirsCommand);
}

export function deactivate() {}