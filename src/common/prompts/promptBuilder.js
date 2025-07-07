const { profilePrompts } = require('./promptTemplates.js');
const promptRepository = require('../repositories/prompts');

function buildSystemPrompt(promptParts, customPrompt = '', googleSearchEnabled = true) {
    const sections = [promptParts.intro, '\n\n', promptParts.formatRequirements];

    if (googleSearchEnabled) {
        sections.push('\n\n', promptParts.searchUsage);
    }

    sections.push('\n\n', promptParts.content, '\n\nUser-provided context\n-----\n', customPrompt, '\n-----\n\n', promptParts.outputInstructions);

    return sections.join('');
}

async function getSystemPrompt(profile, customPrompt = '', googleSearchEnabled = true) {
    try {
        // Try to get prompt from database first
        const dbPrompt = await promptRepository.getPrompt(profile);
        if (dbPrompt) {
            return buildSystemPrompt(dbPrompt, customPrompt, googleSearchEnabled);
        }
    } catch (error) {
        console.warn('Failed to load prompt from database, falling back to static templates:', error);
    }
    
    // Fallback to static templates
    const promptParts = profilePrompts[profile] || profilePrompts.interview;
    return buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled);
}

// Synchronous version for backward compatibility
function getSystemPromptSync(profile, customPrompt = '', googleSearchEnabled = true) {
    const promptParts = profilePrompts[profile] || profilePrompts.interview;
    return buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled);
}

module.exports = {
    getSystemPrompt,
    getSystemPromptSync,
};
