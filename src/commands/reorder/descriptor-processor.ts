import { getLastCommitedFileContent } from "./git-tools"
import { Descriptor } from "./types";
import { reWriteFile, readFile } from "./file-utilities";

export const processDescriptor = async (descriptorPath: string) => {
    const commitedDescriptor = await getLastCommitedFileContent<Descriptor>(descriptorPath);
    const modifiedDescriptor = readFile<Descriptor>(descriptorPath);
    if (!commitedDescriptor) {
        return;
    }
    const newDescriptor = await reorderColumns(commitedDescriptor, modifiedDescriptor);
    newDescriptor.Descriptor.ModifiedOnUtc = newDescriptor.Descriptor.ModifiedOnUtc
    reWriteFile(descriptorPath, newDescriptor);
}

const reorderColumns = async (commitedDescriptor: Descriptor, descriptorPath: Descriptor)  => {
    const currentColumns = commitedDescriptor.Descriptor.Columns
        .reduce((acc: any, currentColumn) => {acc[currentColumn.ColumnName] = currentColumn; return acc}, {});
    
    const newColumns = commitedDescriptor.Descriptor.Columns.map(column => currentColumns
        .hasOwnProperty(column.ColumnName) ? currentColumns[column.ColumnName]: null)
        .filter(column => column != null);

    const alreadyAddedColumns = new Set(newColumns.map(column => column.ColumnName));

    descriptorPath.Descriptor.Columns.forEach(column => {
        if (!alreadyAddedColumns.has(column.ColumnName)){
            newColumns.push(column);
        }
    })

    descriptorPath.Descriptor.Columns = newColumns;
    //TODO: value is modified by ref
    return descriptorPath;
}
