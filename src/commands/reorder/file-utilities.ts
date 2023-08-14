import { readFileSync, writeFile } from "fs";

export const readFile = <T>(filePath: string): T => {
    const decriptorRaw = readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).replace(/^\uFEFF/, '');


    return JSON.parse(decriptorRaw);
}

export const reWriteFile = <T>(filePath: string, content: T) => {
    const file = JSON.stringify(content, null, "  ");

    let result = "";
    for (var i = 0; i < file.length; i++) {
        result += file.charCodeAt(i);
    }

    writeFile(filePath, ("\ufeff" + file).replace(/\x2f/g, "\x5c\x2F"), ()=>{});
}