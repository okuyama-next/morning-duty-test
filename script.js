const GAS_URL = "https://biv4iouzzt3rqyt2anb472ivv40aggxm.lambda-url.ap-southeast-2.on.aws/";
let globalData = null;
let pendingUndoPayload = null;
let retryCount = 0;
let currentMemoTargetNo = null;
let editingMemoId = null;

// クレド（MIND 01〜09）のデータ
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
    const response = await fetch(GAS_URL, { redirect: "follow" });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("HTML応答エラー（リトライ処理へ）");
    }

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

    html += `
      <div class="member-item ${isNext ? 'is-next' : ''}">
        <div class="member-info">
          <span class="member-no">No.${item.no}</span>
          <span class="member-name">${item.name}</span>
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

/* --- 設定リスト内メンバー名描画 --- */
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
    html += `
      <div class="edit-member-item">
        <div class="member-info">
          <span class="member-no">No.${item.no}</span>
          <span class="member-name-clickable" onclick="openMemoModal(${item.no}, '${item.name}')" title="クリックしてメモを開く">
            ${item.name}
          </span>
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

/* --- クレドモーダル関連処理 --- */
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

/* --- メモモーダル（アコーディオン型・日付のみ表示）制御 --- */
function openMemoModal(no, name) {
  currentMemoTargetNo = no;
  editingMemoId = null;
  
  document.getElementById('settingsModal').style.display = 'none';
  document.getElementById('memoModalTitle').textContent = `📝 ${name} さんのメモ`;
  document.getElementById('memoInput').value = '';
  document.getElementById('saveMemoBtn').textContent = 'メモを追加';
  
  renderMemoTimeline();
  document.getElementById('memoModal').style.display = 'flex';
}

function closeMemoModal() {
  document.getElementById('memoModal').style.display = 'none';
  currentMemoTargetNo = null;
  editingMemoId = null;
  document.getElementById('settingsModal').style.display = 'flex';
}

function renderMemoTimeline() {
  const timelineEl = document.getElementById('memoTimeline');
  timelineEl.innerHTML = '';

  if (!globalData || !globalData.list) return;
  const member = globalData.list.find(m => Number(m.no) === Number(currentMemoTargetNo));
  if (!member) return;

  let memoList = member.memos ? [...member.memos] : [];
  if (member.memo && member.memo.trim() !== "" && memoList.length === 0) {
    memoList = [{ id: "legacy-1", text: member.memo, date: "以前のメモ" }];
  }

  if (memoList.length === 0) {
    timelineEl.innerHTML = '<p style="color: #a0aec0; font-size: 0.82rem; text-align: center; margin: 20px 0;">メモはまだありません。</p>';
    return;
  }

  memoList.reverse().forEach((memo) => {
    const card = document.createElement('div');
    card.className = 'memo-accordion-card';
    card.id = `memoCard-${memo.id}`;

    // 改行で分割（1行目をタイトル、2行目以降を本文とする）
    const lines = memo.text.split('\n');
    const titlePreview = lines[0].trim() || '無題のメモ';
    const bodyText = lines.slice(1).join('\n').trim();

    // 日時文字列から時間を切り捨てて「日付のみ（例: 9/19）」にする処理
    let formattedDate = memo.date || '';
    if (formattedDate.includes(' ')) {
      formattedDate = formattedDate.split(' ')[0];
    }

    const bodyHtml = bodyText !== '' 
      ? `<div class="memo-full-text">${escapeHtml(bodyText)}</div>`
      : `<div class="memo-full-text" style="color: #94a3b8; font-style: italic; font-size: 0.8rem;">（詳細テキストなし）</div>`;

    card.innerHTML = `
      <div class="memo-accordion-header" onclick="toggleMemoCard('memoCard-${memo.id}')">
        <div class="memo-title-preview">📌 ${escapeHtml(titlePreview)}</div>
        <div class="memo-date-tag">
          <span>${formattedDate}</span>
          <span class="memo-arrow">▼</span>
        </div>
      </div>
      <div class="memo-accordion-body">
        ${bodyHtml}
        <div class="memo-card-actions">
          <button class="memo-card-btn edit" onclick="startEditMemo('${memo.id}', \`${escapeJsString(memo.text)}\`)">編集</button>
          <button class="memo-card-btn delete" onclick="deleteMemoItem('${memo.id}')">削除</button>
        </div>
      </div>
    `;
    timelineEl.appendChild(card);
  });
}

function toggleMemoCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('active');
  }
}

async function saveMemo() {
  if (currentMemoTargetNo === null) return;

  const text = document.getElementById('memoInput').value.trim();
  if (!text) {
    alert('メモ内容を入力してください。');
    return;
  }

  const targetNo = currentMemoTargetNo;

  if (editingMemoId !== null) {
    await sendPost({ action: 'editMemo', targetNo: targetNo, memoId: editingMemoId, text: text });
  } else {
    await sendPost({ action: 'addMemo', targetNo: targetNo, text: text });
  }

  document.getElementById('memoInput').value = '';
  editingMemoId = null;
  document.getElementById('saveMemoBtn').textContent = 'メモを追加';

  renderMemoTimeline();
  if (globalData) renderEditList(globalData);
}

function startEditMemo(memoId, currentText) {
  editingMemoId = memoId;
  document.getElementById('memoInput').value = currentText;
  document.getElementById('saveMemoBtn').textContent = '変更を保存';
}

async function deleteMemoItem(memoId) {
  if (!confirm('このメモを削除しますか？')) return;

  await sendPost({ action: 'deleteMemo', targetNo: currentMemoTargetNo, memoId: memoId });

  if (editingMemoId === memoId) {
    editingMemoId = null;
    document.getElementById('memoInput').value = '';
    document.getElementById('saveMemoBtn').textContent = 'メモを追加';
  }

  renderMemoTimeline();
  if (globalData) renderEditList(globalData);
}

// ヘルパー関数
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

/* --- モーダル・日付指定制御 --- */
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
  if (res && res.success) {
    showUndoBar(`${name} さんの完了（${dateVal}）を記録しました`, { action: 'undo', undoType: 'complete', targetNo: no });
  }
}

async function decrementDuty(no, name) {
  if (!confirm(`${name} さんの直近の朝礼完了を取り消し（マイナス）しますか？`)) return;
  const res = await sendPost({ action: 'decrement', targetNo: no });
  if (res && res.success) {
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
  bar.style.display = "none";
}

async function submitDuty(no, name) {
  if (!confirm(`${name} さんの朝礼完了を記録しますか？\n`)) return;
  
  const res = await sendPost({ action: 'complete', targetNo: no });
  if (res && res.success) {
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
  if (res && res.success) {
    input.value = '';
    hideUndoBar();
  }
}

async function deleteMember(no, name) {
  if (!confirm(`本当に ${name} さん（No.${no}）を削除しますか？`)) return;
  
  const res = await sendPost({ action: 'delete', targetNo: no });
  if (res && res.success) {
    showUndoBar(`${name} さんを削除しました`, { 
      action: 'undo', 
      undoType: 'delete', 
      targetNo: no, 
      name: name,
      savedDates: res.savedDates || []
    });
  }
}

async function executeUndo() {
  if (!pendingUndoPayload) return;
  const payload = pendingUndoPayload;
  hideUndoBar();
  await sendPost(payload);
}

async function sendPost(payload) {
  setButtonsDisabled(true);

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    globalData = result;
    renderUI(result);
    renderEditList(result);
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
