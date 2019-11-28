import path from "path";

import strip from "@rollup/plugin-strip";
import babel from 'rollup-plugin-babel';

import common from "../common";

const {
    name
} = common.manifest;

const output = [{
        name,
        format: "cjs",
        file: path.resolve(common.path.DIST, "index.js")
    },
    {
        name,
        format: "esm",
        file: path.resolve(common.path.DIST, "index.es.js")
    }
]

const plugins = [
    strip(),
    babel()
]

export default {
    input: {
        input: path.resolve(common.path.SOURCE, "index.js"),
        output,
        plugins
    },
    output
}