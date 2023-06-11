/**
 * Root of data binding
 */
export type DataBinding = {
	PackageData: RowData[];
}

/**
 * Binded row
 */
export type RowData = {
	Row: ColumnData[]
}

/**
 * Column details
 */
export type ColumnData = {
	SchemaColumnUId: string;
	Value: string | boolean | number;
}

/**
 * Order sequence
 */
export type Sequence = {
	[key: string]: number;
}