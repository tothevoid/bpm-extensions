// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from "path";

import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const git = simpleGit("C:\\Users\\tothe\\Desktop\\test");
	git.log({file: "C:\\Users\\tothe\\Desktop\\test\\data.json"})
		.then(callback => {
			const {hash} = callback.all[0];
			git.show(`${hash}:data.json`).then(res => {
				var currentlyOpenTabfilePath = vscode?.window.activeTextEditor?.document.fileName ?? "";
				vscode.workspace.openTextDocument(currentlyOpenTabfilePath).then((document) => {
					const commitedData:any = JSON.parse(res);
					const modifiedData:any = JSON.parse(document.getText());
					
					const columnOrder = getColumnOrder(commitedData.PackageData);
					const recordsOrder = getRecordsOrder(commitedData.PackageData);

					const reorderedRows = [...Array(commitedData.PackageData.length)];
					
					modifiedData.PackageData.forEach((packageElement:any) => {
						const reorderedColumns = [...Array(packageElement.Row.length)];
						let recordId: any;
						packageElement.Row.forEach((rowElement:any) => {
							if (rowElement?.SchemaColumnUId === "ae0e45ca-c495-4fe7-a39d-3ab7278e1617"){
								recordId = rowElement.Value;
							}
							const ix = columnOrder[rowElement.SchemaColumnUId];
							reorderedColumns[ix] = rowElement;
						});

						const rowIx = recordsOrder[recordId];
						reorderedRows[rowIx] = {Row: reorderedColumns};
					});

					const file = getFile({PackageData: reorderedRows});

					const editor = vscode.window.activeTextEditor;
					if (editor) {
						editor.edit(editBuilder => {
							editBuilder.replace(new vscode.Range(0,0,document.lineCount, 1000), file);
						});
					}
				  });
			});
		})
	;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bpmsoft-ext" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('bpmsoft-ext.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from bpmsoft-ext!');
	});

	context.subscriptions.push(disposable);
}

const parseData = (data: any) => {
	// data.PackageData[0].Row[0].Value
	// return model.Row.Select(row => row.SchemaColumnUId).Select((elm, ix) => new { Item = elm, Index = ix})
	// 	.ToDictionary(k => k.Item, v => v.Index);
}

const getColumnOrder = (obj: any[]) => {
	const r:any[] = obj.map(elm => elm.Row)[0];
	const r2:string[] = r.map(el => el.SchemaColumnUId);
	const result: any = {}
	r2.forEach((val: string, ix: number) => {result[val] = ix});
	return result;
}

const getRecordsOrder = (obj: any[]) => {
	const id = "ae0e45ca-c495-4fe7-a39d-3ab7278e1617";

	const r:any[] = obj.map(elm => elm.Row);
	const r2:string[] = r.map((el:any[]) => el.filter(el2 => el2.SchemaColumnUId === id)[0]).map(el => el.Value);
	const result: any = {}
	r2.forEach((val: string, ix: number) => {result[val] = ix});
	return result;
}

const getFile = (json: Object) => {
	return JSON.stringify(json, null, "  ");
}



// This method is called when your extension is deactivated
export function deactivate() {}
