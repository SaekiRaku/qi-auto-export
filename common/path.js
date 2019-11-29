import path from "path";

const ROOT = path.resolve(__dirname, "../");
const SOURCE = path.resolve(ROOT, "source");
const DIST = path.resolve(ROOT, "dist");
const EXAMPLE = path.resolve(ROOT, "example");
const TEMP = path.resolve(ROOT, "test/temp");

export default {
    ROOT,
    SOURCE,
    DIST,
    EXAMPLE,
    TEMP
}