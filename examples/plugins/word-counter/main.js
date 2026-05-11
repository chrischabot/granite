/* Granite sample plugin: word counter.
 *
 * Adds a single command, "Word counter: count words across vault", that scans
 * every markdown file in the vault and reports the total word count. The
 * commandRegistry returns an unregister function which we capture in
 * `disposers` so onUnload removes everything we added.
 */
const disposers = [];

module.exports = {
  onLoad: async (api) => {
    api.log("Word counter: loaded");

    const dispose = api.commands.register({
      id: "word-counter:count-vault",
      category: "Word counter",
      name: "Count words across vault",
      callback: async () => {
        const files = await api.vault.listMarkdown();
        let total = 0;
        for (const f of files) {
          try {
            const text = await api.vault.read(f.path);
            const matches = text.match(/[A-Za-z0-9]+/g) ?? [];
            total += matches.length;
          } catch {
            /* skip unreadable files */
          }
        }
        api.notice.show(
          `Vault contains ${total.toLocaleString()} words across ${files.length} file${files.length === 1 ? "" : "s"}.`,
          { kind: "success", timeoutMs: 6000 }
        );
      },
    });
    disposers.push(dispose);
  },

  onUnload: (api) => {
    api.log("Word counter: unloading");
    for (const d of disposers.splice(0)) d();
  },
};