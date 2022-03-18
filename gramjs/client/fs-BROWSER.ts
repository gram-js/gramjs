export const promises = {
    lstat: (file: string) => {
        return {
            isFile: () => {},
        };
    },
    stat: (file: string) => {
        return {
            size: 0,
        };
    },

    readFile(path: string) {
        return Buffer.alloc(0);
    },
};
