const snakeToCamelCase = (name, suffix) => {
    const result = name.replace(/(?:^|_)([a-z])/g, (_, g) => g.toUpperCase());
    return result.replace(/_/g, '') + (suffix || '');
};

module.exports = {
    snakeToCamelCase,
};
