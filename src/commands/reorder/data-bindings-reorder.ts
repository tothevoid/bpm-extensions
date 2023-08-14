import { basename } from "path";
import { window } from "vscode";
import { WARNING} from "./warnings"
import { DataBinding, RowData, ColumnData, Sequence } from "./types"
import { getLastCommitedFileContent } from "./git-tools"
import { processDescriptor } from "./descriptor-processor"
import { reWriteFile, readFile } from "./file-utilities";

const PRIMARY_COLUMN_UID = "ae0e45ca-c495-4fe7-a39d-3ab7278e1617";
const DATA_FILE_NAME = "data.json"
const DESCRIPTOR_FILE_NAME = "descriptor.json"

const EXPECTED_FILES = [DATA_FILE_NAME, DESCRIPTOR_FILE_NAME];

/**
 * Reorders data.json file by the pattern of the commited file
 * @returns 
 */
export const reorderDataBinding = async () => {
    const currentlyOpenTabfilePath = window.activeTextEditor?.document.fileName ?? "";

	if (!EXPECTED_FILES.includes(basename(currentlyOpenTabfilePath))){
		window.showInformationMessage(WARNING.INCORRECT_FILE_PATH + EXPECTED_FILES.join(" or "));
		return;
	}
	await processDescriptor(currentlyOpenTabfilePath.replace(DATA_FILE_NAME, DESCRIPTOR_FILE_NAME));
	await startReoder(currentlyOpenTabfilePath.replace(DESCRIPTOR_FILE_NAME, DATA_FILE_NAME));
}

/**
 * Start the processing of current file
 * @param dataPath Current data binding file
 * @param openedFileName  Path of 
 * @param gitRoot Path of the git root
 * @returns 
 */
const startReoder = async (dataPath: string) => {
	let commitedBinding = await getLastCommitedFileContent<DataBinding>(dataPath);
	if (!commitedBinding){
		return;
	}
	const newContent = readFile<DataBinding>(dataPath);
	
	const columnsOrder = getColumnsOrder(commitedBinding.PackageData, newContent.PackageData);
	const rowsOrder = getRowsOrder(commitedBinding.PackageData, newContent.PackageData);

	const reorderedRows = reorderRowsAndColumns(newContent, columnsOrder, rowsOrder);
	reWriteFile<DataBinding>(dataPath, {PackageData: reorderedRows});
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