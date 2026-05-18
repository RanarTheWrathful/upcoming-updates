const leoProfanity = require("leo-profanity");
const fuzzball = require("fuzzball");

leoProfanity.loadDictionary();
leoProfanity.remove(["god", "crap"]); // Customize allowed words

const extraBlacklist = ["badword", "worseword"];

function normalizeText(text) {
    const map = {
        '@': 'a', '4': 'a',
        '1': 'i', '!': 'i',
        '$': 's', '5': 's',
        '0': 'o'
    };

    let normalized = "";
    let mapping = [];

    for (let i = 0; i < text.length; i++) {
        let originalChar = text[i];
        let normalizedChar = map[originalChar.toLowerCase()] || originalChar;

        normalized += normalizedChar;
        mapping.push(originalChar); // Store original character
    }

    return { normalized, mapping };
}

function restoreOriginalText(censoredText, mapping) {
    let restored = "";

    for (let i = 0, j = 0; i < mapping.length; i++) {
        if (censoredText[j] === "*") {
            restored += "*"; // Preserve censorship
        } else {
            restored += mapping[i]; // Restore original character
        }
        j++; // Move to next character in censored text
    }

    return restored;
}

function cleanText(text) {
    let { normalized, mapping } = normalizeText(text);

    // Apply fuzzy matching
    for (const word of extraBlacklist) {
        if (fuzzball.ratio(normalized, word) > 80) {
            normalized = normalized.replace(new RegExp(word, "gi"), "*".repeat(word.length));
        }
    }

    // Apply leo-profanity filtering
    let censoredText = leoProfanity.clean(normalized);

    // Restore original non-censored characters
    return restoreOriginalText(censoredText, mapping);
}

// Export the function using CommonJS
module.exports = { cleanText };

