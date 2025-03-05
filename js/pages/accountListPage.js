import { displayResult } from '../components/dialog.js';
import { applySavedTheme } from '../components/theme.js';
import { setUsernameForImageUpload } from '../api/image-upload.js';
import { getUserDrafts } from './draftPage.js';
import { ApiClient } from '../api/api-client.js';
import  appInitializerInstance  from '../core/AppInitializer.js';
import { t } from '../i18n/translationService.js';
import { Url_parameters } from '../services/parameters.js';

export class AccountManager {
    constructor(apiClient = new ApiClient()) {
        this.apiClient = apiClient;
    }

    platform_logo() {
        const url = Url_parameters()
        const params = new URLSearchParams(url.search);
        const platform = params.get('platform');
        const logo = document.getElementById('platformLogo');
    
        if (platform === 'STEEM') {
            logo.src = 'assets/logo_steem.png'; // Percorso del logo per STEEM
        } 
        else if (platform === 'HIVE') {
            logo.src = 'assets/logo_hive.png'; // Percorso del logo per HIVE
        } else {
            logo.src = 'assets/logo_tra.png'; // Percorso del logo di default
        }
    }

    createAccountListItem(username) {
        const li = document.createElement('li');
        li.appendChild(this.createContainer(username));
        document.getElementById('accountList').appendChild(li);

        const url = Url_parameters()
        const params = new URLSearchParams(url.search);
        const platform = params.get('platform')
        if (!platform) {
            platform = localStorage.getItem('platform');
            window.location.search = `platform=${platform}`
        }
    }

    createContainer(username) {
        const container = document.createElement('div');
        container.classList.add('container-username');
        container.appendChild(this.createImageNameContainer(username));
        container.appendChild(this.createButtonsContainer(username));

        container.onclick = () => {
            this.selectAccount(username, container);
        };
        
        return container;
    }

    createImageNameContainer(username) {
        const imgNameContainer = document.createElement('div');
        imgNameContainer.style.display = 'flex';
        imgNameContainer.style.flexDirection = 'row';
        imgNameContainer.style.alignItems = 'center';

        const img = this.createProfileImage(username);
        const spanUsername = this.createUsernameElement(username);

        imgNameContainer.appendChild(img);
        imgNameContainer.appendChild(spanUsername);
        return imgNameContainer;
    }

    createProfileImage(username) {
        const img = document.createElement('img');
        img.alt = `${username.username}'s profile image`;
        img.classList.add('profile-image-thumbnail');
        img.src = username.profile_image || 'https://fonts.gstatic.com/s/i/materialiconsoutlined/account_circle/v6/24px.svg';
        return img;
    }

    createUsernameElement(username) {
        const span = document.createElement('span');
        span.innerText = username.username;
        span.classList.add('usernameElement');
        return span;
    }

    createButtonsContainer(username) {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'row';
        buttonsContainer.style.flexWrap = 'nowrap';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.alignItems = 'baseline';

        const logoutButton = this.createLogoutButton(username);
        buttonsContainer.appendChild(logoutButton);
        return buttonsContainer;
    }

    createLogoutButton(username) {
        const logoutButton = document.createElement('button');
        logoutButton.classList.add('action-btn');
        logoutButton.innerText = 'Logout';
        logoutButton.onclick = () => this.handleLogout(username.username);
        return logoutButton;
    }

    selectAccount(username, containerElement) {
        window.usernameSelected = username;
        document.querySelectorAll('.container-username').forEach(el => el.classList.remove('selected'));
        containerElement.classList.add('selected');

        displayResult({ message: `${t('account_selected')} ${username.username}` }, 'success');
        getUserDrafts();
        applySavedTheme();
        setUsernameForImageUpload(username.username, localStorage.getItem('idTelegram'));
    }

