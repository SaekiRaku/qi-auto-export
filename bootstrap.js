import constructor from "./constructor";

const cmd = process.argv[2];

switch (cmd) {
    case "dev":
        constructor.dev(() => {
            for (let i in require.cache) {
                if (i.indexOf(__dirname) != -1 && /(source|dist|example)/.test(i)) {
                    delete require.cache[i]
                }
            }
            require("./example/index.js");
        });
    case "build":
        constructor.build();
        break;
}