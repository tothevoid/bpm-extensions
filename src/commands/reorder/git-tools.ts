import { basename, join, sep } from "path";
import simpleGit from "simple-git";
import { resolve } from "path";
import { readdirSync } from "fs";

export const getLastCommitedFileContent = async<T> (path: string): Promise<T> => {
    const fileDirectory = resolve(path, '..');
    const git = simpleGit(fileDirectory);
    const gitFileLog = await git.log({file: basename(path)});
    if (!gitFileLog?.all?.length){
        return null as T;
    }
    const {hash} = gitFileLog.all[0];
    const rootPath = findGitRoot(fileDirectory);
    const subPath = path.replace(rootPath, "").replace(/\\/g, "/").slice(1);

    let commitedVersion = (await git.show(`${hash}:${subPath}`))?.replace(/^\uFEFF/, '');
    if (!commitedVersion){
        return null as T;
    }

    return JSON.parse(commitedVersion);
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
	const dirs = readdirSync(newPath);
	if (dirs.includes(".git")){
		return newPath;
	} else if (!newPath) {
		return "";
	}
	return findGitRoot(newPath);
}