    async handleLogout(username) {
        const dialog = this.createLogoutDialog();
        document.body.appendChild(dialog);
        dialog.showModal();

        const confirmButton = dialog.querySelector('#confirmButtonLogout');
        const cancelButton = dialog.querySelector('#cancelButtonLogout');
        
        const closeDialog = () => dialog.remove();
        const handleConfirmLogout = async () => {
            closeDialog();
            await this.performLogout(username);
        };

        confirmButton.addEventListener('click', handleConfirmLogout);
        cancelButton.addEventListener('click', closeDialog);
        dialog.addEventListener('close', closeDialog);        
    }

    createLogoutDialog() {
        const dialog = document.createElement('dialog');
        dialog.classList.add('dialog');
        dialog.innerHTML = `
            <h2>${t('confirm_logout')}</h2>
            <p>${t('logout_question')}</p>
            <button id="confirmButtonLogout" class="action-btn">${t('dialog_confirm')}</button>
            <button id="cancelButtonLogout" class="action-btn">${t('dialog_cancel')}</button>
        `;
        return dialog;
    }

    async performLogout(username) {
        try {
            const id = localStorage.getItem('idTelegram');
            //starta lo spinner
            document.getElementById('spinner').classList.remove('hide');
            await this.apiClient.logout(id, username);
            await this.handlePostLogout(id).then(() => {
                document.getElementById('spinner').classList.add('hide');
                //svuoti il campo usernameSelected e l'altro campo
                
            });
            displayResult({ message: `${t('logout_successful')}` }, 'success');
        } catch (error) {
            console.error('Error in handleLogout:', error);
            displayResult({ error: error.message }, 'error');
        }
    }

    async handlePostLogout(id) {
        try {
            const result = await this.apiClient.checkLogin(id);
            if (!result.usernames) {
                document.getElementById('draftBtn').disabled = true;
                document.getElementById('postBtn').disabled = true;
                document.getElementById('accountBtn').disabled = true;
                document.getElementById('configBtn').disabled = true;
                window.location.reload(); 
                return;
            }
            appInitializerInstance.setUsernames(result.usernames);
            appInitializerInstance.initializeEnd(result);
        } catch (error) {
            console.error('Error in handlePostLogout:', error);
            displayResult({ error: error.message }, 'error');
            appInitializerInstance.initializeApp();
        } finally {
            document.getElementById('spinner').classList.add('hide');
        }
    }

    async handleCreateAccount() {
        const dialog = this.createAccountDialog();
        document.body.appendChild(dialog);
        dialog.showModal();
    }

