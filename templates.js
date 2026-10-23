/* "Select a template" popup: built-in templates + the user's saved templates ("Your templates"). */
(function () {
  const STORE = 'htmlqr-templates';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Free photos from Wikimedia Commons (public domain / openly licensed)
  const IMG = {
    company: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/%E2%80%9C%E4%BA%A4%E6%98%93%E5%BB%A3%E5%A0%B4_Exchange_Square%E2%80%9D_%E9%A6%99%E6%B8%AF%E4%B8%AD%E7%92%B0%E9%87%91%E8%9E%8D%E5%BB%BA%E7%AF%89%E4%B9%8B%E5%BD%A2_Hong_Kong_Central_Financial_Architecture_Forms_SML.20130326.7D.36611.BW_%288609002451%29.jpg/960px-%E2%80%9C%E4%BA%A4%E6%98%93%E5%BB%A3%E5%A0%B4_Exchange_Square%E2%80%9D_%E9%A6%99%E6%B8%AF%E4%B8%AD%E7%92%B0%E9%87%91%E8%9E%8D%E5%BB%BA%E7%AF%89%E4%B9%8B%E5%BD%A2_Hong_Kong_Central_Financial_Architecture_Forms_SML.20130326.7D.36611.BW_%288609002451%29.jpg',
    museum: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Monet_pots_of_tulips_w958.jpg/960px-Monet_pots_of_tulips_w958.jpg',
    tourism: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Louvre_Pyramid_at_night_from_the_northwest_%28Unsplash%29.jpg/960px-Louvre_Pyramid_at_night_from_the_northwest_%28Unsplash%29.jpg',
    sofa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Stylish_living_room_features_a_comfortable_gray_sofa_and_wooden_paneling_under_a_high_ceiling.jpg/960px-Stylish_living_room_features_a_comfortable_gray_sofa_and_wooden_paneling_under_a_high_ceiling.jpg',
    gift: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Open_Pink_Gifft_Box_with_White_Ribbon.JPG/960px-Open_Pink_Gifft_Box_with_White_Ribbon.JPG'
  };

  // Shared classic, easy-to-read styling: large body text, serif headings, strong contrast.
  const S = {
    page: "font-family:'Open Sans',Arial,sans-serif;font-size:18px;line-height:1.7;color:#222;max-width:720px;margin:0 auto;background:#fff",
    pad: 'padding:24px 20px',
    h1: "font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.25;color:#1f3a5f;margin:0 0 12px;font-weight:700",
    h2: "font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#1f3a5f;margin:30px 0 10px;font-weight:700;border-bottom:2px solid #e6e1d6;padding-bottom:6px",
    p: 'margin:0 0 14px',
    img: 'display:block;width:100%;height:auto;border-radius:6px',
    table: 'width:100%;border-collapse:collapse;margin:6px 0 16px;font-size:17px',
    th: 'text-align:left;padding:10px 12px;border:1px solid #ddd;background:#f6f4ee;width:38%;font-weight:600',
    td: 'padding:10px 12px;border:1px solid #ddd',
    btn: 'display:inline-block;background:#1f3a5f;color:#fff;font-size:18px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none'
  };
  const rows = list => `<table style="${S.table}"><tbody>${list.map(([k, v]) => `<tr><th style="${S.th}">${k}</th><td style="${S.td}">${v}</td></tr>`).join('')}</tbody></table>`;

  const BUILT_IN = [
    {
      id: 'company', name: 'Company profile', title: 'Company Profile',
      html: `<div style="${S.page}">
<div style="text-align:center;padding:22px 20px 14px"><span style="display:inline-block;background:#111;color:#fff;font-weight:700;letter-spacing:3px;font-size:14px;padding:9px 20px;border-radius:24px">YOUR LOGO</span></div>
<img src="${IMG.company}" alt="Company building" style="${S.img};border-radius:0;height:280px;object-fit:cover">
<div style="${S.pad}">
<h1 style="${S.h1}">Company Profile</h1>
<p style="${S.p};font-size:20px;color:#444">We are an established company that has served our customers with care, honesty and quality since 1995.</p>
<h2 style="${S.h2}">Who we are</h2>
<p style="${S.p}">Our team of 40 experienced people works closely with every client. We listen first, explain clearly, and deliver what we promise — on time.</p>
<h2 style="${S.h2}">What we do</h2>
<ul style="margin:0 0 14px;padding-left:24px"><li>Consulting and planning</li><li>Project management</li><li>Installation and maintenance</li><li>Friendly customer support</li></ul>
<h2 style="${S.h2}">Contact us</h2>
${rows([['Phone', '+1 555 0100'], ['Email', 'info@yourcompany.com'], ['Address', '123 Main Street, Your City'], ['Opening hours', 'Mon – Fri, 9:00 – 17:00']])}
<p style="text-align:center;margin:24px 0 8px"><a href="tel:+15550100" style="${S.btn}">Call us</a></p>
</div></div>`
    },
    {
      id: 'museum', name: 'Museum Art', title: 'Pots of Tulips — Art Print',
      html: `<div style="${S.page}">
<img src="${IMG.museum}" alt="Pots of Tulips painting" style="${S.img};border-radius:0;max-height:440px;object-fit:cover">
<div style="${S.pad};text-align:center">
<h1 style="${S.h1};font-size:30px;margin-bottom:4px">Pots of Tulips</h1>
<p style="margin:0 0 6px"><a href="#about" style="color:#1a6dd6;text-decoration:none">Claude Monet</a></p>
<p style="font-size:30px;font-weight:700;margin:6px 0 16px;color:#222">€195,-</p>
<a href="#" style="display:block;background:#28a745;color:#fff;font-size:20px;font-weight:700;padding:16px;border-radius:6px;text-decoration:none">Buy now</a>
</div>
<div style="${S.pad};padding-top:0">
<h2 style="${S.h2}" id="about">About this artwork</h2>
<p style="${S.p}">A museum-quality print of Monet's still life of tulips. Rich colours on heavy cotton paper, made to last for generations.</p>
${rows([['Artist', 'Claude Monet'], ['Medium', 'Giclée print on cotton paper'], ['Size', '50 × 70 cm'], ['Delivery', 'Free, 3 – 5 working days']])}
</div></div>`
    },
    {
      id: 'tourism', name: 'Tourism', title: 'The Louvre Paris',
      html: `<div style="${S.page}"><div style="${S.pad}">
<h1 style="${S.h1}">The Louvre Paris</h1>
<img src="${IMG.tourism}" alt="The Louvre pyramid at night" style="${S.img};margin:8px 0 18px">
<p style="${S.p}">The Louvre is the most-visited art museum in the world and one of the best-known landmarks of Paris. Its collection reaches from ancient Egypt to the 19th century and includes the Mona Lisa and the Venus de Milo.</p>
<p style="${S.p}">Plan at least half a day for your visit and wear comfortable shoes — the galleries are very large.</p>
<h2 style="${S.h2}">History Of The Building</h2>
<p style="${S.p}">The Louvre began as a fortress built around 1190 under King Philip II. Over the centuries it became a royal palace, and in 1793 it opened its doors as a public museum. The famous glass pyramid, designed by the architect I. M. Pei, was completed in 1989 and is now the main entrance.</p>
<h2 style="${S.h2}">Visitor information</h2>
${rows([['Opening hours', 'Wed – Mon, 9:00 – 18:00 (closed Tuesday)'], ['Address', 'Rue de Rivoli, 75001 Paris'], ['Tickets', 'Book online in advance to avoid queues']])}
</div></div>`
    },
    {
      id: 'instructions', name: 'Instructions', title: 'How to Assemble a Sofa Yourself',
      html: `<div style="${S.page}"><div style="${S.pad}">
<h1 style="${S.h1}">How to Assemble a Sofa Yourself</h1>
<p style="${S.p};font-size:20px;color:#444">Assembling a sofa at home can save money and make moving the piece a lighter task.</p>
<img src="${IMG.sofa}" alt="A finished grey sofa" style="${S.img};margin:8px 0 6px">
<h2 style="${S.h2}">What you need</h2>
<ul style="margin:0 0 14px;padding-left:24px"><li>All parts and screws from the box</li><li>A screwdriver or Allen key (often included)</li><li>A soft blanket to protect the floor</li><li>30 – 60 minutes, and a helper if possible</li></ul>
<h2 style="${S.h2}">Step by step</h2>
<ol style="margin:0 0 18px;padding-left:26px">
<li style="margin-bottom:10px"><b>Unpack and check.</b> Lay all parts on the blanket and compare them with the parts list.</li>
<li style="margin-bottom:10px"><b>Attach the legs.</b> Turn the base upside down and screw each leg in by hand.</li>
<li style="margin-bottom:10px"><b>Fix the backrest.</b> Slide it into the brackets on the base and add the screws loosely.</li>
<li style="margin-bottom:10px"><b>Add the armrests.</b> Line up the holes, insert the bolts, then tighten every screw.</li>
<li style="margin-bottom:10px"><b>Place the cushions.</b> Put the seat and back cushions in place, and enjoy.</li>
</ol>
<div style="background:#fff8e1;border-left:6px solid #e0a800;padding:16px 18px;border-radius:4px"><b>Tip:</b> Do not fully tighten any screw until all parts are in place. This makes lining everything up much easier.</div>
</div></div>`
    },
    {
      id: 'coupon', name: 'Coupon', title: 'A Sweet Little Gift for You',
      html: `<div style="${S.page};text-align:center"><div style="${S.pad}">
<div style="font-family:Georgia,serif;font-size:36px;letter-spacing:4px;color:#111;line-height:1.1"><b>YOUR</b>LOGO</div>
<div style="font-size:12px;letter-spacing:5px;color:#666;margin-bottom:22px">TAGLINE GOES HERE</div>
<h1 style="${S.h1};color:#222">A Sweet Little Gift for You</h1>
<p style="${S.p};font-size:20px">Get 20% off just by stopping by our store this holiday season!</p>
<img src="${IMG.gift}" alt="A gift box with a ribbon" style="${S.img};margin:10px 0 20px">
<div style="border:3px dashed #b03a2e;border-radius:10px;padding:20px;margin:0 auto 18px;max-width:440px;background:#fffaf5">
<div style="font-size:15px;color:#555;text-transform:uppercase;letter-spacing:2px">Your coupon code</div>
<div style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;color:#b03a2e;letter-spacing:5px;margin:4px 0">GIFT20</div>
<div style="font-size:16px;color:#555">Valid until 31 December 2026</div>
</div>
<p style="${S.p};font-size:16px;color:#555">Show this page at the checkout. One coupon per customer.<br>Cannot be combined with other offers.</p>
<p style="margin:18px 0 6px"><a href="tel:+15550100" style="${S.btn};background:#b03a2e">Call the store</a></p>
</div></div>`
    }
  ];

  const mine = () => { try { return JSON.parse(ls.get(STORE)) || []; } catch (e) { return []; } };

  $('head').append(`<style>
    .tpl-dialog { max-width:820px; }
    .tpl-content { border:none; border-radius:4px; padding:14px 18px 22px; position:relative; font-family:Poppins,sans-serif; }
    .tpl-close { position:absolute; top:-6px; right:-2px; background:none; border:none; color:#999; font-size:22px; line-height:1; padding:4px; cursor:pointer; }
    .tpl-close:hover { color:#555; }
    .tpl-title { text-align:center; font-size:30px; font-weight:400; color:#2b2b2b; margin:0 0 14px; }
    .tpl-h { font-size:20px; font-weight:400; color:#2b2b2b; margin:4px 0 12px; }
    .tpl-row { display:flex; gap:20px; overflow-x:auto; padding:2px 2px 14px; margin-bottom:12px; }
    .tpl-card { flex:none; width:180px; background:#fff; box-shadow:0 1px 5px rgba(0,0,0,.25); display:flex; flex-direction:column; align-items:center; padding:8px 0 10px; position:relative; }
    .tpl-name { font-size:17px; color:#2b2b2b; margin-bottom:6px; max-width:164px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tpl-thumb { width:160px; height:150px; overflow:hidden; position:relative; margin-bottom:8px; background:#fff; }
    .tpl-thumb iframe { width:640px; height:600px; border:0; transform:scale(.25); transform-origin:0 0; pointer-events:none; }
    .tpl-select { background:#3a8ee6; color:#fff; border:none; border-radius:3px; padding:4px 13px; font-size:15px; }
    .tpl-select:hover { background:#2b7bd0; }
    .tpl-del { position:absolute; top:4px; right:6px; background:none; border:none; color:#bbb; font-size:15px; padding:2px 4px; }
    .tpl-del:hover { color:#d33; }
    .tpl-del + .tpl-name { max-width:130px; }
    .tpl-empty { width:100%; text-align:center; font-size:15px; color:#333; padding:6px; box-shadow:0 1px 5px rgba(0,0,0,.15); }
  </style>`);

  $('body').append(`
  <div class="modal fade" id="tplModal" tabindex="-1" aria-label="Select a template"><div class="modal-dialog modal-dialog-centered tpl-dialog"><div class="modal-content tpl-content">
    <button type="button" class="tpl-close" data-dismiss="modal" aria-label="Close">&#10006;</button>
    <h2 class="tpl-title">Select a template</h2>
    <h3 class="tpl-h">More popular</h3>
    <div class="tpl-row" id="tplPopular"></div>
    <h3 class="tpl-h">Your templates</h3>
    <div class="tpl-row" id="tplMine"></div>
  </div></div></div>

  <div class="modal fade" id="tplSaveModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">Save as template</h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
    <div class="modal-body">
      <label class="t" for="tplSaveName">Template name</label>
      <input id="tplSaveName" class="form-control" maxlength="60">
      <small class="text-muted">It will appear under "Your templates" when you click Template.</small>
      <div id="tplSaveErr" class="text-danger mt-2" style="font-size:13px"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-light" data-dismiss="modal">Cancel</button><button class="btn-prev" id="tplSaveGo"><i class="far fa-save"></i> Save</button></div>
  </div></div></div>`);

  const card = (t, k, own) => `<div class="tpl-card">
    ${own ? `<button class="tpl-del" data-k="${k}" title="Delete this template"><i class="far fa-trash-alt"></i></button>` : ''}
    <div class="tpl-name" title="${esc(t.name)}">${esc(t.name)}</div>
    <div class="tpl-thumb"><iframe loading="lazy" tabindex="-1" scrolling="no" sandbox="" title="${esc(t.name)} preview"></iframe></div>
    <button class="tpl-select" data-k="${k}" data-own="${own ? 1 : ''}">Select</button></div>`;

  function fill($row, list, own) {
    $row.html(list.length ? list.map((t, k) => card(t, k, own)).join('') : '<div class="tpl-empty">no there is data</div>');
    // srcdoc is set after insert so the HTML never has to be escaped into an attribute
    $row.find('iframe').each((k, f) => { f.srcdoc = docFor(list[k].html, list[k].name); });
  }

  function open() {
    fill($('#tplPopular'), BUILT_IN, false);
    fill($('#tplMine'), mine(), true);
    $('#tplModal').modal('show');
  }

  function use(t) {
    if (!isEmpty() && getHTML() !== t.html && !confirm('Replace your current page with this template?')) return;
    const $e = $('#editor');
    if ($e.summernote('codeview.isActivated')) $e.summernote('codeview.deactivate');
    $e.summernote('code', t.html);
    if (t.ai) HTMLQR_AI.load(t.ai); else HTMLQR_AI.clear();
    if (t.title && (!$('#title').val().trim() || $('#title').data('auto') || t.own)) $('#title').val(t.title).data('auto', !t.own);
    refresh();
    $('#tplModal').modal('hide');
  }

  $('#tplPopular').on('click', '.tpl-select', function () { use(BUILT_IN[+this.dataset.k]); });
  $('#tplMine')
    .on('click', '.tpl-select', function () { const t = mine()[+this.dataset.k]; if (t) use({ ...t, own: true }); })
    .on('click', '.tpl-del', function () {
      const list = mine(), t = list[+this.dataset.k];
      if (!t || !confirm(`Delete the template "${t.name}"?`)) return;
      list.splice(+this.dataset.k, 1); ls.set(STORE, JSON.stringify(list)); fill($('#tplMine'), list, true);
    });

  function openSave() {
    if (isEmpty()) return alert('Your page is empty. Add some content first.');
    $('#tplSaveName').val($('#title').val().trim() || 'My template');
    $('#tplSaveErr').text('');
    $('#tplSaveModal').modal('show');
  }
  $('#tplSaveModal').on('shown.bs.modal', () => $('#tplSaveName').trigger('select'));
  $('#tplSaveName').on('keydown', e => { if (e.key === 'Enter') $('#tplSaveGo').click(); });
  $('#tplSaveGo').on('click', () => {
    const name = $('#tplSaveName').val().trim();
    if (!name) return $('#tplSaveErr').text('Please enter a name.');
    const t = { name, title: $('#title').val().trim(), html: getHTML(), ai: HTMLQR_AI.snapshot(), saved: Date.now() };
    const list = mine().filter(x => x.name !== name); // same name = overwrite
    list.unshift(t);
    if (!ls.set(STORE, JSON.stringify(list))) return $('#tplSaveErr').text('Not enough browser storage. Try smaller uploaded photos, or delete an old template.');
    ls.set('htmlqr-draft', JSON.stringify({ title: t.title, html: t.html }));
    $('#tplSaveModal').modal('hide');
  });

  window.HTMLQR_TPL = {
    // keeps the dropdown-toggle class only for the caret look; it opens the popup instead of a menu
    button: c => c.ui.button({ className: 'dropdown-toggle btn-template', contents: 'Template', click: open }).render(),
    saveButton: c => c.ui.button({ contents: '<i class="far fa-save"></i>', tooltip: 'Save as template', click: openSave }).render()
  };
})();
