import qiauto from "@qiqi1996/qi-auto";
import common from "../common";
import plugin from "../dist/index.js";

const auto = new qiauto({
    "exporter": {
        module: plugin,
        directory: common.path.EXAMPLE + "/directory",
        options: {
            name: "index.jsx"
        }
    }
})

console.log(auto["exporter"].once());