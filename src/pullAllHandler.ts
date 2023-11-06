import * as vscode from 'vscode';
import {sep} from "path"

export const pullAll = () => {
    const repositories = getRepositories();

    repositories.forEach(async (repository: any) => {
        const repoName = getRepoName(repository);
        if (!repository?.state?.remotes?.length){
            console.log(`${repoName} skipped. No remotes`)
            return;
        }

        const refs = await repository?.getRefs();
        if (!refs?.length){
            console.log(`${repoName} skipped. No refs`)
            return;
        }
        
        const changes = await repository?.diffWithHEAD();
        if (!changes?.length){
            await repository.pull();
            console.log(`${repoName} pulled`)
        } else {
            console.log(`${repoName} skipped. Has changes`)
        }
    })
}

const getRepositories = () => {
    const gitExtension = vscode?.extensions?.getExtension('vscode.git')?.exports;
    return gitExtension.getAPI(1)?.repositories || [];
}

const getRepoName = (repository: any) => {
    const uri = repository.rootUri?.fsPath;
    let repoName = "";

    if (uri){
        const parts = uri.split(sep);
        if (parts.length){
            repoName = parts[parts.length - 1];
        }
    }
    return repoName;
}