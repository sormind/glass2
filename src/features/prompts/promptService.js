const { ipcMain } = require('electron');
const promptRepository = require('../../common/repositories/prompts');
const fs = require('fs').promises;
const path = require('path');

let isInitialized = false;

async function getAllPrompts() {
    try {
        return promptRepository.getAllPrompts();
    } catch (error) {
        console.error('[PromptService] Error getting all prompts:', error);
        throw error;
    }
}

async function getPrompt(id) {
    try {
        return promptRepository.getPrompt(id);
    } catch (error) {
        console.error('[PromptService] Error getting prompt:', error);
        throw error;
    }
}

async function savePrompt(promptData) {
    try {
        const result = promptRepository.savePrompt(promptData);
        console.log('[PromptService] Prompt saved:', result.id);
        return result;
    } catch (error) {
        console.error('[PromptService] Error saving prompt:', error);
        throw error;
    }
}

async function deletePrompt(id) {
    try {
        const result = promptRepository.deletePrompt(id);
        console.log('[PromptService] Prompt deleted:', id);
        return result;
    } catch (error) {
        console.error('[PromptService] Error deleting prompt:', error);
        throw error;
    }
}

async function resetPrompt(id) {
    try {
        const result = promptRepository.resetPrompt(id);
        console.log('[PromptService] Prompt reset:', id);
        return result;
    } catch (error) {
        console.error('[PromptService] Error resetting prompt:', error);
        throw error;
    }
}

async function exportPrompts(filePath) {
    try {
        const exportData = promptRepository.exportPrompts();
        await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
        console.log('[PromptService] Prompts exported to:', filePath);
        return { success: true, filePath };
    } catch (error) {
        console.error('[PromptService] Error exporting prompts:', error);
        throw error;
    }
}

async function importPrompts(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const importData = JSON.parse(fileContent);
        const result = promptRepository.importPrompts(importData);
        console.log('[PromptService] Prompts imported:', result);
        return result;
    } catch (error) {
        console.error('[PromptService] Error importing prompts:', error);
        throw error;
    }
}

async function duplicatePrompt(id) {
    try {
        const originalPrompt = await getPrompt(id);
        if (!originalPrompt) {
            throw new Error('Prompt not found');
        }
        
        const duplicatedPrompt = {
            ...originalPrompt,
            id: `${originalPrompt.id}_copy_${Date.now()}`,
            name: `${originalPrompt.name} (Copy)`,
            isCustom: 1
        };
        
        delete duplicatedPrompt.createdAt;
        delete duplicatedPrompt.updatedAt;
        
        return await savePrompt(duplicatedPrompt);
    } catch (error) {
        console.error('[PromptService] Error duplicating prompt:', error);
        throw error;
    }
}

function initialize() {
    if (isInitialized) return;
    
    console.log('[PromptService] 🚀 Initializing Prompt Service...');
    
    // IPC handlers for prompt management
    ipcMain.handle('prompts-get-all', async () => {
        return await getAllPrompts();
    });
    
    ipcMain.handle('prompts-get', async (event, { id }) => {
        return await getPrompt(id);
    });
    
    ipcMain.handle('prompts-save', async (event, { promptData }) => {
        return await savePrompt(promptData);
    });
    
    ipcMain.handle('prompts-delete', async (event, { id }) => {
        return await deletePrompt(id);
    });
    
    ipcMain.handle('prompts-reset', async (event, { id }) => {
        return await resetPrompt(id);
    });
    
    ipcMain.handle('prompts-duplicate', async (event, { id }) => {
        return await duplicatePrompt(id);
    });
    
    ipcMain.handle('prompts-export', async (event, { filePath }) => {
        return await exportPrompts(filePath);
    });
    
    ipcMain.handle('prompts-import', async (event, { filePath }) => {
        return await importPrompts(filePath);
    });
    
    // File dialog handlers
    ipcMain.handle('prompts-show-export-dialog', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showSaveDialog({
            title: 'Export Prompts',
            defaultPath: `prompts-export-${new Date().toISOString().split('T')[0]}.json`,
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ]
        });
        return result;
    });
    
    ipcMain.handle('prompts-show-import-dialog', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({
            title: 'Import Prompts',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            properties: ['openFile']
        });
        return result;
    });
    
    isInitialized = true;
    console.log('[PromptService] ✅ Prompt Service initialized');
}

module.exports = {
    initialize,
    getAllPrompts,
    getPrompt,
    savePrompt,
    deletePrompt,
    resetPrompt,
    exportPrompts,
    importPrompts,
    duplicatePrompt
};
