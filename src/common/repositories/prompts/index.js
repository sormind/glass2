const sqliteRepository = require('./sqlite.repository');

// This repository is not user-specific, so we always return sqlite.
function getRepository() {
    return sqliteRepository;
}

module.exports = {
    getAllPrompts: (...args) => getRepository().getAllPrompts(...args),
    getPrompt: (...args) => getRepository().getPrompt(...args),
    savePrompt: (...args) => getRepository().savePrompt(...args),
    deletePrompt: (...args) => getRepository().deletePrompt(...args),
    resetPrompt: (...args) => getRepository().resetPrompt(...args),
    exportPrompts: (...args) => getRepository().exportPrompts(...args),
    importPrompts: (...args) => getRepository().importPrompts(...args),
};
