// Tests for CSV/TSV parser functions

// Copy of parser functions from creator.js for testing
function parseDelimitedText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detect delimiter: if first line has tabs, use tab; otherwise use comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    const cards = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip header row if it looks like headers
        if (i === 0 && line.toLowerCase().includes('category')) {
            continue;
        }

        // Parse line with detected delimiter
        const fields = parseLine(line, delimiter);

        if (fields.length >= 4) {
            cards.push({
                category: fields[0].trim(),
                icon: fields[1].trim(),
                title: fields[2].trim(),
                description: fields[3].trim()
            });
        }
    }

    return cards;
}

function parseLine(line, delimiter) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current);

    return fields;
}

// Test helper
function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        return true;
    } catch (e) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${e.message}`);
        return false;
    }
}

function assertEqual(actual, expected, message = '') {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
    }
}

// Tests
let passed = 0;
let failed = 0;

console.log('\n=== CSV/TSV Parser Tests ===\n');

// CSV Tests
if (test('parses simple CSV', () => {
    const csv = 'Kategori1,🎯,Titel1,Beskrivning1';
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 1);
    assertEqual(result[0].category, 'Kategori1');
    assertEqual(result[0].icon, '🎯');
    assertEqual(result[0].title, 'Titel1');
    assertEqual(result[0].description, 'Beskrivning1');
})) passed++; else failed++;

if (test('parses CSV with multiple rows', () => {
    const csv = `Kat1,🎯,Titel1,Besk1
Kat2,🎨,Titel2,Besk2
Kat3,🎵,Titel3,Besk3`;
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 3);
    assertEqual(result[1].icon, '🎨');
    assertEqual(result[2].title, 'Titel3');
})) passed++; else failed++;

if (test('skips CSV header row', () => {
    const csv = `category,icon,title,description
Kat1,🎯,Titel1,Besk1`;
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 1);
    assertEqual(result[0].category, 'Kat1');
})) passed++; else failed++;

if (test('handles CSV with quoted fields containing commas', () => {
    const csv = 'Kategori,🎯,"Titel med, komma","Beskrivning med, komma"';
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 1);
    assertEqual(result[0].title, 'Titel med, komma');
    assertEqual(result[0].description, 'Beskrivning med, komma');
})) passed++; else failed++;

if (test('trims whitespace from CSV fields', () => {
    const csv = '  Kategori  ,  🎯  ,  Titel  ,  Beskrivning  ';
    const result = parseDelimitedText(csv);
    assertEqual(result[0].category, 'Kategori');
    assertEqual(result[0].title, 'Titel');
})) passed++; else failed++;

// TSV Tests
if (test('parses simple TSV', () => {
    const tsv = 'Kategori1\t🎯\tTitel1\tBeskrivning1';
    const result = parseDelimitedText(tsv);
    assertEqual(result.length, 1);
    assertEqual(result[0].category, 'Kategori1');
    assertEqual(result[0].icon, '🎯');
    assertEqual(result[0].title, 'Titel1');
    assertEqual(result[0].description, 'Beskrivning1');
})) passed++; else failed++;

if (test('parses TSV with multiple rows', () => {
    const tsv = `Kat1\t🎯\tTitel1\tBesk1
Kat2\t🎨\tTitel2\tBesk2`;
    const result = parseDelimitedText(tsv);
    assertEqual(result.length, 2);
    assertEqual(result[0].icon, '🎯');
    assertEqual(result[1].title, 'Titel2');
})) passed++; else failed++;

if (test('skips TSV header row', () => {
    const tsv = `category\ticon\ttitle\tdescription
Kat1\t🎯\tTitel1\tBesk1`;
    const result = parseDelimitedText(tsv);
    assertEqual(result.length, 1);
    assertEqual(result[0].category, 'Kat1');
})) passed++; else failed++;

if (test('handles TSV with commas in fields (no quotes needed)', () => {
    const tsv = 'Kategori\t🎯\tTitel med, komma\tBeskrivning med, komma';
    const result = parseDelimitedText(tsv);
    assertEqual(result.length, 1);
    assertEqual(result[0].title, 'Titel med, komma');
    assertEqual(result[0].description, 'Beskrivning med, komma');
})) passed++; else failed++;

// Edge cases
if (test('returns empty array for empty input', () => {
    const result = parseDelimitedText('');
    assertEqual(result, []);
})) passed++; else failed++;

if (test('returns empty array for whitespace-only input', () => {
    const result = parseDelimitedText('   \n   \n   ');
    assertEqual(result, []);
})) passed++; else failed++;

if (test('skips rows with fewer than 4 fields', () => {
    const csv = `Kat1,🎯,Titel1,Besk1
Kat2,🎨,Titel2
Kat3,🎵,Titel3,Besk3`;
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 2);
    assertEqual(result[0].category, 'Kat1');
    assertEqual(result[1].category, 'Kat3');
})) passed++; else failed++;

if (test('handles empty lines between data rows', () => {
    const csv = `Kat1,🎯,Titel1,Besk1

Kat2,🎨,Titel2,Besk2`;
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 2);
})) passed++; else failed++;

if (test('handles Windows line endings (CRLF)', () => {
    const csv = 'Kat1,🎯,Titel1,Besk1\r\nKat2,🎨,Titel2,Besk2';
    const result = parseDelimitedText(csv);
    assertEqual(result.length, 2);
    assertEqual(result[1].description, 'Besk2');
})) passed++; else failed++;

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
    process.exit(1);
}
