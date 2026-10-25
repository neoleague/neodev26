let schemaData = [];
let currentFetchedData = null;
let currentFields = [];
const API_ENDPOINT = '/williams-tools/admin-data-inspector/';

document.addEventListener('DOMContentLoaded', async () => {
    await fetchSchema();

    document.getElementById('app-select').addEventListener('change', handleAppChange);
    document.getElementById('model-select').addEventListener('change', handleModelChange);

    document.getElementById('btn-select-all').addEventListener('click', () => setAllCheckboxes(true));
    document.getElementById('btn-deselect-all').addEventListener('click', () => setAllCheckboxes(false));
    document.getElementById('btn-invert-select').addEventListener('click', invertCheckboxes);

    document.getElementById('add-filter-btn').addEventListener('click', () => addFilterRow());
    document.getElementById('get-table-btn').addEventListener('click', executeGetTable);
    document.getElementById('copy-btn').addEventListener('click', copyOutputToClipboard);
    document.getElementById('download-btn').addEventListener('click', triggerFileDownload);
});

async function fetchSchema() {
    try {
        const response = await fetch(API_ENDPOINT, {
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });

        if (!response.ok) throw new Error('Failed to load database schema.');

        schemaData = await response.json();
        populateApps();
    } catch (err) {
        console.error('Schema initialization error:', err);
        updateStatus('Error loading database schema', false);
    }
}

function populateApps() {
    const appSelect = document.getElementById('app-select');
    const apps = [...new Set(schemaData.map(item => item.app))].sort();

    apps.forEach(app => {
        const option = document.createElement('option');
        option.value = app;
        option.textContent = app;
        appSelect.appendChild(option);
    });
}

function handleAppChange(e) {
    const selectedApp = e.target.value;
    const modelSelect = document.getElementById('model-select');

    modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
    resetFieldSelection();

    if (!selectedApp) {
        modelSelect.disabled = true;
        return;
    }

    const filteredModels = schemaData.filter(item => item.app === selectedApp);
    filteredModels.forEach(m => {
        const option = document.createElement('option');
        option.value = m.model;
        option.textContent = `${m.display_name} (${m.model})`;
        modelSelect.appendChild(option);
    });

    modelSelect.disabled = false;
}

function handleModelChange(e) {
    const selectedApp = document.getElementById('app-select').value;
    const selectedModel = e.target.value;

    if (!selectedModel) {
        resetFieldSelection();
        return;
    }

    const targetSchema = schemaData.find(item => item.app === selectedApp && item.model === selectedModel);

    if (targetSchema) {
        currentFields = targetSchema.fields;
        renderFieldCheckboxes(currentFields);
        toggleFieldButtons(true);
        document.getElementById('add-filter-btn').disabled = false;
        document.getElementById('get-table-btn').disabled = false;
        
        // Reset filter rows for new model selection
        document.getElementById('filter-rows-container').innerHTML = '';
    }
}

function renderFieldCheckboxes(fields) {
    const container = document.getElementById('field-checkboxes-container');
    container.innerHTML = '';

    fields.forEach(field => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = field;
        checkbox.checked = true;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(field));
        container.appendChild(label);
    });
}

function addFilterRow(key = '', value = '') {
    const container = document.getElementById('filter-rows-container');
    const row = document.createElement('div');
    row.className = 'filter-row';

    // Key input: combo select box with standard fields + custom input support
    const keySelect = document.createElement('select');
    keySelect.className = 'filter-key-input';
    
    keySelect.innerHTML = '<option value="">-- Select Field --</option>';
    currentFields.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        if (f === key) opt.selected = true;
        keySelect.appendChild(opt);
    });

    // Custom input for foreign keys / ORM lookups like user__is_staff
    const customKeyInput = document.createElement('input');
    customKeyInput.type = 'text';
    customKeyInput.placeholder = 'Or custom lookup (e.g. user__id)';
    customKeyInput.className = 'filter-key-input';
    if (key && !currentFields.includes(key)) {
        customKeyInput.value = key;
    }

    // Value input
    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.placeholder = 'Value (e.g. true, 10, "active")';
    valInput.className = 'filter-val-input';
    valInput.value = value;

    // Delete row button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-filter';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => row.remove());

    row.appendChild(keySelect);
    row.appendChild(customKeyInput);
    row.appendChild(valInput);
    row.appendChild(removeBtn);

    container.appendChild(row);
}

