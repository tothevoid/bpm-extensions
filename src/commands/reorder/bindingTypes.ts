export type DataBinding = {
	PackageData: RowData[];
}

export type RowData = {
	Row: ColumnData[]
}

export type ColumnData = {
	SchemaColumnUId: string;
	Value: string | boolean | number;
}

export type Sequence = {
	[key: string]: number;
}