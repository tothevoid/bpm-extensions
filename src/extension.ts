import * as vscode from 'vscode';
import { reorderDataBinding } from "./commands/reorder/dataBindingReorder"
import { removeEmptyDirectories } from './commands/cleardirs/clearDirs';


export const activate = async (context: vscode.ExtensionContext) => {
	const fixDataOrderCommand = vscode.commands.registerCommand('bpmsoft-ext.fixDataOrder', () => {reorderDataBinding();});
	const clearDirsCommand = vscode.commands.registerCommand('bpmsoft-ext.clearDirs', () => {removeEmptyDirectories();});
	context.subscriptions.push(fixDataOrderCommand);
	context.subscriptions.push(clearDirsCommand);
}

export function deactivate() {}