function parseFilterValue(val) {
    const trimmed = val.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null' || trimmed === 'None') return null;
    if (!isNaN(trimmed) && trimmed !== '') return Number(trimmed);
    
    // Try parsing as JSON for lists/objects
    try {
        return JSON.parse(trimmed);
    } catch {
        return trimmed;
    }
}

function buildFiltersObject() {
    const filters = {};
    const rows = document.querySelectorAll('.filter-row');

    rows.forEach(row => {
        const selectKey = row.querySelector('select').value;
        const customKey = row.querySelector('input[type="text"]:nth-of-type(1)').value.trim();
        const rawVal = row.querySelector('input[type="text"]:nth-of-type(2)').value;

        const finalKey = customKey || selectKey;
        if (finalKey && rawVal !== '') {
            filters[finalKey] = parseFilterValue(rawVal);
        }
    });

    return filters;
}

function setAllCheckboxes(state) {
    const checkboxes = document.querySelectorAll('#field-checkboxes-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = state);
}

function invertCheckboxes() {
    const checkboxes = document.querySelectorAll('#field-checkboxes-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = !cb.checked);
}

function toggleFieldButtons(enabled) {
    document.getElementById('btn-select-all').disabled = !enabled;
    document.getElementById('btn-deselect-all').disabled = !enabled;
    document.getElementById('btn-invert-select').disabled = !enabled;
}

function resetFieldSelection() {
    document.getElementById('field-checkboxes-container').innerHTML = 
        '<span class="help-text">Select a model above to display available fields.</span>';
    toggleFieldButtons(false);
    document.getElementById('add-filter-btn').disabled = true;
    document.getElementById('get-table-btn').disabled = true;
    document.getElementById('filter-rows-container').innerHTML = '';
}

async function executeGetTable() {
    const app = document.getElementById('app-select').value;
    const model = document.getElementById('model-select').value;
    const filetype = document.getElementById('filetype-select').value;

    const selectedFields = Array.from(
        document.querySelectorAll('#field-checkboxes-container input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    const filters = buildFiltersObject();

    const payload = {
        app: app,
        model: model,
        fields: selectedFields,
        filters: filters,
        filetype: filetype,
        browser_download: false
    };

    updateStatus('Fetching dataset...', true);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const rawContent = await response.text();

        if (!response.ok) {
            updateStatus(`Status: ${response.status} ${response.statusText}`, false);
            document.getElementById('output-textbox').value = rawContent;
            toggleOutputControls(false);
            return;
        }

        updateStatus(`Status: 200 OK (${filetype.toUpperCase()})`, true);
        currentFetchedData = rawContent;
        document.getElementById('output-textbox').value = rawContent;
        toggleOutputControls(true);

    } catch (err) {
        console.error('Request Execution Error:', err);
        updateStatus('Status: Connection Error', false);
        toggleOutputControls(false);
    }
}

function toggleOutputControls(enabled) {
    document.getElementById('copy-btn').disabled = !enabled;
    document.getElementById('download-btn').disabled = !enabled;
}

function updateStatus(message, isOk) {
    const statusBar = document.getElementById('status-bar');
    statusBar.innerText = message;
    statusBar.className = 'status-bar ' + (isOk ? 'status-ok' : 'status-err');
}

function copyOutputToClipboard() {
    const outputArea = document.getElementById('output-textbox');
    outputArea.select();
    navigator.clipboard.writeText(outputArea.value);
    alert('Output copied to clipboard!');
}

function triggerFileDownload() {
    if (!currentFetchedData) return;

    const model = document.getElementById('model-select').value;
    const filetype = document.getElementById('filetype-select').value;
    const mimeType = filetype === 'json' ? 'application/json' : 'text/csv';

    const blob = new Blob([currentFetchedData], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.style.display = 'none';
    a.href = url;
    a.download = `${model}_export.${filetype}`;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}