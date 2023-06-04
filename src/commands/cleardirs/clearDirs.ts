import { basename, join, sep, } from "path";
import { readdirSync, readFileSync, rmdirSync  } from "fs";
import * as vscode from 'vscode';
import { Descriptor, PackageOption } from "./clearTypes";

const CLEAR_ALL_OPTION = "Clear all"
const PACKAGES_DIR_NAME = "Pkg";
const EXPECTED_DIRS = new Set(["Data", "Schemas", "Resources", "SqlScripts"]);
const DESCRIPTOR_NAME = "descriptor.json";
const LOCALIZATION_DIR = "Localization";

/**
 * Removes empty directories in packages
 */
export const removeEmptyDirectories = () => {
    const workingDirectoryPath = getWorkingDirectoryPath();
    if (!workingDirectoryPath){
        return;
    }

    const pkgPath = getPkgDirectoryPath(workingDirectoryPath);
    if (!pkgPath) {
        vscode.window.showInformationMessage(`There is no Pkg folder in the current workspace`);
		return;
    }

    const options = getDeletionOptions(pkgPath);
    if (options){
        vscode.window.showQuickPick(options.map(option => option.Name)).then((selection) => {
            if (selection){
                const selectedOption = options.find(option => option.Name == selection);
                if (selectedOption){
                    const emptyDirectories = getEmptyDirectories(selectedOption.Path);
                    clearDirectories(emptyDirectories);
                }  
            }
        })
    };
}

const getPkgDirectoryPath = (initialFilePath: string) => {
    const urlParts = initialFilePath.split(sep);
    const hasPkgDirInPath = urlParts
        .findIndex(part => part == PACKAGES_DIR_NAME);
    
    const searchResult = hasPkgDirInPath !== -1 ?
        getBackwardDirectory(initialFilePath):
        getForwardDirectory(initialFilePath);
        
    return searchResult;
} 

const getWorkingDirectoryPath = () => {
    let currentPath = vscode?.window.activeTextEditor?.document.fileName;
    if (!currentPath){
        const workspace = vscode?.workspace?.workspaceFolders;
        if (workspace?.length !== 0){
            currentPath = workspace?.at(0)?.uri?.fsPath ?? "";
        }
    }
    return currentPath ?? "";
}

const getEmptyDirectories = (packagePath: string) => {
    const emptyDirectories: string[] = [];
    const packageTypePaths = getPackagePaths(packagePath);
    packageTypePaths.forEach(typePath => {
        const packageTypesDirectory = join(packagePath, typePath.name);
        const typedElements = readdirSync(packageTypesDirectory, { withFileTypes: true });
        typedElements.forEach(typedElement => {
            const entries = readdirSync(join(packageTypesDirectory, typedElement.name), { withFileTypes: true });
            const files = entries.filter(entry => !entry.isDirectory());
            if (files.length == 0)
            {
                const dirs = entries.filter(entry => entry.isDirectory());
                if (dirs.length == 1 && dirs[0].name.endsWith(LOCALIZATION_DIR))
                {
                    const elementPath = join(packageTypesDirectory,  typedElement.name, dirs[0].name);
                    readdirSync(elementPath).forEach(dirToDelete => {
                        emptyDirectories.push(join(elementPath, dirToDelete))
                    })
                    emptyDirectories.push(elementPath);
                }
                emptyDirectories.push(join(packageTypesDirectory, typedElement.name));
            }
        });
    })
    return emptyDirectories;
}

const clearDirectories = (directoriesPaths: string[]) => {
    directoriesPaths.forEach(directoryPath => {
        rmdirSync(directoryPath);
        console.log(`Removed: ${directoryPath}`);
    });
}


const getPackagePaths = (rootPath: string) => 
    readdirSync(rootPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && EXPECTED_DIRS.has(entry.name));

const getBackwardDirectory = (path: string) => {
    const pathParts = path.split(sep);
    const indexOfEnd = pathParts.findIndex(pathPart => pathPart === PACKAGES_DIR_NAME);
    return indexOfEnd !== -1 ?
        join(...pathParts.slice(0, indexOfEnd + 1)) :
        "";
}

const getForwardDirectory = (path: string) => {
	const dirElements = readdirSync(path, { withFileTypes: true })
        .filter(entry => entry.isDirectory());
    for (let index = 0; index < dirElements.length; index++) {
        const subElementName = dirElements[index].name;
        const subPath = join(path, subElementName);
        if (subElementName === PACKAGES_DIR_NAME){
            return subPath;
        } else {
            const forwardResult: string = getForwardDirectory(subPath);
            if (forwardResult){
                return forwardResult;
            }
        }
    }
    return "";
}

const getDeletionOptions = (path: string) => {
    const dirs = readdirSync(path);
    const options: PackageOption[] = [{Name: CLEAR_ALL_OPTION, Path: path}];
    dirs.forEach(subDir => {
        const packagePath = join(path, subDir);
        const packageData = readdirSync(packagePath);
        const descriptorPath = packageData.find(packageElement => packageElement === DESCRIPTOR_NAME);
        if (descriptorPath){
            const decriptorRaw = readFileSync(join(packagePath, descriptorPath), { encoding: 'utf8', flag: 'r' }).replace(/^\uFEFF/, '');
            const descriptor: Descriptor = JSON.parse(decriptorRaw)
            options.push({Name: descriptor.Descriptor.Name, Path: packagePath})
        } else {
            options.push({Name: subDir, Path: packagePath});
        }
    })
    return options;
}