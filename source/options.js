class Options {
    constructor(options) {
        let result = Object.assign({}, options);
        result.name = result.name || "index.js";
        result.type = result.type || "esm";
        return Object.assign(this, result);
    }
}

export default Options;