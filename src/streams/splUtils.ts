const BIN = 'bin';
const DATA = 'data';
const DOC = 'doc';
const ETC = 'etc';
const IMPL = 'impl';
const INCLUDE = 'include';
const LIB = 'lib';
const LICENSE = 'license';
const OPT = 'opt';
const OUTPUT = 'output';
const SAMPLES = 'samples';
const STREAMS = 'streams';

const NAMESPACE_SEP = '.';
const SPACE = ' ';

const ID_ERR_1 = 'SPL identifier cannot be null.';
const ID_ERR_2 = 'SPL identifier cannot be blank.';
const ID_ERR_3 = (id: string): string => `"${id}" is a reserved keyword.`;
const ID_ERR_4 = (id: string): string => `${id} is not a valid SPL identifier.`;

const NAMESPACE_ERR_1 = 'Namespace cannot be null.';
const NAMESPACE_ERR_2 = 'Namespace cannot begin or end with a period.';
const NAMESPACE_ERR_3 = 'Namespace cannot have an empty segment.';
const NAMESPACE_ERR_4 = `Namespace "${STREAMS}" is reserved and cannot be used as a top-level namespace.`;
const NAMESPACE_ERR_5 = (segment: string): string => `Namespace segment "${segment}" cannot begin or end with a space.`;
const NAMESPACE_ERR_6 = (error: string): string => `Namespace segment ${error}`;

const ReservedKeywordsNamespace = [STREAMS];
const ReservedKeywords = [
    // SPL reserved words
    'as', 'attribute', 'blob', 'boolean', 'break', 'complex128', 'complex32',
    'complex64', 'composite', 'config', 'continue', 'decimal128', 'decimal32', 'decimal64',
    'else', 'enum', 'expression', 'false', 'float128', 'float32', 'float64',
    'for', 'function', 'graph', 'if', 'in', 'input', 'int16',
    'int32', 'int64', 'int8', 'list', 'logic', 'map', 'matrix',
    'mutable', 'namespace', 'onPunct', 'onTuple', 'operator', 'output', 'param',
    'public', 'return', 'rstring', 'set', 'stateful', 'static', 'stream',
    'timestamp', 'true', 'tuple', 'type', 'uint16', 'uint32', 'uint64',
    'uint8', 'use', 'ustring', 'var', 'void', 'while', 'window', 'xml',
    // C++ reserved words
    'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor', 'bool',
    'case', 'catch', 'char', 'class', 'compl', 'const', 'const_cast',
    'default', 'delete', 'do', 'double', 'dynamic_cast', 'enum', 'explicit',
    'export', 'extern', 'float', 'friend', 'goto', 'inline', 'int',
    'long', 'namespace', 'new', 'not', 'not_eq', 'operator', 'or',
    'or_eq', 'private', 'protected', 'public', 'register', 'reinterpret_cast', 'short',
    'signed', 'sizeof', 'static', 'static_cast', 'struct', 'switch', 'template',
    'this', 'throw', 'try', 'typedef', 'typeid', 'typename', 'union',
    'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while',
    'xor', 'xor_eq',
    // Directories
    BIN, DATA, DOC, ETC, IMPL, INCLUDE, LIB, LICENSE, OPT, OUTPUT, SAMPLES
];

/**
 * Determines if a given identifier is valid.
 *
 * The SPL language specification defines the following:
 * > Identifiers start with an ASCII letter or underscore, followed by ASCII letters, digits, or underscores.
 *
 * The reserved names are as follows:
 * - Stream attribute names cannot contain C++ keywords.
 * - Operator names cannot contain C++ keywords.
 *
 * For more information, see [Lexical syntax](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.splangref.doc/doc/lexicalsyntax.html)
 * and [Reserved names](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/reservednames.html).
 * @param id    The SPL identifier
 */
const isValidIdentifier = (id: string): boolean | string => {
    if (id === null) {
        return ID_ERR_1;
    }

    id = id.trim();

    if (!id.length) {
        return ID_ERR_2;
    }

    if (ReservedKeywords.includes(id)) {
        return ID_ERR_3(id);
    }

    const isLowercaseLetter = (char: string): boolean => char >= 'a' && char <= 'z';
    const isUppercaseLetter = (char: string): boolean => char >= 'A' && char <= 'Z';
    const isDigit = (char: string): boolean => char >= '0' && char <= '9';
    const isUnderscore = (char: string): boolean => char === '_';

    const first = id[0];
    if (!isLowercaseLetter(first) && !isUppercaseLetter(first) && !isUnderscore(first)) {
        return ID_ERR_4(id);
    }

    const rest = id.substr(1).split('');
    const hasInvalidChar = rest.some((char: string) => !isLowercaseLetter(char) && !isUppercaseLetter(char) && !isDigit(char) && !isUnderscore(char));
    if (hasInvalidChar) {
        return ID_ERR_4(id);
    }

    return true;
};

/**
 * Determines if a given namespace is valid.
 *
 * The reserved names are as follows:
 * - Namespace components cannot contain C++ keywords.
 * - The name `streams` is reserved and cannot be used as a top-level namespace.
 *
 * For more information, see [Lexical syntax](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.splangref.doc/doc/lexicalsyntax.html)
 * and [Reserved names](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/reservednames.html).
 * @param namespace    The SPL namespace
 */
const isValidNamespace = (namespace: string): boolean | string => {
    if (namespace == null) {
        return NAMESPACE_ERR_1;
    }

    if (namespace.startsWith(NAMESPACE_SEP) || namespace.endsWith(NAMESPACE_SEP)) {
        return NAMESPACE_ERR_2;
    }

    if (namespace.includes('..')) {
        return NAMESPACE_ERR_3;
    }

    if (ReservedKeywordsNamespace.includes(namespace)) {
        return NAMESPACE_ERR_4;
    }

    let segment: string;
    const namespaceSegments = namespace.split(NAMESPACE_SEP);
    for (let i = 0; i < namespaceSegments.length; i++) {
        segment = namespaceSegments[i];
        if (segment.startsWith(SPACE) || segment.endsWith(SPACE)) {
            return NAMESPACE_ERR_5(segment);
        }

        const result = isValidIdentifier(segment);
        if (result !== true) {
            return NAMESPACE_ERR_6(result as string);
        }
    };

    return true;
};

/**
 * Streams SPL utility functions
 */
const SplUtils = {
    isValidIdentifier,
    isValidNamespace
};

export default SplUtils;
