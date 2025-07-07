import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class PromptEditor extends LitElement {
    static properties = {
        prompts: { type: Array },
        selectedPrompt: { type: Object },
        isEditing: { type: Boolean },
        isLoading: { type: Boolean },
        showImportExport: { type: Boolean }
    };

    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
        }

        .prompt-editor-container {
            display: flex;
            height: 100%;
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            overflow: hidden;
        }

        .sidebar {
            width: 300px;
            background: rgba(0, 0, 0, 0.3);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
        }

        .sidebar-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }

        .sidebar-actions {
            display: flex;
            gap: 8px;
        }

        .action-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .action-button:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }

        .prompt-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .prompt-item {
            padding: 12px;
            margin-bottom: 4px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }

        .prompt-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .prompt-item.selected {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.4);
        }

        .prompt-item.system {
            border-left: 3px solid rgba(34, 197, 94, 0.6);
        }

        .prompt-item.custom {
            border-left: 3px solid rgba(168, 85, 247, 0.6);
        }

        .prompt-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .prompt-description {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.3;
        }

        .prompt-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            margin-top: 4px;
        }

        .prompt-badge.system {
            background: rgba(34, 197, 94, 0.2);
            color: rgba(34, 197, 94, 1);
        }

        .prompt-badge.custom {
            background: rgba(168, 85, 247, 0.2);
            color: rgba(168, 85, 247, 1);
        }

        .editor-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .editor-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .editor-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .editor-actions {
            display: flex;
            gap: 8px;
        }

        .primary-button {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8));
            border: 1px solid rgba(59, 130, 246, 0.4);
            border-radius: 6px;
            color: white;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .primary-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .secondary-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            padding: 8px 16px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .secondary-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .danger-button {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: rgba(239, 68, 68, 1);
        }

        .danger-button:hover {
            background: rgba(239, 68, 68, 0.3);
        }

        .editor-content {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }

        .form-input {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            padding: 8px 12px;
            font-size: 13px;
            transition: all 0.2s ease;
        }

        .form-input:focus {
            outline: none;
            border-color: rgba(59, 130, 246, 0.6);
            background: rgba(255, 255, 255, 0.08);
        }

        .form-textarea {
            min-height: 120px;
            resize: vertical;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            line-height: 1.4;
        }

        .form-textarea.large {
            min-height: 200px;
        }

        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-state-title {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .empty-state-description {
            font-size: 14px;
            line-height: 1.4;
            max-width: 300px;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: rgba(255, 255, 255, 0.7);
        }

        .import-export-panel {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .import-export-dialog {
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
        }

        .dialog-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 20px;
        }
    `;

    constructor() {
        super();
        this.prompts = [];
        this.selectedPrompt = null;
        this.isEditing = false;
        this.isLoading = false;
        this.showImportExport = false;
        this.loadPrompts();
    }

    async loadPrompts() {
        this.isLoading = true;
        try {
            this.prompts = await window.electronAPI.invoke('prompts-get-all');
        } catch (error) {
            console.error('Error loading prompts:', error);
        }
        this.isLoading = false;
    }

    selectPrompt(prompt) {
        this.selectedPrompt = { ...prompt };
        this.isEditing = false;
    }

    startEditing() {
        this.isEditing = true;
    }

    cancelEditing() {
        if (this.selectedPrompt) {
            // Reload the original prompt data
            const original = this.prompts.find(p => p.id === this.selectedPrompt.id);
            this.selectedPrompt = { ...original };
        }
        this.isEditing = false;
    }

    async savePrompt() {
        if (!this.selectedPrompt) return;
        
        try {
            const result = await window.electronAPI.invoke('prompts-save', { 
                promptData: this.selectedPrompt 
            });
            
            // Update the prompts list
            const index = this.prompts.findIndex(p => p.id === result.id);
            if (index >= 0) {
                this.prompts[index] = result;
            } else {
                this.prompts.push(result);
            }
            
            this.selectedPrompt = result;
            this.isEditing = false;
            this.requestUpdate();
        } catch (error) {
            console.error('Error saving prompt:', error);
            alert('Error saving prompt: ' + error.message);
        }
    }

    async deletePrompt() {
        if (!this.selectedPrompt || !confirm('Are you sure you want to delete this prompt?')) return;
        
        try {
            await window.electronAPI.invoke('prompts-delete', { id: this.selectedPrompt.id });
            this.prompts = this.prompts.filter(p => p.id !== this.selectedPrompt.id);
            this.selectedPrompt = null;
            this.isEditing = false;
            this.requestUpdate();
        } catch (error) {
            console.error('Error deleting prompt:', error);
            alert('Error deleting prompt: ' + error.message);
        }
    }

    async resetPrompt() {
        if (!this.selectedPrompt || !confirm('Are you sure you want to reset this prompt to default?')) return;
        
        try {
            const result = await window.electronAPI.invoke('prompts-reset', { id: this.selectedPrompt.id });
            const index = this.prompts.findIndex(p => p.id === result.id);
            if (index >= 0) {
                this.prompts[index] = result;
            }
            this.selectedPrompt = result;
            this.isEditing = false;
            this.requestUpdate();
        } catch (error) {
            console.error('Error resetting prompt:', error);
            alert('Error resetting prompt: ' + error.message);
        }
    }

    async duplicatePrompt() {
        if (!this.selectedPrompt) return;
        
        try {
            const result = await window.electronAPI.invoke('prompts-duplicate', { id: this.selectedPrompt.id });
            this.prompts.push(result);
            this.selectedPrompt = result;
            this.isEditing = false;
            this.requestUpdate();
        } catch (error) {
            console.error('Error duplicating prompt:', error);
            alert('Error duplicating prompt: ' + error.message);
        }
    }

    createNewPrompt() {
        this.selectedPrompt = {
            id: null,
            name: 'New Prompt',
            description: 'Custom prompt template',
            intro: 'You are a helpful AI assistant.',
            formatRequirements: 'Provide clear and concise responses.',
            searchUsage: '',
            content: 'Help the user with their request.',
            outputInstructions: 'Format your response clearly.',
            isCustom: 1
        };
        this.isEditing = true;
    }

    async exportPrompts() {
        try {
            const result = await window.electronAPI.invoke('prompts-show-export-dialog');
            if (!result.canceled && result.filePath) {
                await window.electronAPI.invoke('prompts-export', { filePath: result.filePath });
                alert('Prompts exported successfully!');
            }
        } catch (error) {
            console.error('Error exporting prompts:', error);
            alert('Error exporting prompts: ' + error.message);
        }
    }

    async importPrompts() {
        try {
            const result = await window.electronAPI.invoke('prompts-show-import-dialog');
            if (!result.canceled && result.filePaths.length > 0) {
                const importResult = await window.electronAPI.invoke('prompts-import', { 
                    filePath: result.filePaths[0] 
                });
                
                if (importResult.errors.length > 0) {
                    alert(`Import completed with errors:\n${importResult.errors.map(e => e.error).join('\n')}`);
                } else {
                    alert(`Successfully imported ${importResult.imported.length} prompts!`);
                }
                
                await this.loadPrompts();
            }
        } catch (error) {
            console.error('Error importing prompts:', error);
            alert('Error importing prompts: ' + error.message);
        }
    }

    updateField(field, value) {
        if (this.selectedPrompt) {
            this.selectedPrompt = { ...this.selectedPrompt, [field]: value };
        }
    }

    render() {
        return html`
            <div class="prompt-editor-container">
                <div class="sidebar">
                    <div class="sidebar-header">
                        <h3 class="sidebar-title">Prompts</h3>
                        <div class="sidebar-actions">
                            <button class="action-button" @click=${this.createNewPrompt}>
                                + New
                            </button>
                            <button class="action-button" @click=${this.exportPrompts}>
                                Export
                            </button>
                            <button class="action-button" @click=${this.importPrompts}>
                                Import
                            </button>
                        </div>
                    </div>
                    
                    <div class="prompt-list">
                        ${this.isLoading ? html`
                            <div class="loading">Loading prompts...</div>
                        ` : this.prompts.map(prompt => html`
                            <div 
                                class="prompt-item ${prompt.isCustom ? 'custom' : 'system'} ${this.selectedPrompt?.id === prompt.id ? 'selected' : ''}"
                                @click=${() => this.selectPrompt(prompt)}
                            >
                                <div class="prompt-name">${prompt.name}</div>
                                <div class="prompt-description">${prompt.description}</div>
                                <div class="prompt-badge ${prompt.isCustom ? 'custom' : 'system'}">
                                    ${prompt.isCustom ? 'Custom' : 'System'}
                                </div>
                            </div>
                        `)}
                    </div>
                </div>

                <div class="editor-panel">
                    ${this.selectedPrompt ? html`
                        <div class="editor-header">
                            <h2 class="editor-title">${this.selectedPrompt.name}</h2>
                            <div class="editor-actions">
                                ${this.isEditing ? html`
                                    <button class="secondary-button" @click=${this.cancelEditing}>
                                        Cancel
                                    </button>
                                    <button class="primary-button" @click=${this.savePrompt}>
                                        Save
                                    </button>
                                ` : html`
                                    <button class="secondary-button" @click=${this.duplicatePrompt}>
                                        Duplicate
                                    </button>
                                    ${!this.selectedPrompt.isCustom ? html`
                                        <button class="secondary-button danger-button" @click=${this.resetPrompt}>
                                            Reset
                                        </button>
                                    ` : html`
                                        <button class="secondary-button danger-button" @click=${this.deletePrompt}>
                                            Delete
                                        </button>
                                    `}
                                    <button class="primary-button" @click=${this.startEditing}>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="editor-content">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input 
                                    class="form-input" 
                                    type="text" 
                                    .value=${this.selectedPrompt.name}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('name', e.target.value)}
                                />
                            </div>

                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <input 
                                    class="form-input" 
                                    type="text" 
                                    .value=${this.selectedPrompt.description}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('description', e.target.value)}
                                />
                            </div>

                            <div class="form-group">
                                <label class="form-label">Introduction</label>
                                <textarea 
                                    class="form-input form-textarea" 
                                    .value=${this.selectedPrompt.intro}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('intro', e.target.value)}
                                ></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Format Requirements</label>
                                <textarea 
                                    class="form-input form-textarea large" 
                                    .value=${this.selectedPrompt.formatRequirements}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('formatRequirements', e.target.value)}
                                ></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Search Usage</label>
                                <textarea 
                                    class="form-input form-textarea" 
                                    .value=${this.selectedPrompt.searchUsage}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('searchUsage', e.target.value)}
                                ></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Content</label>
                                <textarea 
                                    class="form-input form-textarea large" 
                                    .value=${this.selectedPrompt.content}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('content', e.target.value)}
                                ></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Output Instructions</label>
                                <textarea 
                                    class="form-input form-textarea" 
                                    .value=${this.selectedPrompt.outputInstructions}
                                    ?disabled=${!this.isEditing}
                                    @input=${(e) => this.updateField('outputInstructions', e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                    ` : html`
                        <div class="empty-state">
                            <div class="empty-state-icon">📝</div>
                            <div class="empty-state-title">No Prompt Selected</div>
                            <div class="empty-state-description">
                                Select a prompt from the sidebar to view and edit its configuration.
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}

customElements.define('prompt-editor', PromptEditor);
