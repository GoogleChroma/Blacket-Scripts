$(function () {
    let resultMap = {};
    let isOpening = false;

    const titanFont = `'Titan One', cursive`;

    // Load Titan One font
    const fontLink = $('<link href="https://fonts.googleapis.com/css2?family=Titan+One&display=swap" rel="stylesheet">');
    $('head').append(fontLink);

    // Result Panel (further off-screen)
    const resultPanel = $(`
        <section id="blookTally" style="display:none;position:fixed;top:95px;bottom:0;right:-140px;width:500px;overflow-y:auto;background:#222;color:#fff;padding:10px;border:2px solid #888;border-radius:10px;z-index:2000;transition:right 0.3s ease;font-family:${titanFont};"></section>
    `);
    $('body').append(resultPanel);

    function appendBlookResult(name) {
        const info = blacket.blooks[name] || {};
        const img = info.image || '/content/blooks/Error.webp';
        const rarity = info.rarity || 'Unknown';
        const color = blacket.rarities[rarity]?.color || '#fff';

        if (!resultMap[name]) {
            const item = $(`
                <div id="entry-${name.replace(/\s+/g, '_')}" data-rarity="${rarity}" style="display:flex;align-items:center;margin:10px 0;">
                    <img src="${img}" alt="${name}" style="width:24px;height:24px;object-fit:contain;margin-right:10px;">
                    <span style="color:${color};font-weight:bold;font-size:1.1em;font-family:${titanFont};">${name} (<span class="blook-count">1</span>)</span>
                </div>
            `);
            resultMap[name] = { count: 1, rarity, element: item };
        } else {
            resultMap[name].count++;
            resultMap[name].element.find('.blook-count').text(resultMap[name].count);
        }

        sortResultsByRarity();
    }

    function sortResultsByRarity() {
        const panel = $('#blookTally');
        const entries = Object.values(resultMap);

        const rarityOrder = Object.keys(blacket.rarities);
        entries.sort((a, b) => {
            const aIndex = rarityOrder.indexOf(a.rarity) === -1 ? 999 : rarityOrder.indexOf(a.rarity);
            const bIndex = rarityOrder.indexOf(b.rarity) === -1 ? 999 : rarityOrder.indexOf(b.rarity);
            return aIndex - bIndex;
        });

        panel.children().not('.summary, .repeat-btn').remove();
        for (const entry of entries) {
            panel.append(entry.element);
        }
    }

    function displaySummary(log, total) {
        $('#blookTally').find('.summary, .repeat-btn').remove();

        const summary = $(`<div class="summary" style="margin-top:12px;font-size:1.1em;font-weight:bold;font-family:${titanFont};">${total} packs opened.</div>`);
        const repeatBtn = $(`<button class="repeat-btn" style="margin-top:10px;padding:10px 16px;font-size:1em;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:${titanFont};">Open More</button>`);
        repeatBtn.on('click', () => {
            $('#packModal').fadeIn();
            resultPanel.css('right', '-140px').hide();
        });

        $('#blookTally').append(summary, repeatBtn);
    }

    async function beginOpening(pack, count, cost) {
        if (isOpening) return;
        isOpening = true;
        resultMap = {};

        $('#blookTally').empty().show();
        resultPanel.css('right', '-140px');

        const log = {};
        const originalOpenPack = blacket.openPack;
        let opened = 0;

        blacket.openPack = (p) => new Promise(resolve => {
            blacket.startLoading();
            blacket.requests.post("/worker3/open", { pack: p }, (resp) => {
                blacket.stopLoading();
                if (resp.error) {
                    blacket.createToast({
                        title: "Error",
                        message: resp.reason,
                        icon: "/content/blooks/Error.webp",
                        time: 5000
                    });
                    return resolve(null);
                }
                blacket.user.tokens -= blacket.packs[p].price;
                $("#tokenBalance > div:nth-child(2)").text(blacket.user.tokens.toLocaleString());
                blacket.user.blooks[resp.blook] = (blacket.user.blooks[resp.blook] || 0) + 1;
                resolve(resp.blook);
            });
        });

        for (let i = 0; i < count; i++) {
            if (blacket.user.tokens < cost) break;

            const result = await blacket.openPack(pack);
            if (result) {
                log[result] = (log[result] || 0) + 1;
                appendBlookResult(result);
                const delay = blacket.rarities[blacket.blooks[result]?.rarity]?.wait ?? 50;
                await new Promise(r => setTimeout(r, delay));
            }

            opened++;
        }

        blacket.openPack = originalOpenPack;
        displaySummary(log, opened);
        isOpening = false;
    }

    const packs = Object.keys(blacket?.packs || {}).filter(p => !blacket.packs[p].hidden);
    const dropdown = $(`<select id="packDropdown" style="margin:10px;font-size:1.2vw;padding:8px;border-radius:8px;background:#444;color:white;border:1px solid #888;font-family:${titanFont};"></select>`);
    packs.forEach(name => dropdown.append(`<option value="${name}">${name}</option>`));

    const switchMode = $(`
        <div style="margin:10px;font-size:1.2vw;font-family:${titanFont};">
            <label><input type="radio" name="mode" value="packs" checked> Packs</label>
            <label style="margin-left:20px;"><input type="radio" name="mode" value="tokens"> Tokens</label>
        </div>
    `);

    const qtyInput = $(`<input type="number" value="1" min="1" placeholder="Amount" style="margin:10px;width:140px;font-size:1.2vw;padding:8px;border-radius:8px;font-family:${titanFont};" />`);
    const confirmBtn = $(`<button style="margin:10px;font-size:1.2vw;padding:8px 16px;border-radius:8px;background:#008cba;color:white;border:none;font-family:${titanFont};">Open</button>`);

    const dialog = $(`<div id="packModal" style="position:fixed;top:50px;left:50%;transform:translateX(-50%);background:#333;padding:70px;border-radius:16px;z-index:1001;text-align:center;display:none;color:#fff;font-family:${titanFont};"></div>`);
    dialog.append(dropdown, switchMode, qtyInput, confirmBtn);

    const trigger = $(`
        <button id="openBtn" style="
            position:fixed;
            top:60px;
            right:20px;
            padding:12px 24px;
            font-size:1rem;
            z-index:1000;
            background:linear-gradient(135deg, #0077cc, #00aaff);
            color:white;
            border:none;
            border-radius:12px;
            cursor:pointer;
            box-shadow:0 4px 12px rgba(0,0,0,0.2);
            transition:transform 0.2s ease;
            font-family:${titanFont};
        ">Open Packs</button>
    `);

    trigger.on('mouseenter', () => trigger.css('transform', 'scale(1.05)'));
    trigger.on('mouseleave', () => trigger.css('transform', 'scale(1)'));

    trigger.on('click', () => {
        $('#packModal').fadeIn();
        trigger.remove();
    });

    confirmBtn.on('click', () => {
        if (isOpening) return;
        const pack = $('#packDropdown').val();
        const method = $('input[name="mode"]:checked').val();
        let amount = parseInt(qtyInput.val(), 10);

        if (!pack || !blacket.packs[pack]) return alert("Choose a valid pack.");
        if (!amount || amount <= 0) return alert("Enter a positive amount.");

        const price = blacket.packs[pack].price;
        if (method === 'tokens') {
            amount = Math.floor(amount / price);
            if (amount === 0) return alert("Not enough tokens for one pack.");
        }

        amount = Math.min(amount, Math.floor(blacket.user.tokens / price));
        if (amount === 0) return alert("Insufficient tokens.");

        $('#packModal').fadeOut();
        beginOpening(pack, amount, price);
    });

    $('body').append(trigger, dialog);
});
