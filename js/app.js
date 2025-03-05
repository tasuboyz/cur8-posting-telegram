import { initializeImageUpload } from './api/image-upload.js';
import { handleSignersLogin } from './pages/loginPage.js';
import { appState } from './core/AppState.js';
import appInitializerInstance from './core/AppInitializer.js';
import { EventManager } from './core/EventManager.js';
import { languageManager } from './i18n/languageManager.js';
import { LanguageSelector } from './components/languageSelector.js';
import { displayResult } from './components/dialog.js';

class App {
    constructor() {
        this.eventManager = new EventManager();
        this.languageSelector = null; // Add this line
    }

    async initialize() {
        let url_string = window.location.href
        let questionMarkCount = 0;
        let modified_url = url_string.replace(/\?/g, function (match) {
            questionMarkCount++;
            return questionMarkCount === 2 ? '&' : match;
        });
        const url = new URL(modified_url);
        const params = new URLSearchParams(url.search);
        let platform = params.get('platform');
        const token = params.get('access_token');
        const username = params.get('username');

        window.location.hash = '/';

        appState.router.handleRoute();
        this.eventManager.initializeEventListeners();
        initializeImageUpload();

        if (!token || token === 'null') {
            await appInitializerInstance.initializeApp();
        }
        else {
            await handleSignersLogin(platform, token, username);
        }

        this.eventManager.initializeInputValidation();
        window.addEventListener('hashchange', () => appState.router.handleRoute());
    }
}

// Modify the DOMContentLoaded listener to store app instance
document.addEventListener('DOMContentLoaded', async () => {
    addTranslationAttributes();
    const app = new App();
    window.app = app; // Make app globally accessible
    initializeLanguage();
    await app.initialize().then(() => {
        console.log('App initialized');
    });
});

function initializeLanguage() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        window.app.languageSelector = new LanguageSelector(languageSelect); // Store the instance
    }

    languageManager.updatePageText();
}

// Add data-i18n attributes to elements
function addTranslationAttributes() {
    // Navigation
    document.querySelector('#draftBtn span').setAttribute('data-i18n', 'nav_drafts');
    document.querySelector('#postBtn span').setAttribute('data-i18n', 'nav_publish');
    document.querySelector('#accountBtn span').setAttribute('data-i18n', 'nav_account');
    document.querySelector('#configBtn span').setAttribute('data-i18n', 'nav_settings');

    // Input placeholders
    document.getElementById('postTitle').setAttribute('data-i18n', 'post_title_placeholder');
    document.getElementById('postBody').setAttribute('data-i18n', 'post_body_placeholder');
    document.getElementById('postTags').setAttribute('data-i18n', 'post_tags_placeholder');

    // Buttons
    document.getElementById('postToSteem').setAttribute('data-i18n', 'post_publish_now');
    document.getElementById('salvaBozza').setAttribute('data-i18n', 'post_save_draft');

    document.getElementById('postTags').addEventListener('input', function (e) {
        const input = e.target;
        const tags = input.value.split(/[\s,]+/).filter(tag => tag.length > 0);

        if (tags.length > 8) {
            input.value = tags.slice(0, 8).join(' ');
            displayResult({
                error: 'Maximum 8 tags allowed'
             }, 'error', true);
        }
    });

}