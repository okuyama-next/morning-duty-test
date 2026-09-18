const GAS_URL = "https://biv4iouzzt3rqyt2anb472ivv40aggxm.lambda-url.ap-southeast-2.on.aws/";
let globalData = null;
let pendingUndoPayload = null;
let retryCount = 0;

const CREDO_DATA = [
  { no: "01", title: "見た目と印象は中身を語る。", text: "明るく元気にあいさつする人は、みんなから愛される。<br>明るく元気に笑って泣いて怒る人も、みんなから愛される。<br>感謝の気持ちを声にすると、やまびこになって返ってくる。<br>礼儀とマナーを身につけると、不思議と心もキレイになる。" },
  { no: "02", title: "お客様の心を理解する心。", text: "お客様に嘘をつく人は、家族や友人にも嘘をつく。<br>お客様と誠実に向き合う人は、すべての人と誠実に向き合う。<br>お客様の気持ちになって考えることは、自分の心の中を覗いてみることに等しい。" },
  { no: "03", title: "基本に戻る素直さと勇気。", text: "難しいことができるよりも、当たり前のことをきちんと当たり前にできる方が難しい。<br>超えられない壁は、もう一度原点に立ち返って見つめることで、超えられる壁になる。" },
  { no: "04", title: "仕事を楽しむことの喜びと幸せ。", text: "楽しい仕事を探す人は、仕事を楽しめない。<br>辛さや苦しみを乗り越える喜びを知っている人は、仕事を楽しめる。<br>自分が幸せでない人は、人を幸せにはできない。" },
  { no: "05", title: "努力は成長となって報われる", text: "もう限界だと心が折れたとき、もう一歩だけ踏み出す強さがあれば、人は常に成長し続けることができる。<br>「昔は良かった」と言う人は、自分の人生を自ら否定している。<br>努力しない人は過去を振り返り、自分を磨き続ける人は未来を思う。" },
  { no: "06", title: "誇りを持てる仕事に出会えた奇跡。", text: "お客様に「ありがとう」と言われる仕事は、世の中にそれほど多くない。<br>いろんな人生と関わる仕事は、大きな責任と覚悟をともなう。<br>いろんな人生と関わる仕事だから、大きな喜びと満足があるし、自分の人生も豊かにしてくれる。" },
  { no: "07", title: "「住まい」のもっと先にある感動を。", text: "「ここまでやってくれるのか」と思われる人は、「住まい」というモノを売っているのではなく、「住まい」を超えたいろんなコトを売っている。" },
  { no: "08", title: "競い合いながら助け合える仲間がいる。", text: "競い合いながら一緒に成長できる仲間は、困難にぶつかったとき一緒に乗り越えられる仲間であり、人生のかけがえのない財産になる。" },
  { no: "09", title: "自分を叶えるための最高の場所。", text: "一度しかない人生でどんな自分を叶えるか。<br>自分を自立させ、成長させていくことは、自分がこの世界にとってかけがえのない存在として素敵に生きていることの証しに他ならない。" }
];

function getTodayFormattedString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
  return `${year}年${month}月${date}日(${dayOfWeek})`;
}

async function fetchDutyData() {
  try {
    const response = await fetch(GAS_URL);
    const text = await response.text();
    let data = JSON.parse(text);

    globalData = data;
    retryCount = 0;
    renderUI(data);
    renderEditList(data);

  } catch (error) {
    console.warn("データ通信失敗。再試行します:", error);
    if (retryCount < 3) {
      retryCount++;
      setTimeout(fetchDutyData, 1000);
    } else {
      document.getElementById('app').innerHTML = `
        <div class="loading" style="color: #dc3545;">
          データの通信に失敗しました。<br>
          <button class="btn btn-add" style="margin-top:12px;" onclick="retryFetch()">再読み込み</button>
        </div>`;
    }
  } finally {
    setButtonsDisabled(false);
  }
}

