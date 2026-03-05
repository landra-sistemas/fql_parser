export class FQLError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'FQLError';
        this.code = code;
    }
}

export class UnsupportedDialectError extends FQLError {
    constructor(dialect, feature) {
        super(`Dialect '${dialect}' does not support: ${feature}`, 'UNSUPPORTED_DIALECT');
        this.name = 'UnsupportedDialectError';
        this.dialect = dialect;
        this.feature = feature;
    }
}

export class InvalidQueryError extends FQLError {
    constructor(message) {
        super(message, 'INVALID_QUERY');
        this.name = 'InvalidQueryError';
    }
}

export class InvalidIdentifierError extends FQLError {
    constructor(identifier) {
        super(`Invalid table name: ${identifier}`, 'INVALID_IDENTIFIER');
        this.name = 'InvalidIdentifierError';
        this.identifier = identifier;
    }
}

export class InvalidLogicOperatorError extends FQLError {
    constructor(logic) {
        super(`Invalid logic operator: ${logic}`, 'INVALID_LOGIC_OPERATOR');
        this.name = 'InvalidLogicOperatorError';
        this.logic = logic;
    }
}