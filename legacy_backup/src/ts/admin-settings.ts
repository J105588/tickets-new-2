/**
 * admin-settings.js
 * マスタデータ設定画面の制御 (Full CRUD via RPC)
 */

import { fetchMasterDataFromSupabase, adminManageMaster, adminFetchSchedules, adminManageSchedule } from './supabase-client.js';

let masterData = {
    groups: [],
    dates: [],
    timeslots: [],
    schedules: [] // New
};

document.addEventListener('DOMContentLoaded', () => {
    fetchMasterData();

    // Form Submit
    document.getElementById('settings-form').addEventListener('submit', handleSave);

    // Mobile Support
    window.toggleSidebar = function () {
        document.getElementById('sidebar').classList.toggle('active');
    };

    window.logout = function () {
        sessionStorage.removeItem('admin_session');
        window.location.href = 'admin-login.html';
    };

    // Global Modals
    window.closeModal = function (id) {
        document.getElementById(id).style.display = 'none';
    };
    window.openSlotModal = openSlotModal;
    window.openGroupModal = openGroupModal;
    window.openDateModal = openDateModal;
    // New
    window.openScheduleModal = openScheduleModal;
    window.handleSaveSchedule = handleSaveSchedule;
});

async function fetchMasterData() {
    const loader = document.getElementById('loading');
    loader.style.display = 'block';

    // Parallel fetch
    const [masterRes, scheduleRes] = await Promise.all([
        fetchMasterDataFromSupabase(),
        adminFetchSchedules()
    ]);

    if (masterRes.success) {
        masterData = masterRes.data;
        if (scheduleRes.success) {
            masterData.schedules = scheduleRes.data;
        } else {
            console.error('Schedule fetch failed:', scheduleRes.error);
            masterData.schedules = [];
        }

        renderAll();
        loader.style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } else {
        alert('データ読み込み失敗: ' + masterRes.error);
        loader.innerText = 'エラーが発生しました';
    }
}

function renderAll() {
    renderGroups();
    renderDates();
    renderSlots();
    renderSchedules();
}

// --- Renderers ---