function retryFetch() {
  retryCount = 0;
  document.getElementById('app').innerHTML = '<div class="loading">データを読み込み中...</div>';
  fetchDutyData();
}

function renderUI(data) {
  const app = document.getElementById('app');
  
  if (!data.list || data.list.length === 0) {
    app.innerHTML = '<div class="loading">メンバーが登録されていません</div>';
    return;
  }

  const todayStr = getTodayFormattedString();

  let html = `
    <div class="next-card">
      <div class="today-date">📅 ${todayStr}</div>
      <div class="label">次の当番予定</div>
      <div class="name">${data.next.name} さん</div>
      <div class="no">No. ${data.next.no}</div>
      <button class="btn btn-main" onclick="submitDuty(${data.next.no}, '${data.next.name}')">本日の朝礼完了</button>
    </div>

    <div class="list-title">次回以降の朝礼順一覧</div>
    <div class="member-list">
  `;

  data.list.forEach((item, index) => {
    const isNext = index === 0;
    let badgeText = "";
    let badgeClass = "normal";

    if (index === 0) {
      badgeText = "本日";
      badgeClass = "today";
    } else if (index === 1) {
      badgeText = "次回";
      badgeClass = "soon";
    } else if (index <= 3) {
      badgeText = `もうすぐ (${index}営業日後)`;
      badgeClass = "soon";
    } else {
      badgeText = `${index}営業日後`;
      badgeClass = "normal";
    }

    const memoHtml = item.memo ? `<div style="font-size:12px; color:#555; margin-top:4px;">💬 ${escapeHtml(item.memo)}</div>` : '';

    html += `
      <div class="member-item ${isNext ? 'is-next' : ''}">
        <div class="member-info">
          <div>
            <span class="member-no">No.${item.no}</span>
            <span class="member-name">${item.name}</span>
          </div>
          ${memoHtml}
        </div>
        <div class="member-actions">
          <span class="turn-badge ${badgeClass}">${badgeText}</span>
          <button class="btn btn-small" onclick="submitDuty(${item.no}, '${item.name}')">完了</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  app.innerHTML = html;
}

function renderEditList(data, filterKeyword = "") {
  const container = document.getElementById('editMemberList');
  if (!data || !data.list || data.list.length === 0) {
    container.innerHTML = '<div style="padding:12px;text-align:center;color:#888;">メンバーはいません</div>';
    return;
  }

  let sortedList = [...data.list].sort((a, b) => a.no - b.no);

  if (filterKeyword.trim() !== "") {
    const kw = filterKeyword.trim().toLowerCase();
    sortedList = sortedList.filter(item => item.name.toLowerCase().includes(kw));
  }

  if (sortedList.length === 0) {
    container.innerHTML = '<div style="padding:12px;text-align:center;color:#888;">該当するメンバーが見つかりません</div>';
    return;
  }

  let html = "";
  sortedList.forEach(item => {
    const memoBadge = item.memo ? '📝' : '✏️';
    html += `
      <div class="edit-member-item">
        <div class="member-info" style="cursor:pointer;" onclick="openStandaloneMemoModal(${item.no}, '${item.name}', '${escapeHtml(item.memo || '')}')" title="タップしてメモ画面へ移動">
          <span class="member-no">No.${item.no}</span>
          <span class="member-name" style="text-decoration: underline; color:#0056b3;">${item.name} ${memoBadge}</span>
        </div>
        <div class="edit-controls">
          <button class="btn-step" onclick="decrementDuty(${item.no}, '${item.name}')" title="回数を減らす">-</button>
          <button class="btn-step" onclick="openDatePicker(${item.no}, '${item.name}')" title="日付を指定して回数を増やす">+</button>
          <button class="btn btn-delete" onclick="deleteMember(${item.no}, '${item.name}')">削除</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ★独立したメモ編集画面（専用モーダル）の制御★ */
function openStandaloneMemoModal(no, name, currentMemo) {
  // 既存の設定モーダルを一度隠す
  closeSettingsModal();

  let memoModal = document.getElementById('standaloneMemoModal');
  if (!memoModal) {
    memoModal = document.createElement('div');
    memoModal.id = 'standaloneMemoModal';
    memoModal.className = 'modal-overlay';
    document.body.appendChild(memoModal);
  }

  document.body.classList.add('modal-open');
  memoModal.style.display = 'flex';
  memoModal.innerHTML = `
    <div class="modal-content" style="max-width:400px; width:90%;">
      <div class="modal-header">
        <h3 class="modal-title">📝 ${name} さんの共有メモ</h3>
        <button class="modal-close" onclick="closeStandaloneMemoModal()">×</button>
      </div>
      <div class="modal-body" style="padding:16px;">
        <label style="font-size:13px; color:#666; display:block; margin-bottom:8px;">朝礼で共有したい内容・テーマを入力してください：</label>
        <textarea id="standaloneMemoText" style="width:100%; height:120px; padding:10px; font-size:14px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box;" placeholder="（例）今日のクレド発表内容、連絡事項など">${currentMemo}</textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button class="btn btn-undo" onclick="closeStandaloneMemoModal()">キャンセル</button>
          <button class="btn btn-add" onclick="submitStandaloneMemo(${no}, '${name}')">メモを保存</button>
        </div>
      </div>
    </div>
  `;
}

function closeStandaloneMemoModal() {
  const memoModal = document.getElementById('standaloneMemoModal');
  if (memoModal) memoModal.style.display = 'none';
  // 設定モーダルに戻る
  openSettingsModal();
}

async function submitStandaloneMemo(no, name) {
  const memoText = document.getElementById('standaloneMemoText').value.trim();
  
  const memoModal = document.getElementById('standaloneMemoModal');
  if (memoModal) memoModal.style.display = 'none';

  const res = await sendPost({ action: 'saveMemo', targetNo: no, memo: memoText });
  if (res) {
    alert(`${name} さんのメモを更新しました。`);
  }
  openSettingsModal();
}

/* モーダル・日付指定・完了等の処理 */
function renderCredoList() {
  const container = document.getElementById('credoGrid');
  let html = "";
  CREDO_DATA.forEach((item, index) => {
    html += `
      <div class="credo-card" id="credoCard-${index}">
        <div><span class="credo-no">${item.no}</span></div>
        <div class="credo-title">${item.title}</div>
        <div class="credo-text">${item.text}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function openCredoModal() {
  document.body.classList.add('modal-open');
  document.getElementById('credoModal').style.display = 'flex';
  renderCredoList();
}

function closeCredoModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('credoModal').style.display = 'none';
}

function selectRandomCredo() {
  const cards = document.querySelectorAll('.credo-card');
  cards.forEach(c => c.classList.remove('highlight'));
  
  const randomIndex = Math.floor(Math.random() * CREDO_DATA.length);
  const targetCard = document.getElementById(`credoCard-${randomIndex}`);
  if (targetCard) {
    targetCard.classList.add('highlight');
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openDatePicker(no, name) {
  const box = document.getElementById('datePickerContainer');
  const todayStr = new Date().toISOString().split('T')[0];

  box.className = "date-picker-box";
  box.style.display = "flex";
  box.innerHTML = `
    <label>📅 ${name} さんの朝礼完了日を選択:</label>
    <input type="date" id="customDutyDate" class="date-picker-input" value="${todayStr}">
    <div class="date-picker-actions">
      <button class="btn btn-undo" onclick="closeDatePicker()">キャンセル</button>
      <button class="btn btn-add" onclick="submitCustomDuty(${no}, '${name}')">完了記録を追加</button>
    </div>
  `;
}

function closeDatePicker() {
  const box = document.getElementById('datePickerContainer');
  box.style.display = "none";
  box.innerHTML = "";
}

async function submitCustomDuty(no, name) {
  const dateVal = document.getElementById('customDutyDate').value;
  if (!dateVal) {
    alert("日付を選択してください。");
    return;
  }
  closeDatePicker();
  const res = await sendPost({ action: 'complete', targetNo: no, customDate: dateVal });
  if (res) {
    showUndoBar(`${name} さんの完了（${dateVal}）を記録しました`, { action: 'undo', undoType: 'complete', targetNo: no });
  }
}

async function decrementDuty(no, name) {
  if (!confirm(`${name} さんの直近の朝礼完了を取り消し（マイナス）しますか？`)) return;
  const res = await sendPost({ action: 'decrement', targetNo: no });
  if (res) {
    showUndoBar(`${name} さんの回数を1回減らしました`, { action: 'complete', targetNo: no });
  }
}

function filterMemberList() {
  const keyword = document.getElementById('searchMemberInput').value;
  if (globalData) renderEditList(globalData, keyword);
}

function openSettingsModal() {
  document.body.classList.add('modal-open');
  document.getElementById('settingsModal').style.display = 'flex';
  document.getElementById('searchMemberInput').value = '';
  closeDatePicker();
  if (globalData) renderEditList(globalData);
}

function closeSettingsModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('settingsModal').style.display = 'none';
  closeDatePicker();
}

function setButtonsDisabled(disabled) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(b => b.disabled = disabled);
}

function showUndoBar(text, payload) {
  pendingUndoPayload = payload;
  const bar = document.getElementById('undoBar');
  bar.className = "undo-bar";
  bar.style.display = "flex";
  bar.innerHTML = `
    <span>${text}</span>
    <button class="btn btn-undo" onclick="executeUndo()">元に戻す ↩</button>
  `;
}

function hideUndoBar() {
  pendingUndoPayload = null;
  const bar = document.getElementById('undoBar');
  if (bar) bar.style.display = "none";
}

async function submitDuty(no, name) {
  if (!confirm(`${name} さんの朝礼完了を記録しますか？`)) return;
  
  const res = await sendPost({ action: 'complete', targetNo: no });
  if (res) {
    showUndoBar(`${name} さんの完了を記録しました`, { action: 'undo', undoType: 'complete', targetNo: no });
  }
}

async function addMember() {
  const input = document.getElementById('newMemberName');
  const name = input.value.trim();
  if (!name) {
    alert("名前を入力してください。");
    return;
  }
  if (!confirm(`${name} さんを新規追加しますか？`)) return;

  const res = await sendPost({ action: 'add', name: name });
  if (res) {
    input.value = '';
    hideUndoBar();
  }
}

async function deleteMember(no, name) {
  const firstConfirm = confirm(`【警告】No.${no} ${name} さんを削除しますか？\n※この操作は取り消せません。`);
  if (!firstConfirm) return;

  const userInput = prompt(`【最終確認】誤削除を防ぐため、削除対象メンバーの名前を正確に入力してください。\n\n入力する名前: ${name}`);
  
  if (userInput !== name) {
    alert("名前が一致しなかったため、削除をキャンセルしました。");
    return;
  }

  hideUndoBar();

  const res = await sendPost({ action: 'delete', targetNo: no }, true);
  if (res) {
    alert(`${name} さんを削除しました。`);
  }
}

async function executeUndo() {
  if (!pendingUndoPayload) return;
  const payload = pendingUndoPayload;
  hideUndoBar();
  await sendPost(payload);
}

async function sendPost(payload, isDelete = false) {
  setButtonsDisabled(true);

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    globalData = result;
    renderUI(result);
    renderEditList(result, document.getElementById('searchMemberInput')?.value || "");

    if (isDelete) {
      hideUndoBar();
    }

    return result;

  } catch (error) {
    alert("処理中にエラーが発生しました。");
    console.error(error);
    fetchDutyData();
    return null;
  } finally {
    setButtonsDisabled(false);
  }
}

fetchDutyData();
