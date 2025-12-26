$(function () {
    let resultMap = {};
    let isOpening = false;

    const titanFont = `'Titan One', cursive`;

    // Load Titan One
    $('head').append(
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Titan+One&display=swap">`
    );

    /* ===============================
       TOP OPENED / TOTAL BAR
    =============================== */
    const counterBar = $(`
        <div id="packCounterBar" style="
            position:fixed;
            top:0;
            left:50%;
            transform:translateX(-50%);
            background:#111;
            color:white;
            padding:8px 20px;
            border-radius:0 0 14px 14px;
            font-family:${titanFont};
            font-size:16px;
            z-index:3000;
            display:none;
            box-shadow:0 4px 10px rgba(0,0,0,0.4);
        ">0/0</div>
    `);
    $('body').append(counterBar);

    /* ===============================
       RESULT PANEL
    =============================== */
    const resultPanel = $(`
        <section id="blookTally" style="
            display:none;
            position:fixed;
            top:95px;
            bottom:0;
            right:-140px;
            width:500px;
            overflow-y:auto;
            background:#222;
            color:#fff;
            padding:10px;
            border:2px solid #888;
            border-radius:10px;
            z-index:2000;
            transition:right .3s ease;
            font-family:${titanFont};
        "></section>
    `);
    $('body').append(resultPanel);

    function appendBlookResult(name) {
        const info = blacket.blooks[name] || {};
        const rarity = info.rarity || "Unknown";
        const img = info.image || "/content/blooks/Error.webp";
        const color = blacket.rarities[rarity]?.color || "#fff";

        if (!resultMap[name]) {
            const el = $(`
                <div data-rarity="${rarity}" style="display:flex;align-items:center;margin:8px 0;">
                    <img src="${img}" style="width:24px;height:24px;margin-right:10px;">
                    <span style="color:${color};font-weight:bold;">
                        ${name} (<span class="count">1</span>)
                    </span>
                </div>
            `);
            resultMap[name] = { count: 1, rarity, el };
        } else {
            resultMap[name].count++;
            resultMap[name].el.find(".count").text(resultMap[name].count);
        }

        sortResults();
    }

    function sortResults() {
        const order = Object.keys(blacket.rarities);
        const list = Object.values(resultMap).sort(
            (a, b) =>
                (order.indexOf(a.rarity) ?? 999) -
                (order.indexOf(b.rarity) ?? 999)
        );

        resultPanel.children().not(".summary,.repeat").remove();
        list.forEach(x => resultPanel.append(x.el));
    }

    function finishSummary(opened) {
        const summary = $(`<div class="summary" style="margin-top:10px;font-weight:bold;">${opened} packs opened</div>`);
        const repeat = $(`<button class="repeat" style="margin-top:10px;padding:8px 14px;background:#444;color:white;border:none;border-radius:6px;font-family:${titanFont};">Open More</button>`);

        repeat.on("click", () => {
            $("#packModal").fadeIn();
            resultPanel.hide().css("right", "-140px");
        });

        resultPanel.append(summary, repeat);
    }

    async function beginOpening(pack, total, cost) {
        if (isOpening) return;
        isOpening = true;
        resultMap = {};

        resultPanel.empty().show().css("right", "-140px");

        let opened = 0;
        counterBar.text(`0/${total}`).fadeIn();

        const original = blacket.openPack;
        blacket.openPack = p =>
            new Promise(resolve => {
                blacket.startLoading();
                blacket.requests.post("/worker3/open", { pack: p }, res => {
                    blacket.stopLoading();
                    if (res?.error) return resolve(null);
                    blacket.user.tokens -= cost;
                    $("#tokenBalance > div:nth-child(2)").text(blacket.user.tokens.toLocaleString());
                    blacket.user.blooks[res.blook] = (blacket.user.blooks[res.blook] || 0) + 1;
                    resolve(res.blook);
                });
            });

        for (let i = 0; i < total; i++) {
            if (blacket.user.tokens < cost) break;

            const blook = await blacket.openPack(pack);
            if (blook) {
                appendBlookResult(blook);
                await new Promise(r =>
                    setTimeout(r, blacket.rarities[blacket.blooks[blook]?.rarity]?.wait ?? 50)
                );
            }

            opened++;
            counterBar.text(`${opened}/${total}`);
        }

        blacket.openPack = original;
        finishSummary(opened);
        isOpening = false;

        setTimeout(() => counterBar.fadeOut(), 1200);
    }

    /* ===============================
       UI CONTROLS
    =============================== */
    const packs = Object.keys(blacket.packs).filter(p => !blacket.packs[p].hidden);
    const packSelect = $(`<select style="margin:10px;padding:8px;border-radius:8px;background:#444;color:white;font-family:${titanFont};"></select>`);
    packs.forEach(p => packSelect.append(`<option value="${p}">${p}</option>`));

    const modeSwitch = $(`
        <div style="margin:10px;font-family:${titanFont};">
            <label><input type="radio" name="mode" value="packs" checked> Packs</label>
            <label style="margin-left:20px;"><input type="radio" name="mode" value="tokens"> Tokens</label>
        </div>
    `);

    const amountInput = $(`<input type="number" min="1" value="1" style="margin:10px;width:140px;padding:8px;border-radius:8px;font-family:${titanFont};">`);
    const openBtn = $(`<button style="margin:10px;padding:10px 18px;background:#008cba;color:white;border:none;border-radius:8px;font-family:${titanFont};">Open</button>`);

    const modal = $(`<div id="packModal" style="
        position:fixed;
        top:50px;
        left:50%;
        transform:translateX(-50%);
        background:#333;
        padding:60px;
        border-radius:16px;
        z-index:1001;
        display:none;
        text-align:center;
        color:white;
        font-family:${titanFont};
    "></div>`);

    modal.append(packSelect, modeSwitch, amountInput, openBtn);

    const trigger = $(`<button style="
        position:fixed;
        top:60px;
        right:20px;
        padding:12px 24px;
        border-radius:12px;
        background:#00aaff;
        color:white;
        border:none;
        font-family:${titanFont};
    ">Open Packs</button>`);

    trigger.on("click", () => {
        modal.fadeIn();
        trigger.remove();
    });

    openBtn.on("click", () => {
        const pack = packSelect.val();
        const mode = $("input[name='mode']:checked").val();
        let amount = parseInt(amountInput.val(), 10);
        const price = blacket.packs[pack].price;

        if (mode === "tokens") amount = Math.floor(amount / price);
        amount = Math.min(amount, Math.floor(blacket.user.tokens / price));

        if (amount <= 0) return alert("Not enough tokens.");

        modal.fadeOut();
        beginOpening(pack, amount, price);
    });

    $("body").append(trigger, modal);
});
