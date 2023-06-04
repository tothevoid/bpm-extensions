import * as vscode from 'vscode';
import { reorderDataBinding } from "./dataBindingReorder"


export const activate = async (context: vscode.ExtensionContext) => {
	reorderDataBinding();

	const disposable = vscode.commands.registerCommand('bpmsoft-ext.fixDataOrder', () => {});
	context.subscriptions.push(disposable);
}

export function deactivate() {}