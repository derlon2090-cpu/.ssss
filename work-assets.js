(function () {
    const cache = new Map();

    function makeBlobUrl(work) {
        const key = `${work.id || work.downloadName || work.title || "asset"}:${work.createdAt || ""}`;
        if (cache.has(key)) {
            return cache.get(key);
        }

        if (!work.svgMarkup) {
            return work.previewUrl || work.fileUrl || "";
        }

        const blob = new Blob([work.svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        cache.set(key, url);
        return url;
    }

    function resolveUrl(work) {
        return makeBlobUrl(work);
    }

    function download(work, options = {}) {
        const href = resolveUrl(work);
        const anchor = document.createElement("a");
        anchor.href = href;
        const baseName = work.downloadName || "smart-credits-result.svg";
        if (options.suffix) {
            const extensionIndex = baseName.lastIndexOf(".");
            anchor.download = extensionIndex === -1
                ? `${baseName}-${options.suffix}`
                : `${baseName.slice(0, extensionIndex)}-${options.suffix}${baseName.slice(extensionIndex)}`;
        } else {
            anchor.download = baseName;
        }
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    function preview(work) {
        const href = resolveUrl(work);
        const title = work.title || "معاينة العمل";
        const popup = window.open("", "_blank", "noopener,noreferrer");
        if (!popup) {
            window.open(href, "_blank", "noopener,noreferrer");
            return;
        }

        popup.document.title = title;
        popup.document.body.innerHTML = `
            <div style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1720;color:#fff;font-family:Segoe UI,Tahoma,sans-serif;padding:24px;">
                <div style="max-width:1100px;width:100%;display:grid;gap:18px;">
                    <h1 style="margin:0;font-size:28px;">${title}</h1>
                    <img src="${href}" alt="${title}" style="width:100%;border-radius:24px;box-shadow:0 20px 50px rgba(0,0,0,.25);background:#14213d;">
                </div>
            </div>
        `;
    }

    window.CreditsWorkAssets = {
        resolveUrl,
        download,
        preview
    };
})();