function renderGroups() {
    const tbody = document.querySelector('#groups-table tbody');
    tbody.innerHTML = '';

    // Sort by display_order
    const sorted = [...masterData.groups].sort((a, b) => a.display_order - b.display_order);

    sorted.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${g.id}</td>
            <td>${g.display_order}</td>
            <td>${g.name}</td>
            <td><span class="${g.is_active ? 'status-active' : 'status-inactive'}">${g.is_active ? '有効' : '無効'}</span></td>
            <td><button class="btn btn-sm btn-outline-secondary" onclick="openGroupModal(${g.id})">編集</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDates() {
    const tbody = document.querySelector('#dates-table tbody');
    tbody.innerHTML = '';
    const sorted = [...masterData.dates].sort((a, b) => a.display_order - b.display_order);

    sorted.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.display_order}</td>
            <td>${d.date_label}</td>
            <td><span class="${d.is_active ? 'status-active' : 'status-inactive'}">${d.is_active ? '有効' : '無効'}</span></td>
            <td><button class="btn btn-sm btn-outline-secondary" onclick="openDateModal(${d.id})">編集</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSlots() {
    const tbody = document.querySelector('#slots-table tbody');
    tbody.innerHTML = '';
    const sorted = [...masterData.timeslots].sort((a, b) => a.display_order - b.display_order);

    sorted.forEach(s => {
        const tr = document.createElement('tr');
        // s.slot_code identifies the slot (e.g. "10:00")
        // s.start_time / s.end_time
        tr.innerHTML = `
            <td>${s.display_order}</td>
            <td><strong>${s.slot_code}</strong></td>
            <td>${s.start_time || ''} - ${s.end_time || ''}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="openSlotModal(${s.id})">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMaster('time_slots', ${s.id})">Del</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSchedules() {
    const tbody = document.querySelector('#schedule-table tbody');
    tbody.innerHTML = '';

    // masterData.schedules contains { group_name, day, timeslot }
    // Sort by Group then Day
    // Note: group_name is string. Ideally we sort by group order but we might not have it easily linked here unless we lookup.
    // Let's sort by day then group_name for now.

    const sorted = [...masterData.schedules].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.group_name.localeCompare(b.group_name);
    });

    sorted.forEach(sch => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sch.group_name}</td>
            <td>Day ${sch.day}</td>
            <td><span class="badge badge-info">${sch.timeslot}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="openScheduleModal('${sch.group_name}', ${sch.day}, '${sch.timeslot}')">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Schedule Modal ---

function openScheduleModal(groupName = null, day = null, timeslot = null) {
    const modal = document.getElementById('modal-schedule');
    const selGroup = document.getElementById('inp-sched-group');
    const selTimeslot = document.getElementById('inp-sched-timeslot');
    const selDay = document.getElementById('inp-sched-day');

    // Populate Groups
    selGroup.innerHTML = '';
    masterData.groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.name;
        opt.textContent = g.name;
        selGroup.appendChild(opt);
    });

    // Populate Timeslots
    selTimeslot.innerHTML = '';
    masterData.timeslots.forEach(ts => {
        const opt = document.createElement('option');
        opt.value = ts.slot_code;
        opt.textContent = `${ts.slot_code} (${ts.start_time}-${ts.end_time})`;
        selTimeslot.appendChild(opt);
    });

    if (groupName) {
        selGroup.value = groupName;
        selGroup.disabled = true; // Key (PK part) shouldn't change for update logic easily, though backend supports upscale/insert.
        // Actually, backend uses (group, day) to identify. If we want to move a schedule, we technically delete/create or update.
        // For simplicity, let's allow editing everything or treated as "Update/Insert for this Group/Day".
        selGroup.disabled = false;
    } else {
        selGroup.disabled = false;
    }

    if (day) selDay.value = day;
    if (timeslot) selTimeslot.value = timeslot;

    modal.style.display = 'flex';
}

async function handleSaveSchedule() {
    const groupName = document.getElementById('inp-sched-group').value;
    const day = document.getElementById('inp-sched-day').value;
    const timeslot = document.getElementById('inp-sched-timeslot').value;

    if (!groupName || !day || !timeslot) {
        alert('Please select all fields.');
        return;
    }

    if (!confirm(`Save Schedule?\nGroup: ${groupName}\nDay: ${day}\nSlot: ${timeslot}`)) return;

    // API Call
    const result = await adminManageSchedule({
        group_name: groupName,
        day: parseInt(day),
        timeslot: timeslot
    });

    if (result.success) {
        alert('Saved successfully!');
        document.getElementById('modal-schedule').style.display = 'none';
        fetchMasterData(); // Refresh
    } else {
        alert('Error: ' + result.error);
    }
}



// --- Modals ---

function openModal(title, type, id = null) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('edit-id').value = id || '';
    document.getElementById('edit-type').value = type;
    document.getElementById('settings-modal').classList.add('active');

    const delBtn = document.getElementById('btn-delete');
    if (id) {
        delBtn.style.display = 'inline-block';
    } else {
        delBtn.style.display = 'none';
    }
}

window.closeSettingsModal = function () {
    document.getElementById('settings-modal').classList.remove('active');
};

window.openGroupModal = function (id = null) {
    openModal(id ? '団体編集' : '団体追加', 'groups', id);
    const item = id ? masterData.groups.find(g => g.id == id) : {};

    const html = `
        <div class="form-group">
            <label>順序 (Display Order)</label>
            <input type="number" id="inp-order" class="form-control" value="${item.display_order || 10}">
        </div>
        <div class="form-group">
            <label>団体名 (Name)</label>
            <input type="text" id="inp-name" class="form-control" value="${item.name || ''}" required>
        </div>
        <div class="form-group">
            <label>状態 (Status)</label>
            <select id="inp-active" class="form-select">
                <option value="true" ${item.is_active !== false ? 'selected' : ''}>有効</option>
                <option value="false" ${item.is_active === false ? 'selected' : ''}>無効</option>
            </select>
        </div>
    `;
    document.getElementById('modal-fields').innerHTML = html;
};

window.openDateModal = function (id = null) {
    openModal(id ? '日程編集' : '日程追加', 'event_dates', id);
    const item = id ? masterData.dates.find(d => d.id == id) : {};

    const html = `
        <div class="form-group">
            <label>順序</label>
            <input type="number" id="inp-order" class="form-control" value="${item.display_order || 1}">
        </div>
        <div class="form-group">
            <label>日程ラベル (例: "1日目 (9/23)")</label>
            <input type="text" id="inp-label" class="form-control" value="${item.date_label || ''}" required>
        </div>
        <div class="form-group">
            <label>状態</label>
            <select id="inp-active" class="form-select">
                <option value="true" ${item.is_active !== false ? 'selected' : ''}>有効</option>
                <option value="false" ${item.is_active === false ? 'selected' : ''}>無効</option>
            </select>
        </div>
    `;
    document.getElementById('modal-fields').innerHTML = html;
};

window.openSlotModal = function (id = null) {
    openModal(id ? '時間帯編集' : '時間帯追加', 'time_slots', id);
    const item = id ? masterData.timeslots.find(s => s.id == id) : {};

    const html = `
        <div class="form-group">
            <label>順序</label>
            <input type="number" id="inp-order" class="form-control" value="${item.display_order || 1}">
        </div>
        <div class="form-group">
            <label>コード (A, B, C...)</label>
            <input type="text" id="inp-code" class="form-control" value="${item.slot_code || ''}" required>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group">
                <label>開始時間 (HH:MM)</label>
                <input type="text" id="inp-start" class="form-control" value="${item.start_time || '09:00'}">
            </div>
            <div class="form-group">
                <label>終了時間 (HH:MM)</label>
                <input type="text" id="inp-end" class="form-control" value="${item.end_time || '10:00'}">
            </div>
        </div>
    `;
    document.getElementById('modal-fields').innerHTML = html;
};


// --- Handlers ---

async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('edit-type').value; // 'groups', 'event_dates', 'time_slots'
    const op = id ? 'update' : 'add';

    const data = {
        id: id,
        display_order: document.getElementById('inp-order')?.value,
    };

    // Type specific fields
    if (type === 'groups') {
        data.name = document.getElementById('inp-name').value;
        data.is_active = document.getElementById('inp-active').value === 'true';
    } else if (type === 'event_dates') {
        data.date_label = document.getElementById('inp-label').value;
        data.is_active = document.getElementById('inp-active').value === 'true';
    } else if (type === 'time_slots') {
        data.slot_code = document.getElementById('inp-code').value;
        data.start_time = document.getElementById('inp-start').value;
        data.end_time = document.getElementById('inp-end').value;
    }

    // Call RPC
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerText = '保存中...';

    const res = await adminManageMaster(type, op, data);

    if (res.success) {
        closeSettingsModal();
        fetchMasterData(); // Refresh UI
    } else {
        alert('エラー: ' + res.error);
    }

    btn.disabled = false;
    btn.innerText = '保存';
}

window.handleDelete = async function () {
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('edit-type').value;
    if (!id) return;

    if (!confirm('本当に削除しますか？\n（関連する予約データがある場合エラーになる可能性があります）')) return;

    const btn = document.getElementById('btn-delete');
    btn.disabled = true;
    btn.innerText = '削除中...';

    const res = await adminManageMaster(type, 'delete', { id: id });

    if (res.success) {
        closeSettingsModal();
        fetchMasterData();
    } else {
        alert('エラー: ' + res.error);
    }

    btn.disabled = false;
    btn.innerText = '削除';
};
