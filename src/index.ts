import * as _ from 'lodash'
export {
    EnumType,
    Field,
    isArrayType,
    isEnumType,
    isLogicalType,
    isMapType,
    isOptional,
    isRecordType,
    RecordType,
    Type,
} from "./model";

import {
    EnumType,
    Field,
    isArrayType,
    isEnumType,
    isLogicalType,
    isMapType,
    isOptional,
    isRecordType,
    RecordType,
    Schema,
    Type,
} from "./model";

/** Convert a primitive type from avro to TypeScript */
export function convertPrimitive(avroType: string): string {
    switch (avroType) {
        case "long":
        case "int":
          return "Type.Integer()"
        case "double":
        case "float":
            return "Type.Number()";
        case "bytes":
            return "Type.Unknown()";
        case "null":
            return "Type.Null()";
        case "boolean":
            return "Type.Boolean()";
        case "string":
          return "Type.String()";
        default:
            return null;
    }
}

/** Converts an Avro record type to a TypeScript file */
export function avroToJSONSchema(schema: Schema): { file: string, dependencies: string[], records: string[] } {
    const output: string[] = [];
    const dependencies: string[] = [];
    const records: string[] = [];
    if (isEnumType(schema)) convertEnum(schema, output);
    else if (isRecordType(schema)) convertRecord(schema, output, dependencies, records);
    else throw "Unknown top level type " + (schema as unknown)["type"];
    return {file: output.join("\n"), dependencies, records};
}



/** Convert an Avro Record type. Return the name, but add the definition to the file */
export function convertRecord(recordType: RecordType, fileBuffer: string[], dependencies: string[], records: string[]): string {
    const schemaName = _.camelCase(recordType.name+'Schema');
    let buffer = `export const ${schemaName} = Type.Object({\n`;
    for (let field of recordType.fields) {
        buffer += convertFieldDec(field, fileBuffer, dependencies, records) + "\n";
    }
    buffer += "})\n";
    buffer += `export type ${recordType.name} = Static<typeof ${schemaName}>;`
    fileBuffer.push(buffer);
    records.push(schemaName)
    return schemaName;
}

/** Convert an Avro Enum type. Return the name, but add the definition to the file */
export function convertEnum(enumType: EnumType, fileBuffer: string[]): string {
    const enumDef = `export enum ${enumType.name} { ${enumType.symbols.join(", ")} };\n`;
    fileBuffer.push(enumDef);
    return enumType.name;
}

export function convertType(type: Type, buffer: string[], dependencies: string[], records: string[]): string {
    // if it's just a name, then use that
    if (typeof type === "string") {
      const convertedValue = convertPrimitive(type)
        if(convertedValue){
          return convertedValue
        }
        else {
          dependencies.push(_.camelCase(type+'Schema'))
          return _.camelCase(type+'Schema');
        }
    } else if (type instanceof Array) {
        // array means a Union. Use the names and call recursively
        return `Type.Union([${type.map((t) => convertType(t, buffer, dependencies, records)).join(", ")}])`;
    } else if (isRecordType(type)) {
        //} type)) {
        // record, use the name and add to the buffer
        return convertRecord(type, buffer, dependencies, records);
    } else if (isArrayType(type)) {
        // array, call recursively for the array element type
        return `Type.Array(${convertType(type.items, buffer, dependencies, records)})` ;
    } else if (isMapType(type)) {
        // Dictionary of types, string as key
        return `Type.Dict(${convertType(type.values, buffer, dependencies, records)})`;
    } else if (isEnumType(type)) {
        // array, call recursively for the array element type
        return `Type.Enum(${convertEnum(type, buffer)})`;
    } else if (isLogicalType(type)) {
        return convertType(type.type, buffer, dependencies, records);
    } else {
        console.error("Cannot work out type", type);
        return "UNKNOWN";
    }
}

export function convertFieldDec(field: Field, buffer: string[], dependencies: string[], records: string[]): string {
    // Union Type
    //return `\t${field.name}${isOptional(field.type) ? "?" : ""}: ${convertType(field.type, buffer)};`;
    return `\t${field.name}: ${isOptional(field.type) ? `Type.Optional(${convertType(field.type, buffer, dependencies, records)})` : convertType(field.type, buffer, dependencies, records)},`;
  }
