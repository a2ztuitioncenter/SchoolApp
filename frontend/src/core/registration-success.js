/**
 * Unified Registration Success Modal
 * Provides a premium, consistent feedback experience across all entry points.
 */
export class RegistrationSuccessModal {
    constructor() {
        this.modalId = 'unifiedRegistrationSuccessModal';
        this.init();
    }

    init() {
        if (document.getElementById(this.modalId)) return;

        const modalHtml = `
            <div id="${this.modalId}" class="success-modal-overlay" style="display: none;">
                <div class="success-modal-content">
                    <div class="success-icon-wrapper">
                        <div class="success-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <h2 id="success-modal-title">Registration Successful!</h2>
                    <p id="success-modal-message">Your account has been created and is now awaiting administrator approval.</p>
                    
                    <div class="success-details">
                        <div class="detail-item">
                            <span class="detail-label">Username</span>
                            <span class="detail-value" id="success-modal-username">-</span>
                        </div>
                        <div class="detail-item" id="success-modal-roll-wrapper" style="display: none;">
                            <span class="detail-label">Roll Number</span>
                            <span class="detail-value" id="success-modal-roll">-</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status</span>
                            <span class="status-badge pending">Pending Approval</span>
                        </div>
                    </div>

                    <div class="success-info-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <p>You will be able to log in once an administrator approves your account. This usually takes 12-24 hours.</p>
                    </div>

                    <button class="success-modal-btn" onclick="document.getElementById('${this.modalId}').style.display='none'">
                        Got it, thanks!
                    </button>
                </div>
            </div>
        `;

        const styleHtml = `
            <style>
                .success-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease-out;
                }
                .success-modal-content {
                    background: white;
                    border-radius: 24px;
                    padding: 40px;
                    width: 90%;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                    animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .success-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    background: #ecfdf5;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0 auto 24px;
                }
                .success-icon {
                    width: 40px;
                    height: 40px;
                    color: #10b981;
                    animation: scaleCheck 0.5s 0.2s both;
                }
                .success-modal-content h2 {
                    margin: 0 0 12px;
                    color: #111827;
                    font-size: 1.5rem;
                }
                .success-modal-content p {
                    color: #6b7280;
                    margin: 0 0 24px;
                    line-height: 1.5;
                }
                .success-details {
                    background: #f9fafb;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    text-align: left;
                }
                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                }
                .detail-item:last-child { border-bottom: none; }
                .detail-label { color: #6b7280; font-size: 0.9rem; }
                .detail-value { color: #111827; font-weight: 600; font-family: monospace; }
                
                .status-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .status-badge.pending {
                    background: #fef3c7;
                    color: #92400e;
                }
                
                .success-info-box {
                    display: flex;
                    gap: 12px;
                    background: #eff6ff;
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 32px;
                    text-align: left;
                }
                .info-icon { width: 20px; height: 20px; color: #3b82f6; flex-shrink: 0; }
                .success-info-box p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: #1e40af;
                    line-height: 1.4;
                }
                
                .success-modal-btn {
                    width: 100%;
                    padding: 14px;
                    background: #111827;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .success-modal-btn:hover { background: #1f2937; transform: translateY(-1px); }
                .success-modal-btn:active { transform: translateY(0); }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes scaleCheck {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); opacity: 1; }
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', styleHtml + modalHtml);
    }

    show(data) {
        const { username, rollNumber, message, title, showNote = true } = data;
        
        const modal = document.getElementById(this.modalId);
        const titleEl = document.getElementById('success-modal-title');
        const messageEl = document.getElementById('success-modal-message');
        const usernameEl = document.getElementById('success-modal-username');
        const rollEl = document.getElementById('success-modal-roll');
        const rollWrapper = document.getElementById('success-modal-roll-wrapper');
        const infoBox = modal.querySelector('.success-info-box');

        if (title) titleEl.textContent = title;
        if (message) messageEl.textContent = message;
        if (username) usernameEl.textContent = username;
        
        if (rollNumber) {
            rollEl.textContent = rollNumber;
            rollWrapper.style.display = 'flex';
        } else {
            rollWrapper.style.display = 'none';
        }

        if (infoBox) {
            infoBox.style.display = showNote ? 'flex' : 'none';
        }

        modal.style.display = 'flex';
    }
}

// Global instance
window.registrationSuccessModal = new RegistrationSuccessModal();
