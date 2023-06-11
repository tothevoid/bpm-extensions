/**
 * Represetns an option of package selection
 */
export class Option {
    Name: string;
    Path: string;
    IsSelectedAll: boolean;

    constructor(name: string, path: string, isSelectedAll: boolean = false){
        this.Name = name;
        this.Path = path;
        this.IsSelectedAll = isSelectedAll;
    }
}