    createAccountDialog() {
        const dialog = document.createElement('dialog');
        dialog.classList.add('dialog', 'create-account-dialog');
        
        dialog.innerHTML = `
            <div class="create-account-container">
                <h2>${t('create_account')}</h2>
                <form id="accountCreationForm">
                    <div class="form-group">
                        <label for="newAccountName">${t('account_name')}:</label>
                        <input type="text" id="newAccountName" required 
                               placeholder="${t('enter_account_name')}"
                               pattern="[a-z0-9\\.-]+" 
                               title="${t('account_name_requirements')}" />
                    </div>
                    <div class="buttons-container">
                        <button type="submit" class="action-btn" id="createAccountBtn">${t('create_account')}</button>
                        <button type="button" class="action-btn" id="cancelCreateAccountBtn">${t('dialog_cancel')}</button>
                    </div>
                </form>
                
                <div class="loading hide" id="accountCreationLoading">
                    <div class="spinner-border"></div>
                    <p>${t('creating_account')}</p>
                </div>
                
                <div class="error hide" id="accountCreationError"></div>
                
                <div class="keys-container hide" id="keysContainer">
                    <h3>${t('account_created_success')}</h3>
                    <p>${t('account_name')}: <code id="createdAccountName"></code></p>
                    <div id="keysContent"></div>
                    <button id="downloadPdfBtn" class="action-btn">${t('download_pdf')}</button>
                </div>
            </div>
        `;

        // Add event listeners
        const form = dialog.querySelector('#accountCreationForm');
        const cancelBtn = dialog.querySelector('#cancelCreateAccountBtn');
        
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
        });
        
        dialog.addEventListener('close', () => {
            dialog.remove();
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.performAccountCreation(dialog);
        });
        
        return dialog;
    }

    async performAccountCreation(dialog) {
        const accountName = dialog.querySelector('#newAccountName').value.toLowerCase();
        const loading = dialog.querySelector('#accountCreationLoading');
        const error = dialog.querySelector('#accountCreationError');
        const keysContainer = dialog.querySelector('#keysContainer');
        const form = dialog.querySelector('#accountCreationForm');
        const downloadPdfBtn = dialog.querySelector('#downloadPdfBtn');
        
        error.classList.add('hide');
        keysContainer.classList.add('hide');
        loading.classList.remove('hide');
        
        try {
            // Check if account exists
            const accountExists = await this.apiClient.checkAccountExists(accountName);
            if (accountExists) {
                throw new Error(t('account_name_exists'));
            }
            
            const response = await fetch('https://imridd.eu.pythonanywhere.com/api/steem/create_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'API-Key': 'your_secret_api_key'
                },
                body: JSON.stringify({
                    new_account_name: accountName
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.keys) {
                // Hide the form after successful creation
                form.classList.add('hide');
                
                const keysContent = dialog.querySelector('#keysContent');
                dialog.querySelector('#createdAccountName').textContent = accountName;
                keysContent.innerHTML = `
                    <p>${result.message}</p>
                    <p><strong>${t('keys')}:</strong></p>
                    <p>${t('active_key')}: <code class="copyable">${result.keys.active_key}</code></p>
                    <p>${t('master_key')}: <code class="copyable">${result.keys.master_key}</code></p>
                    <p>${t('memo_key')}: <code class="copyable">${result.keys.memo_key}</code></p>
                    <p>${t('owner_key')}: <code class="copyable">${result.keys.owner_key}</code></p>
                    <p>${t('posting_key')}: <code class="copyable">${result.keys.posting_key}</code></p>
                `;
                keysContainer.classList.remove('hide');
                downloadPdfBtn.classList.remove('hide');
                
                dialog.accountData = {
                    accountName: accountName,
                    keys: result.keys,
                    message: result.message
                };
                
                // Add copy functionality to key codes
                dialog.querySelectorAll('.copyable').forEach(codeElement => {
                    codeElement.addEventListener('click', function() {
                        const textToCopy = this.textContent;
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            displayResult({ message: t('copied_to_clipboard') }, 'success');
                        });
                    });
                    codeElement.title = t('click_to_copy');
                    codeElement.style.cursor = 'pointer';
                });
                
                // Add PDF download functionality
                downloadPdfBtn.addEventListener('click', () => {
                    this.downloadAccountPDF(dialog.accountData);
                });
            } else {
                throw new Error(result.message || t('failed_create_account'));
            }
        } catch (err) {
            error.textContent = err.message;
            error.classList.remove('hide');
        } finally {
            loading.classList.add('hide');
        }
    }
    
    downloadAccountPDF(accountData) {
        if (!window.jspdf) {
            // Load jsPDF if not already loaded
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => this.generatePDF(accountData);
            document.body.appendChild(script);
        } else {
            this.generatePDF(accountData);
        }
    }
    
    generatePDF(data) {
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Steem Account Details', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Account Name: ${data.accountName}`, 20, 40);
        doc.text('Keys:', 20, 55);
        doc.text(`Active Key: ${data.keys.active_key}`, 20, 70);
        doc.text(`Master Key: ${data.keys.master_key}`, 20, 85);
        doc.text(`Memo Key: ${data.keys.memo_key}`, 20, 100);
        doc.text(`Owner Key: ${data.keys.owner_key}`, 20, 115);
        doc.text(`Posting Key: ${data.keys.posting_key}`, 20, 130);
        
        doc.save(`steem-account-${data.accountName}.pdf`);
    }
}

