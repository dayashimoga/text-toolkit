(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ── Tab Switching ──
$$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tool-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#panel-${btn.dataset.tool}`).classList.add('active');
    });
});

const input = $('#mainInput');

// ── Stats ──
function updateStats() {
    const text = input.value;
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    const lines = text ? text.split('\n').length : 0;
    const readTime = Math.ceil(words.length / 225);
    const speakTime = Math.ceil(words.length / 150);

    $('#statWords').textContent = words.length;
    $('#statChars').textContent = chars;
    $('#statCharsNoSpace').textContent = charsNoSpace;
    $('#statSentences').textContent = sentences;
    $('#statParagraphs').textContent = paragraphs || (text.trim() ? 1 : 0);
    $('#statLines').textContent = lines;
    $('#statReadTime').textContent = readTime > 0 ? `${readTime}m` : '0m';
    $('#statSpeakTime').textContent = speakTime > 0 ? `${speakTime}m` : '0m';

    // Word frequency
    if (words.length > 0) {
        const freq = {};
        words.forEach(w => {
            const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (lower) freq[lower] = (freq[lower] || 0) + 1;
        });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
        $('#wordFreqList').innerHTML = sorted.map(([word, count]) =>
            `<div class="freq-item"><span class="word">${word}</span><span class="count">${count}</span></div>`
        ).join('');
    } else {
        $('#wordFreqList').innerHTML = '<p class="text-muted" style="font-size:0.8rem">Type text to see word frequency</p>';
    }

    // Update other panels reactively
    updateSlug(text);
    updateMarkdown(text);
}
input.addEventListener('input', updateStats);

// ── Case Converter ──
$$('[data-case]').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = input.value;
        let result = '';
        const c = btn.dataset.case;
        if (c === 'upper') result = text.toUpperCase();
        else if (c === 'lower') result = text.toLowerCase();
        else if (c === 'title') result = text.replace(/\b\w/g, ch => ch.toUpperCase());
        else if (c === 'sentence') result = text.replace(/(^\s*|[.!?]\s+)(\w)/g, (m, p, ch) => p + ch.toUpperCase());
        else if (c === 'camel') result = text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, ch) => ch.toUpperCase());
        else if (c === 'snake') result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        else if (c === 'kebab') result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        else if (c === 'pascal') result = text.replace(/(?:^|\s+|[^a-zA-Z0-9]+)\w/g, ch => ch.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
        else if (c === 'dot') result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.|\.$/g, '');
        else if (c === 'toggle') result = [...text].map(ch => ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()).join('');
        else if (c === 'alternating') result = [...text].map((ch, i) => i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()).join('');
        $('#caseOutput').value = result;
    });
});
$('#copyCaseBtn').addEventListener('click', () => { navigator.clipboard.writeText($('#caseOutput').value); });

// ── Find & Replace ──
$('#replaceBtn').addEventListener('click', () => {
    const find = $('#findInput').value;
    const replace = $('#replaceInput').value;
    const caseSens = $('#findCase').checked;
    const useRegex = $('#findRegex').checked;
    const replaceAll = $('#findAll').checked;
    if (!find) return;
    let text = input.value;
    try {
        const flags = (caseSens ? '' : 'i') + (replaceAll ? 'g' : '');
        const regex = useRegex ? new RegExp(find, flags) : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        const matches = text.match(regex);
        $('#findCount').textContent = matches ? `${matches.length} match${matches.length > 1 ? 'es' : ''}` : 'No matches';
        $('#findOutput').value = text.replace(regex, replace);
    } catch (e) {
        $('#findCount').textContent = 'Invalid regex';
    }
});

// ── Text Diff ──
$('#diffBtn').addEventListener('click', () => {
    const orig = $('#diffOriginal').value.split('\n');
    const mod = $('#diffModified').value.split('\n');
    const maxLen = Math.max(orig.length, mod.length);
    let html = '';
    for (let i = 0; i < maxLen; i++) {
        const o = orig[i] !== undefined ? orig[i] : '';
        const m = mod[i] !== undefined ? mod[i] : '';
        if (o === m) {
            html += `<div class="diff-line diff-same">&nbsp; ${escapeHtml(o)}</div>`;
        } else {
            if (o) html += `<div class="diff-line diff-remove">- ${escapeHtml(o)}</div>`;
            if (m) html += `<div class="diff-line diff-add">+ ${escapeHtml(m)}</div>`;
        }
    }
    $('#diffOutput').innerHTML = html || '<p class="text-muted">No differences found</p>';
});

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Hash Generator ──
$('#hashBtn').addEventListener('click', async () => {
    const text = input.value;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    let html = '';
    for (const algo of algos) {
        try {
            const hashBuffer = await crypto.subtle.digest(algo, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            html += `<div class="hash-row"><label>${algo}</label><input type="text" value="${hashHex}" readonly onclick="this.select()"></div>`;
        } catch (e) {
            html += `<div class="hash-row"><label>${algo}</label><input type="text" value="Not supported" readonly></div>`;
        }
    }
    // CRC32
    const crc = crc32(text);
    html += `<div class="hash-row"><label>CRC32</label><input type="text" value="${crc}" readonly onclick="this.select()"></div>`;
    const el = $('#hashResults'); if (el) el.innerHTML = html;
});

function crc32(str) {
    let crc = ~0;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i);
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return ((~crc) >>> 0).toString(16).padStart(8, '0');
}

