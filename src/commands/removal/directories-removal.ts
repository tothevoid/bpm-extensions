import { join, sep } from "path";
import { readdirSync, readFileSync, rmdirSync  } from "fs";
import * as vscode from 'vscode';
import { Descriptor } from "./types";
import { Option } from "./classes";
import { WARNING, NOTIFICATION} from "./messages";

const PACKAGES_DIR_NAME = "Pkg";
const EXPECTED_DIRS = new Set(["Data", "Schemas", "Resources", "SqlScripts"]);
const DESCRIPTOR_NAME = "descriptor.json";
const LOCALIZATION_DIR = "Localization";
const REMOVE_ALL_OPTION = "Remove all";
const VALID_MAINTAINER = "Customer"

/**
 * Removes empty directories in packages
 */
export const removeEmptyDirectories = () => {
    const workingDirectoryPath = getWorkingDirectoryPath();
    if (!workingDirectoryPath){
        vscode.window.showInformationMessage(WARNING.NO_WORKING_DIRECTORY);
        return;
    }

    const pkgPath = getPkgDirectoryPath(workingDirectoryPath);
    if (!pkgPath) {
        vscode.window.showInformationMessage(WARNING.NO_PKG_DIRECTORY);
		return;
    }

    const options = getDeletionOptions(pkgPath);
    if (!options){
        vscode.window.showInformationMessage(WARNING.NO_VALID_PACKAGES);
		return;
    }

    vscode.window.showQuickPick(options.map(option => option.Name)).then((selection) => {
        if (!selection){
            return;
        }

        const selectedOption = options.find(option => option.Name == selection);
        if (selectedOption){
            const emptyDirectories = (selectedOption.IsSelectedAll) ?
                getEmptyDirectoriesOfPackages(selectedOption.Path):
                getEmptyDirectoriesOfPackage(selectedOption.Path);

            const option = (selectedOption.IsSelectedAll) ?
                NOTIFICATION.ALL_PKGS_OPTION:
                selectedOption.Name;

            if (emptyDirectories.length == 0){
                vscode.window.showInformationMessage(`${NOTIFICATION.NO_EMPTY_DIRS} ${option}`);
                return;
            } else {
                
            
                const directoriesAffected = removeDirectories(emptyDirectories);
                vscode.window.showInformationMessage(`${option} directories removal job completed. Directories affected: ${directoriesAffected}`);
            }
        }  
    });
}

/**
 * Searching for the packages directory from the current opened directory
 * @param initialFilePath Path when the search starts
 * @returns Path of package directory
 */
const getPkgDirectoryPath = (initialFilePath: string) => {
    const urlParts = initialFilePath.split(sep);
    const hasPkgDirInPath = urlParts
        .findIndex(part => part == PACKAGES_DIR_NAME);
    
    const searchResult = hasPkgDirInPath !== -1 ?
        getBackwardDirectory(initialFilePath):
        getForwardDirectory(initialFilePath);
        
    return searchResult;
} 

/**
 * Getting opened directory path
 * @returns Current directory path
 */
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

/**
 * Finds all empty directories of packages 
 * @param rootPath Path of the Pkg directory 
 * @returns All packages empty directories paths
 */
const getEmptyDirectoriesOfPackages = (rootPath: string): string[] => {
    let emptyDirectories: string[] = [];
    const directories = readdirSync(rootPath, { withFileTypes: true });
    directories.filter(dir => dir.isDirectory()).forEach(dir => {
        getEmptyDirectoriesOfPackage(join(rootPath, dir.name)).forEach(emptyDir => emptyDirectories.push(emptyDir));
    })
    return emptyDirectories;
}

/**
 * Finds empty directories of package
 * @param packagePath Package path 
 * @returns Package empty directories paths
 */
const getEmptyDirectoriesOfPackage = (packagePath: string) => {
    const emptyDirectories: string[] = [];
    const configurationElementTypeDirs = getConfigurationElementTypesDirs(packagePath);
    configurationElementTypeDirs.forEach(configurationElementTypeDir => {
        const packageTypesDirectory = join(packagePath, configurationElementTypeDir);
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

/**
 * Removes directories by paths
 * @param directoriesPaths Paths of directories which should be removed
 * @returns Quantity of removed directories
 */
const removeDirectories = (directoriesPaths: string[]): number => {
    let directoriesAffected = 0;
    directoriesPaths.forEach(directoryPath => {
        console.log(directoryPath)
        rmdirSync(directoryPath);
        directoriesAffected++;
    });
    return directoriesAffected;
}

/**
 * Gets valid directories of configuration elements types
 * @param packagePath Path of the package
 * @returns Valid directories
 */
const getConfigurationElementTypesDirs = (packagePath: string): string[] => 
    readdirSync(packagePath, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && EXPECTED_DIRS.has(entry.name))
        .map(dirent => dirent.name);

/**
 * Searches for packages directory from the current to the start of the path
 * @param path Path where the search starts
 * @returns Packages directory if it exists
 */
const getBackwardDirectory = (path: string): string => {
    const pathParts = path.split(sep);
    const indexOfEnd = pathParts.findIndex(pathPart => pathPart === PACKAGES_DIR_NAME);
    return indexOfEnd !== -1 ?
        join(...pathParts.slice(0, indexOfEnd + 1)) :
        "";
}

/**
 * Searches for packages directory from the current to the deepest one
 * @param path Path where the search starts
 * @returns Packages directory if it exists
 */
const getForwardDirectory = (path: string): string => {
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

/**
 * Gets directories of the packages by the option format
 * @param pkgPath Path of the packages root
 * @returns 
 */
const getDeletionOptions = (pkgPath: string): Option[] => {
    const dirs = readdirSync(pkgPath);
    const options: Option[] = [new Option(REMOVE_ALL_OPTION, pkgPath, true)];
    dirs.forEach(subDir => {
        const packagePath = join(pkgPath, subDir);
        const packageData = readdirSync(packagePath);
        const descriptorPath = packageData.find(packageElement => packageElement === DESCRIPTOR_NAME);
        if (descriptorPath){
            const decriptorRaw = readFileSync(join(packagePath, descriptorPath), { encoding: 'utf8', flag: 'r' }).replace(/^\uFEFF/, '');
            const descriptor: Descriptor = JSON.parse(decriptorRaw);
            if (descriptor?.Descriptor?.Maintainer === VALID_MAINTAINER){
                options.push(new Option(descriptor.Descriptor.Name, packagePath));
            }
        }
    })
    return options;
}