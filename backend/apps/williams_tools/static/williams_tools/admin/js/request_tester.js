function togglePayload() {
    const methodSelect = document.getElementById('method-select');
    const payloadContainer = document.getElementById('payload-container');
    
    if (methodSelect.value === 'GET' || methodSelect.value === 'DELETE') {
        payloadContainer.style.display = 'none';
    } else {
        payloadContainer.style.display = 'block';
    }
}

function setupSmartJson() {

    const textarea = document.getElementById('payload-input');

    const pairs = {
        '(': ')',
        '{': '}',
        '[': ']',
        '"': '"',
    };

    const openers = ['(', '{', '['];

    textarea.addEventListener('keydown', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;

        let key = e.key;
        
        // FEATURE: Force single quotes to become double quotes
        if (key === "'") {
            key = '"';
        }

        // 1. Handle Tab Indentation
        if (key === 'Tab') {
            e.preventDefault();
            this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }

        // 2. Handle Auto-Closing Pairs (Keep your existing code for this)
        if (pairs[key]) {
            e.preventDefault();
            const char = key;
            const closingChar = pairs[char];
            this.value = this.value.substring(0, start) + char + closingChar + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }

        // 3. Handle Smart Enter
        if (key === 'Enter') {
            const before = this.value.substring(0, start);
            const after = this.value.substring(end); // using end in case text is highlighted
            const lines = before.split('\n');
            const currentLine = lines[lines.length - 1];
            
            // This regex still works because \s matches both spaces AND tabs
            const indentMatch = currentLine.match(/^\s*/);
            const currentIndent = indentMatch ? indentMatch[0] : "";

            const charBefore = before.slice(-1);
            const charAfter = after.charAt(0);

            // FEATURE: Enter between {|} or [|] or (|)
            if (openers.includes(charBefore) && pairs[charBefore] === charAfter) {
                e.preventDefault();
                // Add a Tab to the current indentation level
                const newIndent = currentIndent + "\t";
                
                // Create the structure: Newline + NewIndent + Newline + OriginalIndent
                this.value = before + "\n" + newIndent + "\n" + currentIndent + after;
                
                // Position cursor at the end of the newIndent line
                this.selectionStart = this.selectionEnd = start + newIndent.length + 1;
            } 
            // FEATURE: Keep indent on normal Newline
            else if (currentIndent.length > 0) {
                e.preventDefault();
                this.value = before + "\n" + currentIndent + after;
                this.selectionStart = this.selectionEnd = start + currentIndent.length + 1;
            }
        }

        // 4. Handle Smart Backspace (deleting pairs)
        if (key === 'Backspace' && start === end) {
            const before = this.value.substring(0, start);
            const after = this.value.substring(start);
            const charBefore = before.slice(-1);
            const charAfter = after.charAt(0);

            // If the cursor is between a pair defined in our object
            if (pairs[charBefore] === charAfter) {
                e.preventDefault();
                // Remove the character before AND the character after
                this.value = before.slice(0, -1) + after.slice(1);
                // Move cursor back one space to account for the deleted opener
                this.selectionStart = this.selectionEnd = start - 1;
            }
        }

    });

}

async function submitRequest() {
    const urlInput = document.getElementById('url-input');
    const method = document.getElementById('method-select').value;
    const payloadInput = document.getElementById('payload-input').value;
    const statusDisplay = document.getElementById('status-display');
    const iframe = document.getElementById('response-frame');

    let path = urlInput.value.trim();

    // Clean up user input
    if (!path.startsWith('/') && !path.startsWith('http')) path = '/' + path;
    if (!path.endsWith('/')) path = path + '/';
    if (!path.startsWith('http')) path = path.replace(/\/+/g, '/');
    
    urlInput.value = path;
    statusDisplay.innerText = "Loading...";

    try {
        const options = {
            method: method,
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        };

        if (method !== 'GET' && method !== 'DELETE' && payloadInput) {
            options.body = payloadInput;
        }

        const response = await fetch(path, options);

        const contentType = response.headers.get("content-type");
        let content;

        if (contentType && contentType.includes("application/json")) {
            const data = await response.json(); // Read once as JSON
            content = `<pre>${JSON.stringify(data, null, 4)}</pre>`;
        } else {
            content = await response.text(); // Read once as TEXT
        }

        // Update Status
        statusDisplay.innerText = `Status: ${response.status} ${response.statusText}`;
        statusDisplay.className = "status-bar " + (response.ok ? "status-200" : "status-error");
        
        // Inject the content into the iframe
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(content);
        doc.close();

    } catch (e) {
        statusDisplay.innerText = "Status: Connection Error";
        console.error(e);
    }
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

document.getElementById('method-select').addEventListener('change', togglePayload);
document.addEventListener('DOMContentLoaded', function() {
    togglePayload();
    setupSmartJson();
    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.addEventListener('click', submitRequest);
    }
});