// ── Encode/Decode ──
$$('[data-enc]').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = input.value;
        let result = '';
        const enc = btn.dataset.enc;
        try {
            if (enc === 'base64enc') result = btoa(unescape(encodeURIComponent(text)));
            else if (enc === 'base64dec') result = decodeURIComponent(escape(atob(text)));
            else if (enc === 'urlenc') result = encodeURIComponent(text);
            else if (enc === 'urldec') result = decodeURIComponent(text);
            else if (enc === 'htmlenc') result = escapeHtml(text);
            else if (enc === 'htmldec') { const d = document.createElement('div'); d.innerHTML = text; result = d.textContent; }
            else if (enc === 'rot13') result = text.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)));
            else if (enc === 'reverse') result = [...text].reverse().join('');
            else if (enc === 'binary') result = [...text].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
            else if (enc === 'hex') result = [...text].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        } catch (e) { result = 'Error: Invalid input for this operation'; }
        $('#encodeOutput').value = result;
    });
});
$('#copyEncBtn').addEventListener('click', () => { navigator.clipboard.writeText($('#encodeOutput').value); });

// ── Lorem Ipsum ──
const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est'.split(' ');

function generateLorem(count, type) {
    const genSentence = () => {
        const len = 8 + Math.floor(Math.random() * 12);
        const words = Array.from({length: len}, () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
        words[0] = words[0][0].toUpperCase() + words[0].slice(1);
        return words.join(' ') + '.';
    };
    const genParagraph = () => Array.from({length: 3 + Math.floor(Math.random() * 4)}, genSentence).join(' ');
    if (type === 'words') return Array.from({length: count}, () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]).join(' ');
    if (type === 'sentences') return Array.from({length: count}, genSentence).join(' ');
    return Array.from({length: count}, genParagraph).join('\n\n');
}

$('#loremBtn').addEventListener('click', () => {
    const count = parseInt($('#loremCount').value) || 5;
    const type = $('#loremType').value;
    $('#loremOutput').value = generateLorem(count, type);
});
$('#copyLoremBtn').addEventListener('click', () => { navigator.clipboard.writeText($('#loremOutput').value); });

// ── Sort Lines ──
$$('[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
        const lines = input.value.split('\n');
        let result;
        const s = btn.dataset.sort;
        if (s === 'az') result = [...lines].sort((a, b) => a.localeCompare(b));
        else if (s === 'za') result = [...lines].sort((a, b) => b.localeCompare(a));
        else if (s === 'num') result = [...lines].sort((a, b) => parseFloat(a) - parseFloat(b));
        else if (s === 'length') result = [...lines].sort((a, b) => a.length - b.length);
        else if (s === 'reverse') result = [...lines].reverse();
        else if (s === 'shuffle') result = [...lines].sort(() => Math.random() - 0.5);
        else if (s === 'unique') result = [...new Set(lines)];
        else if (s === 'empty') result = lines.filter(l => l.trim());
        else if (s === 'trim') result = lines.map(l => l.trim());
        else if (s === 'number') result = lines.map((l, i) => `${i + 1}. ${l}`);
        else result = lines;
        $('#sortOutput').value = result.join('\n');
    });
});

// ── Markdown Preview ──
function updateMarkdown(text) {
    if (!text) { $('#markdownPreview').innerHTML = '<p class="text-muted">Type markdown text to see preview</p>'; return; }
    let html = text
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '<br><br>');
    $('#markdownPreview').innerHTML = html;
}

// ── Slug Generator ──
function updateSlug(text) {
    const base = text.trim().toLowerCase().slice(0, 100);
    $('#slugUrl').value = base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    $('#slugFile').value = base.replace(/[^a-z0-9.]+/g, '_').replace(/^_|_$/g, '');
    $('#slugCss').value = base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/^(\d)/, '_$1');
    $('#slugConst').value = text.trim().toUpperCase().slice(0, 100).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Toolbar buttons ──
$('#copyBtn').addEventListener('click', () => { navigator.clipboard.writeText(input.value); });
$('#clearInputBtn').addEventListener('click', () => { input.value = ''; updateStats(); });
$('#pasteBtn').addEventListener('click', async () => {
    try { input.value = await navigator.clipboard.readText(); updateStats(); } catch {}
});

// ── Theme ──
$('#themeBtn').addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.dataset.theme === 'dark';
    html.dataset.theme = isDark ? 'light' : 'dark';
    $('#themeBtn').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', html.dataset.theme);
});
if (localStorage.getItem('theme') === 'light') { document.documentElement.dataset.theme = 'light'; $('#themeBtn').textContent = '☀️'; }

// Init
updateStats();
})();
