const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { profilePrompts } = require('../../prompts/promptTemplates');

let db;

function initializeDatabase() {
    if (db) return db;
    
    const dbPath = path.join(app.getPath('userData'), 'prompts.db');
    db = new Database(dbPath);
    
    // Create prompts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            intro TEXT NOT NULL,
            formatRequirements TEXT NOT NULL,
            searchUsage TEXT NOT NULL,
            content TEXT NOT NULL,
            outputInstructions TEXT NOT NULL,
            isCustom INTEGER DEFAULT 1,
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Initialize with default prompts if table is empty
    const count = db.prepare('SELECT COUNT(*) as count FROM prompts').get();
    if (count.count === 0) {
        initializeDefaultPrompts();
    }
    
    return db;
}

function initializeDefaultPrompts() {
    const insertStmt = db.prepare(`
        INSERT INTO prompts (id, name, description, intro, formatRequirements, searchUsage, content, outputInstructions, isCustom)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    
    Object.entries(profilePrompts).forEach(([key, prompt]) => {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const description = getPromptDescription(key);
        
        insertStmt.run(
            key,
            name,
            description,
            prompt.intro,
            prompt.formatRequirements,
            prompt.searchUsage || '',
            prompt.content,
            prompt.outputInstructions,
            0 // isCustom = false for default prompts
        );
    });
}

function getPromptDescription(key) {
    const descriptions = {
        interview: 'Live meeting co-pilot for interviews and conversations',
        pickle_glass: 'General purpose AI assistant with decision hierarchy',
        sales: 'Sales call assistant for prospect interactions',
        presentation: 'Presentation coach for public speaking events',
        pickle_glass_analysis: 'Advanced conversation analysis and insights'
    };
    return descriptions[key] || 'Custom prompt template';
}

function getAllPrompts() {
    initializeDatabase();
    return db.prepare('SELECT * FROM prompts ORDER BY isCustom ASC, name ASC').all();
}

function getPrompt(id) {
    initializeDatabase();
    return db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
}

function savePrompt(promptData) {
    initializeDatabase();
    
    const { id, name, description, intro, formatRequirements, searchUsage, content, outputInstructions, isCustom = 1 } = promptData;
    
    if (id && getPrompt(id)) {
        // Update existing prompt
        const updateStmt = db.prepare(`
            UPDATE prompts 
            SET name = ?, description = ?, intro = ?, formatRequirements = ?, 
                searchUsage = ?, content = ?, outputInstructions = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        updateStmt.run(name, description, intro, formatRequirements, searchUsage, content, outputInstructions, id);
        return { id, ...promptData };
    } else {
        // Create new prompt
        const newId = id || `custom_${Date.now()}`;
        const insertStmt = db.prepare(`
            INSERT INTO prompts (id, name, description, intro, formatRequirements, searchUsage, content, outputInstructions, isCustom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(newId, name, description, intro, formatRequirements, searchUsage, content, outputInstructions, isCustom);
        return { id: newId, ...promptData };
    }
}

function deletePrompt(id) {
    initializeDatabase();
    const prompt = getPrompt(id);
    if (!prompt) return false;
    
    // Don't allow deletion of default prompts
    if (!prompt.isCustom) {
        throw new Error('Cannot delete default system prompts');
    }
    
    const deleteStmt = db.prepare('DELETE FROM prompts WHERE id = ? AND isCustom = 1');
    const result = deleteStmt.run(id);
    return result.changes > 0;
}

function resetPrompt(id) {
    initializeDatabase();
    const prompt = getPrompt(id);
    if (!prompt || prompt.isCustom) {
        throw new Error('Can only reset default system prompts');
    }
    
    // Get original prompt from templates
    const originalPrompt = profilePrompts[id];
    if (!originalPrompt) {
        throw new Error('Original prompt template not found');
    }
    
    const updateStmt = db.prepare(`
        UPDATE prompts 
        SET intro = ?, formatRequirements = ?, searchUsage = ?, content = ?, outputInstructions = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    
    updateStmt.run(
        originalPrompt.intro,
        originalPrompt.formatRequirements,
        originalPrompt.searchUsage || '',
        originalPrompt.content,
        originalPrompt.outputInstructions,
        id
    );
    
    return getPrompt(id);
}

function exportPrompts() {
    initializeDatabase();
    const prompts = getAllPrompts();
    return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        prompts: prompts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            intro: p.intro,
            formatRequirements: p.formatRequirements,
            searchUsage: p.searchUsage,
            content: p.content,
            outputInstructions: p.outputInstructions,
            isCustom: p.isCustom
        }))
    };
}

function importPrompts(importData) {
    initializeDatabase();
    
    if (!importData.prompts || !Array.isArray(importData.prompts)) {
        throw new Error('Invalid import data format');
    }
    
    const imported = [];
    const errors = [];
    
    importData.prompts.forEach(promptData => {
        try {
            // Only import custom prompts to avoid overwriting system defaults
            if (promptData.isCustom) {
                const result = savePrompt(promptData);
                imported.push(result);
            }
        } catch (error) {
            errors.push({ prompt: promptData.name, error: error.message });
        }
    });
    
    return { imported, errors };
}

module.exports = {
    getAllPrompts,
    getPrompt,
    savePrompt,
    deletePrompt,
    resetPrompt,
    exportPrompts,
    importPrompts
};
