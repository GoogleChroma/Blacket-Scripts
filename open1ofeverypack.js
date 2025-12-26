$(function () {
    let resultMap = {};
    let isOpening = false;
    let stopLoop = false;

    const titanFont = `'Titan One', cursive`;

    const fontLink = $('<link href="https://fonts.googleapis.com/css2?family=Titan+One&display=swap" rel="stylesheet">');
    $('head').append(fontLink);

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
                <div style="display:flex;align-items:center;margin:10px 0;">
                    <img src="${img}" style="width:24px;height:24px;margin-right:10px;">
                    <span style="color:${color};font-weight:bold;font-size:1.1em;">${name} (<span class="count">1</span>)</span>
                </div>
            `);
            resultMap[name] = { count: 1, rarity, element: item };
        } else {
            resultMap[name].count++;
            resultMap[name].element.find('.count').text(resultMap[name].count);
        }

        sortResults();
    }

    function sortResults() {
        const panel = $('#blookTally');
        const entries = Object.values(resultMap);
        const rarityOrder = Object.keys(blacket.rarities);

        entries.sort((a, b) =>
            rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
        );

        panel.children().remove();
        entries.forEach(e => panel.append(e.element));
    }

    async function openPack(pack) {
        return new Promise(resolve => {
            blacket.requests.post("/worker3/open", { pack }, resp => {
                if (resp?.blook) {
                    blacket.user.tokens -= blacket.packs[pack].price;
                    $("#tokenBalance > div:nth-child(2)").text(blacket.user.tokens.toLocaleString());
                    blacket.user.blooks[resp.blook] = (blacket.user.blooks[resp.blook] || 0) + 1;
                    resolve(resp.blook);
                } else resolve(null);
            });
        });
    }

    async function startContinuousOpening() {
        if (isOpening) return;
        isOpening = true;
        stopLoop = false;
        resultMap = {};

        $('#blookTally').empty().show().css('right', '-140px');

        const packs = Object.keys(blacket.packs).filter(p => !blacket.packs[p].hidden);

        while (!stopLoop) {
            for (const pack of packs) {
                const price = blacket.packs[pack].price;
                if (blacket.user.tokens < price) {
                    isOpening = false;
                    return;
                }

                const result = await openPack(pack);
                if (result) {
                    appendBlookResult(result);
                    const delay = blacket.rarities[blacket.blooks[result]?.rarity]?.wait ?? 60;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
    }

    const startBtn = $(`
        <button style="
            position:fixed;
            top:60px;
            right:20px;
            padding:14px 26px;
            font-size:1rem;
            background:linear-gradient(135deg,#ff7a18,#ffb347);
            color:white;
            border:none;
            border-radius:14px;
            cursor:pointer;
            z-index:1000;
            font-family:${titanFont};
        ">Start All Packs Loop</button>
    `);

    startBtn.on('click', () => {
        startBtn.remove();
        startContinuousOpening();
    });

    $('body').append(startBtn);
});
