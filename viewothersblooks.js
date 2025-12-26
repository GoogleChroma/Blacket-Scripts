(() => {
    // Check if the current path does not start with "/blooks"
    if (!location.pathname.startsWith("/blooks")) {
        // Redirect to blacket.org/blooks
        window.location.href = "https://blacket.org/blooks";
        return;
    }

    document.getElementById("viewBlooksPopup")?.remove();

    const popup = document.createElement("div");
    popup.id = "viewBlooksPopup";
    popup.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.6);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:99999;
        font-family:Arial,sans-serif;
    `;

    popup.innerHTML = `
        <div style="
            background:#1f2937;
            padding:18px;
            border-radius:12px;
            width:300px;
            color:white;
            text-align:center;
        ">
            <h3 style="margin-top:0">View User Blooks</h3>
            <input id="viewBlooksInput" placeholder="Username"
                style="
                    width:100%;
                    padding:8px;
                    margin-bottom:10px;
                    border-radius:6px;
                    border:none;
                    outline:none;
                    background:#111827;
                    color:white;
                ">
            <button id="viewBlooksBtn"
                style="
                    width:100%;
                    padding:8px;
                    border:none;
                    border-radius:6px;
                    background:#3b82f6;
                    color:white;
                    font-weight:bold;
                    cursor:pointer;
                ">
                Load
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    const style = document.createElement("style");
    style.textContent = `
        #viewBlooksInput::placeholder { color:#9ca3af; }
    `;
    document.head.appendChild(style);

    document.getElementById("viewBlooksBtn").onclick = () => {
        const username = document.getElementById("viewBlooksInput").value.trim();
        if (!username) return;

        blacket.requests.get(`/worker2/user/${username}`, (req) => {
            console.log("Worker2 response:", req);

            if (!req || req.error || !req.user || !req.user.blooks) {
                alert("User not found");
                return;
            }

            const viewedBlooks = req.user.blooks;

            // ✅ iterate over ALL known blooks
            Object.keys(blacket.blooks).forEach((blook) => {
                const id = blook.replace(/'/g, "_").replace(/ /g, "-");
                const el = document.getElementById(id);
                if (!el) return;

                el.querySelector(".viewCount")?.remove();
                el.querySelector("i")?.remove();

                const owned = viewedBlooks[blook];
                const rarity = blacket.blooks[blook]?.rarity;
                const color = blacket.rarities[rarity]?.color || "#6b7280";

                el.firstElementChild?.classList.remove(
                    "styles__lockedBlook___3oGaX-camelCase"
                );

                if (owned) {
                    const badge = document.createElement("div");
                    badge.className = "viewCount";
                    badge.textContent = owned;
                    badge.style.cssText = `
                        position:absolute;
                        bottom:6px;
                        right:6px;
                        background:${color};
                        color:white;
                        padding:2px 6px;
                        border-radius:6px;
                        font-size:12px;
                        font-weight:700;
                    `;
                    el.appendChild(badge);
                } else {
                    const lock = document.createElement("i");
                    lock.className = "fas fa-lock styles__blookLock___3Kgua-camelCase";
                    el.appendChild(lock);
                }
            });

            popup.remove();
        });
    };
})();
