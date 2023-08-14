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

/**
 * Configuration element descriptor root
 */
export type Descriptor = {
    Descriptor: DescriptorData
}

/**
 * Descriptor details
 */
export type DescriptorData = {
	ModifiedOnUtc: string,
	Columns: DescriptorColumn[]
}

export type DescriptorColumn = {
	ColumnUId: string,
	IsForceUpdate: boolean,
	IsKey: boolean,
	ColumnName: string
}