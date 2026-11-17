/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + กรอง mood
   - order.html   : เติม items/total จาก URL + ส่งข้อมูลไป Apps Script
   - admin.html   : ดึง CSV จาก Google Sheet มาแสดงเป็นตาราง
   ========================================================================== */

var APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyQcJx99jS8oOpdRSVoXCdxg-4yERP64oF6k6OswL59fu9pXu9r054gG9yNHN31EDcz/exec';

var SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmPinTGAW-jFOFSFkp-7ARADoGcZ76nwxaz-RxQhw-qDnQrjO-ADeMmGxvZy9mDvn3GhkqXYmcVB10/pub?gid=0&single=true&output=csv';

var MOODS = ['fresh', 'sweet', 'confident', 'romance'];
var MOOD_LABELS = {
  all: 'ทั้งหมด',
  fresh: 'Fresh',
  sweet: 'Sweet',
  confident: 'Confident',
  romance: 'Romance'
};

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.getElementById('ordersTable')) initAdminPage();
});

/* ==========================================================================
   1) หน้าสินค้า (product.html)
   ========================================================================== */

function initProductPage() {
  var listEl = document.getElementById('product-list');
  var filterBar = document.getElementById('filter-bar');
  var products = [];
  var currentMood = 'all';

  // อ่าน ?mood=xxx (ถ้าไม่ถูกต้องให้ใช้ "ทั้งหมด")
  var moodParam = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
  if (MOODS.indexOf(moodParam) !== -1) currentMood = moodParam;

  buildFilterBar();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      render();
    })
    .catch(function (error) {
      console.error(error);
      listEl.textContent =
        'ไม่สามารถโหลดข้อมูลสินค้าได้ (หากเปิดไฟล์โดยตรงจากเครื่อง ให้เปิดผ่านเว็บเซิร์ฟเวอร์แทน)';
    });

  function buildFilterBar() {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    ['all'].concat(MOODS).forEach(function (mood) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter' + (mood === currentMood ? ' is-active' : '');
      btn.setAttribute('data-mood', mood);
      btn.textContent = MOOD_LABELS[mood];
      btn.addEventListener('click', function () {
        currentMood = mood;
        updateActiveButton();
        render();
      });
      filterBar.appendChild(btn);
    });
  }

  function updateActiveButton() {
    if (!filterBar) return;
    var buttons = filterBar.querySelectorAll('.filter');
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].getAttribute('data-mood') === currentMood;
      buttons[i].classList.toggle('is-active', isActive);
    }
  }

  function render() {
    listEl.innerHTML = '';
    var filtered = products.filter(function (p) {
      return currentMood === 'all' || p.mood === currentMood;
    });

    if (filtered.length === 0) {
      listEl.textContent = 'ไม่พบสินค้า';
      return;
    }

    filtered.forEach(function (p) {
      listEl.appendChild(createCard(p));
    });
  }

  function createCard(p) {
    var fullName = p.size ? p.name + ' ' + p.size : p.name;

    var card = document.createElement('article');
    card.className = 'card mood-' + p.mood;

    // รูป
    var imgWrap = document.createElement('div');
    imgWrap.className = 'card__image';
    var img = document.createElement('img');
    img.src = p.image;
    img.alt = fullName;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    // เนื้อหา
    var body = document.createElement('div');
    body.className = 'card__body';

    var moodTag = document.createElement('span');
    moodTag.className = 'mood-tag';
    var dot = document.createElement('span');
    dot.className = 'mood-dot';
    moodTag.appendChild(dot);
    moodTag.appendChild(document.createTextNode(MOOD_LABELS[p.mood] || p.mood));

    var title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = p.name;

    var meta = document.createElement('p');
    meta.className = 'card__meta';
    meta.textContent = p.size ? p.size : (p.type === 'rollon' ? 'โรลออน' : '');

    // ราคา + ปุ่มสั่งซื้อ
    var footer = document.createElement('div');
    footer.className = 'card__footer';

    var price = document.createElement('span');
    price.className = 'price';
    price.textContent = Number(p.price).toLocaleString('th-TH') + ' บาท';

    var orderParams = new URLSearchParams({ item: fullName, price: p.price });
    var btn = document.createElement('a');
    btn.className = 'btn btn--accent btn--small';
    btn.href = 'order.html?' + orderParams.toString();
    btn.textContent = 'สั่งซื้อ';

    footer.appendChild(price);
    footer.appendChild(btn);

    body.appendChild(moodTag);
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(footer);

    card.appendChild(imgWrap);
    card.appendChild(body);
    return card;
  }
}

/* ==========================================================================
   2) หน้าสั่งซื้อ (order.html)
   ========================================================================== */

function initOrderPage() {
  var form = document.getElementById('orderForm');
  var params = new URLSearchParams(window.location.search);

  var item = params.get('item');
  var price = params.get('price');

  // เติมทั้งช่อง items และ total ทันทีที่โหลดหน้า
  var itemsEl = document.getElementById('items');
  var totalEl = document.getElementById('total');
  if (itemsEl && item !== null) itemsEl.value = item;
  if (totalEl && price !== null) totalEl.value = price;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    if (!payload.customerName || !payload.contact || !payload.items) {
      alert('กรุณากรอกชื่อ ช่องทางติดต่อ และรายการสินค้าให้ครบ');
      return;
    }

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ==========================================================================
   3) หน้า admin (admin.html)
   ========================================================================== */

function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  var COLS = 6;

  showMessage('กำลังโหลดข้อมูล...');

  // เติมพารามิเตอร์กัน cache ของเบราว์เซอร์
  fetch(SHEET_CSV_URL + '&_=' + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (row) {
        // ตัดแถวว่าง
        return row.some(function (cell) { return cell.trim() !== ''; });
      });

      // ข้ามแถวหัวตาราง (ถ้ามี): แถวแรกที่ช่องวันเวลาไม่มีตัวเลขเลย
      if (rows.length > 0 && !/\d/.test(rows[0][0] || '')) rows.shift();

      if (rows.length === 0) {
        showMessage('ยังไม่มีคำสั่งซื้อ');
        return;
      }

      // รายการล่าสุดขึ้นก่อน (Sheet เพิ่มแถวใหม่ต่อท้ายเสมอ)
      rows.reverse();

      tbody.innerHTML = '';
      rows.forEach(function (row) {
        var tr = document.createElement('tr');
        for (var i = 0; i < COLS; i++) {
          var td = document.createElement('td');
          td.textContent = row[i] !== undefined ? row[i] : '';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    });

  function showMessage(msg) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = COLS;
    td.textContent = msg;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

/**
 * parse CSV แบบเขียนเอง รองรับ:
 * - ค่าที่ครอบด้วยเครื่องหมายคำพูด "..."
 * - เครื่องหมายคำพูดซ้อน "" ภายในค่า
 * - ขึ้นบรรทัดใหม่ภายในค่าที่ครอบด้วยเครื่องหมายคำพูด
 * - ตัวคั่นบรรทัดแบบ \n และ \r\n
 */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  // ตัด BOM ถ้ามี
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
