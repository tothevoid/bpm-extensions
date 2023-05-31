import * as vscode from 'vscode';
import * as path from "path";
import * as fs from "fs";
import {DataBinding, RowData, ColumnData, Sequence} from "./bindingTypes"

import { simpleGit } from 'simple-git';

const PRIMARY_COLUMN_UID = "ae0e45ca-c495-4fe7-a39d-3ab7278e1617";

export function activate(context: vscode.ExtensionContext) {
	const currentlyOpenTabfilePath = vscode?.window.activeTextEditor?.document.fileName ?? "";
	const openedFile = path.basename(currentlyOpenTabfilePath);
	const gitRoot = findGitRoot(currentlyOpenTabfilePath);
	const git = simpleGit(gitRoot);
	git.log({file: currentlyOpenTabfilePath})
		.then(callback => {
			const {hash} = callback.all[0];
			git.show(`${hash}:${openedFile}`).then(comittedFileContent => {
				vscode.workspace.openTextDocument(currentlyOpenTabfilePath).then((document) => {
					const commitedBinding: DataBinding = JSON.parse(comittedFileContent);
					const currentBinding: DataBinding = JSON.parse(document.getText());
					
					const columnOrder = getColumnOrder(commitedBinding.PackageData);
					const rowsOrder = getRecordsOrder(commitedBinding.PackageData);

					const reorderedRows = reorderRowsAndColumns(currentBinding, columnOrder, rowsOrder);
					const file = generateReorderedFile({PackageData: reorderedRows});

					const editor = vscode.window.activeTextEditor;
					if (editor) {
						editor.edit(editBuilder => {
							editBuilder.replace(new vscode.Range(0, 0, document.lineCount, 1000), file);
							vscode.window.showInformationMessage('Formatting fixed');
						});
					}
				  });
			});
		});

	let disposable = vscode.commands.registerCommand('bpmsoft-ext.fixDataOrder', () => {});

	context.subscriptions.push(disposable);
}

/**
 * Recursively looking for the .git file
 * @param initialFilePath File path to start
 * @returns Path of the directory with .git file if it exists
 */
const findGitRoot: any = (initialFilePath: string) => {
	const parts = initialFilePath.split(path.sep);
	const higherDir: string[] = parts.slice(0, parts.length - 1);
	const newPath: string = path.join(...higherDir);
	const files = fs.readdirSync(newPath);
	if (files.includes(".git")){
		return newPath;
	} else if (!newPath) {
		return "";
	}
	return findGitRoot(newPath);
} 

/**
 * Returns correct columns order by actual data binding structure
 * @param rows Binded data rows
 * @returns {Sequence} Columns order
 */
const getColumnOrder = (rows: RowData[]) => {
	const bindedColumns: ColumnData[] = rows.map(entity => entity.Row)[0];
	const columnsIndentifiers: string[] = bindedColumns.map(el => el.SchemaColumnUId);
	return columnsIndentifiers.reduce<Sequence>((columnOrder, currentValue, index) => {
		columnOrder[currentValue] = index;
		return columnOrder;
	}, {});
}

/**
 * Returns correct rows order by actual data binding structure
 * @param rows Binded data rows
 * @returns {Sequence} Rows order
 */
const getRecordsOrder = (rows: RowData[]) => {
	const bindedRows: ColumnData[][] = rows.map(entity => entity.Row);
	const identifierColumnsSequence:string[] = bindedRows
		.map((bindedRow: ColumnData[]) => 
			(bindedRow.filter(column => column.SchemaColumnUId === PRIMARY_COLUMN_UID)[0])?.Value as string)
	const result: any = {}
	return identifierColumnsSequence.reduce<Sequence>((columnOrder, currentValue, index) => {
		columnOrder[currentValue] = index;
		return result;
	}, result);
}

/**
 * Reorders data binding rows and columns
 * @param currentBinding Data binding
 * @param columnsOrder Columns correct sequence
 * @param rowsOrder Rows correct sequence
 * @returns {RowData[]} Rows order
 */
const reorderRowsAndColumns = (currentBinding: DataBinding, columnsOrder: Sequence, rowsOrder: Sequence) => {
	const reorderedRows: RowData[] = [...Array(currentBinding.PackageData.length)];

	currentBinding.PackageData.forEach((packageElement: RowData) => {
		const reorderedColumns = [...Array(packageElement.Row.length)];
		let recordId: any;
		packageElement.Row.forEach((rowElement: ColumnData) => {
			if (rowElement?.SchemaColumnUId === PRIMARY_COLUMN_UID){
				recordId = rowElement.Value;
			}
			const correctColumnIndex = columnsOrder[rowElement.SchemaColumnUId];
			reorderedColumns[correctColumnIndex] = rowElement;
		});

		const correctRowIndex = rowsOrder[recordId];
		reorderedRows[correctRowIndex].Row = reorderedColumns;
	});

	return reorderedRows;
}

/**
 * Generates reordered file
 * @param dataBinding Reordered data binding
 * @returns {string} Text content of the file with correct order 
 */
const generateReorderedFile = (dataBinding: DataBinding) => {
	return JSON.stringify(dataBinding, null, "  ");
}

export function deactivate() {}