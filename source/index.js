import Options from "./options.js";
import Exporter from "./exporter.js";

export default function (options) {
    let opts = new Options(options);
    let exporter = new Exporter(opts);

    exporter.addDirectorys(this.directory);
    exporter.addDirectorys((this.filtered && this.filtered.length) ? this.filtered : this.files);
    
    exporter.addEventListener("done", () => {
        this.events.dispatch("default");
    })
    return exporter;
}