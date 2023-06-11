import { readdirSync } from "fs";
import { basename, join, sep } from "path";
import { window, workspace, Range } from "vscode";
import { simpleGit } from 'simple-git';
import { WARNING} from "./warnings"
import { DataBinding, RowData, ColumnData, Sequence } from "./types"

const PRIMARY_COLUMN_UID = "ae0e45ca-c495-4fe7-a39d-3ab7278e1617";
const EXPECTED_FILE_NAME = "data.json"

/**
 * Reorders data.json file by the pattern of the commited file
 * @returns 
 */
export const reorderDataBinding = async () => {
    const currentlyOpenTabfilePath = window.activeTextEditor?.document.fileName ?? "";
	const openedFilePath = basename(currentlyOpenTabfilePath);

	if (openedFilePath !== EXPECTED_FILE_NAME){
		window.showInformationMessage(WARNING.INCORRECT_FILE_PATH + EXPECTED_FILE_NAME);
		return;
	}

	const gitRoot = findGitRoot(currentlyOpenTabfilePath);

	if (!gitRoot){
		window.showInformationMessage(WARNING.NO_GIT_REPOSITORY);
		return;
	}

	await startReoder(currentlyOpenTabfilePath, openedFilePath, gitRoot);
}

/**
 * Start the processing of current file
 * @param currentlyOpenTabfilePath Current data binding file
 * @param openedFilePath  Path of 
 * @param gitRoot Path of the git root
 * @returns 
 */
const startReoder = async (currentlyOpenTabfilePath: string, openedFilePath: string, gitRoot: string) => {
	const git = simpleGit(gitRoot);
	const gitFileLog = await git.log({file: currentlyOpenTabfilePath});

	if (!gitFileLog?.all?.length){
		window.showInformationMessage(WARNING.NO_COMMITED_HISTORY);
		return;
	}

	const {hash} = gitFileLog.all[0];
	const committedFileContent = await git.show(`${hash}:${openedFilePath}`);
	
	const currentEditingFile = await workspace.openTextDocument(currentlyOpenTabfilePath);
	const commitedBinding: DataBinding = JSON.parse(committedFileContent);
	const notStagedBinding: DataBinding = JSON.parse(currentEditingFile.getText());
	
	const columnsOrder = getColumnsOrder(commitedBinding.PackageData, notStagedBinding.PackageData);
	const rowsOrder = getRowsOrder(commitedBinding.PackageData, notStagedBinding.PackageData);

	const reorderedRows = reorderRowsAndColumns(notStagedBinding, columnsOrder, rowsOrder);
	const file = generateReorderedFile({PackageData: reorderedRows});
	
	modifyActiveFile(currentEditingFile.lineCount, file)
}

/**
 * Recursively searching for the .git file
 * @param initialFilePath File path to start
 * @returns Path of the directory with .git file if it exists
 */
const findGitRoot = (initialFilePath: string): string => {
	const parts = initialFilePath.split(sep);
	const higherDir: string[] = parts.slice(0, parts.length - 1);
	const newPath: string = join(...higherDir);
	const files = readdirSync(newPath);
	if (files.includes(".git")){
		return newPath;
	} else if (!newPath) {
		return "";
	}
	return findGitRoot(newPath);
}

/**
 * Returns correct columns order by actual data binding structure
 * by the pattern: commited columns list and the new columns
 * @param commitedRows Already binded data rows that commited into git
 * @param modifiedRows Not staged binded data rows
 * @returns {Sequence} Columns order
 */
const getColumnsOrder = (commitedRows: RowData[], modifiedRows: RowData[]): Sequence => {
    const modifiedColumns: Set<string> = new Set(modifiedRows[0].Row
        .map(entity => entity.SchemaColumnUId));

    const alreadyBindedColumns: Set<string> = new Set(commitedRows[0].Row
        .map(entity => entity.SchemaColumnUId)
        .filter(column => modifiedColumns.has(column)));

    const newColumns = [...modifiedColumns]
        .filter(column => !alreadyBindedColumns.has(column));

	return [...alreadyBindedColumns, ...newColumns]
        .reduce<Sequence>((columnOrder, currentValue, index) => {
            columnOrder[currentValue] = index;
            return columnOrder;
	}, {});
}

/**
 * Returns correct rows order by actual data binding structure
 * @param commitedRows Binded data rows that commited into git
 * @param modifiedRows Not staged binded data rows
 * @returns {Sequence} Rows order
 */
const getRowsOrder = (commitedRows: RowData[], modifiedRows: RowData[]): Sequence|null => {
	const commitedRowsIdentifiers = new Set(mapRowsIntoIdentifiers(commitedRows));
    //Case when identifier key is not presented into data set
    if (commitedRowsIdentifiers.size !== commitedRows.length){
        return null;
    }
    const modifiedRowsIdentifiers = new Set(mapRowsIntoIdentifiers(modifiedRows));

    const alreadyBindedRows = [...commitedRowsIdentifiers].filter(row => 
        modifiedRowsIdentifiers.has(row));

    const newRows = [...modifiedRowsIdentifiers].filter(row => 
        !commitedRowsIdentifiers.has(row));

	return [...alreadyBindedRows, ...newRows].reduce<Sequence>((columnOrder, currentValue, index) => {
		columnOrder[currentValue] = index;
		return columnOrder;
	}, {});
}

const mapRowsIntoIdentifiers = (rows: RowData[]): string[] => {
    const bindedRows: ColumnData[][] = rows.map(row => row.Row);
	return bindedRows
		.map((bindedRow: ColumnData[]) => getKeyFromRow(bindedRow))
}

const getKeyFromRow = (rowColumns: ColumnData[]): string => 
    rowColumns.find(column => column.SchemaColumnUId === PRIMARY_COLUMN_UID)?.Value as string

/**
 * Reorders data binding rows and columns
 * @param currentBinding Data binding
 * @param columnsOrder Columns correct sequence
 * @param rowsOrder Rows correct sequence
 * @returns {RowData[]} Rows order
 */
const reorderRowsAndColumns = (currentBinding: DataBinding, columnsOrder: Sequence, 
	rowsOrder: Sequence| null): RowData[] => {
	const reorderedRows: RowData[] = [...Array(currentBinding.PackageData.length)];

	currentBinding.PackageData.forEach((packageElement: RowData, currentIndex: number) => {
		const reorderedColumns = [...Array(packageElement.Row.length)];
		packageElement.Row.forEach((rowElement: ColumnData) => {
			const correctColumnIndex = columnsOrder[rowElement.SchemaColumnUId];
			reorderedColumns[correctColumnIndex] = rowElement;
		});

        const correctRowIndex = rowsOrder ?
            rowsOrder[getKeyFromRow(packageElement.Row)]:
            currentIndex;

        reorderedRows[correctRowIndex] = {Row: reorderedColumns};
	});

	return reorderedRows;
}

/**
 * Modify currently editing file
 * @param linesCount Current file lines quantity
 * @param fileContent Reorder file content
 */
const modifyActiveFile = (linesCount: number, fileContent: string) => {
	const editor = window.activeTextEditor;
	if (editor) {
		editor.edit(editBuilder => {
			editBuilder.replace(new Range(0, 0, linesCount, 1000), fileContent);
				window.showInformationMessage('Formatting fixed');
		});
	}
}

/**
 * Generates reordered file
 * @param dataBinding Reordered data binding
 * @returns {string} Text content of the file with correct order 
 */
const generateReorderedFile = (dataBinding: DataBinding): string => {
	return JSON.stringify(dataBinding, null, "  ");
}
