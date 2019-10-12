const snakeToCamelCase = (name, suffix) => {
    const result = name.replace(/(?:^|_)([a-z])/g, (_, g) => g.toUpperCase());
    return result.replace(/_/g, '') + (suffix || '');
};
const variableSnakeToCamelCase = (str) => str.replace(
    /([-_][a-z])/g,
    (group) => group.toUpperCase()
        .replace('-', '')
        .replace('_', '')
);

module.exports = {
    snakeToCamelCase,
    variableSnakeToCamelCase,
};
