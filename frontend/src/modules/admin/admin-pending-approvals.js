import { authAPI, adminAPI } from '../../core/api.js';
import { getAuth } from '../../core/auth-manager.js';
import { escapeHtml, escapeAttr as escapeAttrValue } from '../../core/sanitize.js';

// Add styles for approval cards
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .approval-card-modern:hover {
        box-shadow: 0 8px 16px rgba(0,0,0,0.12) !important;
        border-color: var(--accent-blue) !important;
        transform: translateY(-2px);
    }
    
    .approval-btn-approve:hover {
        background: linear-gradient(135deg, #00c853 0%, #00a74a 100%) !important;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
    }
    
    .approval-btn-approve:active {
        transform: scale(0.98);
    }
    
    .approval-btn-reject:hover {
        background: rgba(239, 68, 68, 0.12) !important;
        border-color: #dc2626 !important;
    }
    
    .approval-btn-reject:active {
        transform: scale(0.98);
    }

    .class-checkbox {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .class-checkbox:hover {
        background: var(--bg-primary);
        border-color: #667eea;
    }

    .class-checkbox input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }

    .class-checkbox label {
        flex: 1;
        margin: 0;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--text-main);
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(styleSheet);

let pendingUsers = [];
let currentRejectingUserId = null;
let currentClassAssignmentUserId = null;
let availableClassLevels = [];
const activeRequests = new Set(); // Guard against duplicate requests


/**
 * Initialize Pending Approvals Tab
 * Called by admin-dashboard.js or DOMContentLoaded
 */
export async function initPendingApprovalsTab() {
    const auth = getAuth();
    if (!auth || auth.role !== 'admin') return;

    console.log('🔄 Initializing Pending Approvals...');
    
    // Fetch pending users
    await fetchPendingUsers();

    // 🛠️ Initialize Event Listeners (only once)
    const container = document.getElementById('pending-approvals');
    if (container && !container.dataset.listenersInitialized) {
        setupEventListeners();
        container.dataset.listenersInitialized = 'true';
    }
}

/**
 * Setup static event listeners for modals
 */
function setupEventListeners() {
    try {
        const confirmRejectBtn = document.getElementById('confirm-reject-btn');
        if (confirmRejectBtn) {
            confirmRejectBtn.addEventListener('click', async () => {
                const reason = document.getElementById('rejection-reason').value;
                const userId = confirmRejectBtn.getAttribute('data-user-id');
                if (userId && !activeRequests.has(userId)) {
                    await rejectUser(userId, reason);
                }
            });
        }

        const confirmClassAssignmentBtn = document.getElementById('confirm-class-assignment-btn');
        if (confirmClassAssignmentBtn) {
            confirmClassAssignmentBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const userId = currentClassAssignmentUserId;
                if (!userId || activeRequests.has(String(userId))) return;

                const selectedClasses = Array.from(document.querySelectorAll('#class-checkboxes-container input[type="checkbox"]:checked'))
                    .map(cb => cb.value);

                if (selectedClasses.length === 0) {
                    showMessage('Please select at least one class', 'error');
                    return;
                }

                await approveUserWithClasses(String(userId), selectedClasses, confirmClassAssignmentBtn);
            });
        }
    } catch (error) {
        console.error('Error initializing pending approvals listeners:', error);
    }
}

// 🛑 DOM GUARD: Auto-initialize if on the right page
if (document.getElementById('admin-dashboard-root')) {
    document.addEventListener('DOMContentLoaded', () => {
        initPendingApprovalsTab();
    });
}

/**
 * Fetch all pending users from backend
 */
async function fetchPendingUsers() {
    const listContainer = document.getElementById('pending-users-list');

    try {
        console.log('📋 Fetching pending users...');
        const response = await adminAPI.getPendingUsers();

        console.log('📦 Response:', response);

        if (response && response.success) {
            pendingUsers = response.data || [];

            if (pendingUsers.length === 0) {
                renderEmptyState();
                console.log('[APPROVALS] No pending users found');
            } else {
                renderPendingUsers();
                console.log(`[APPROVALS] Loaded ${pendingUsers.length} pending users`);
            }
        } else if (response) {
            const errorMsg = response.error || 'Failed to fetch pending users';
            showMessage(errorMsg, 'error');
            console.error('[APPROVALS] ' + errorMsg);
            listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;"><p>${escapeHtml(errorMsg)}</p></div>`;
        } else {
            showMessage('Invalid response from server', 'error');
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #d32f2f;"><p>Invalid response from server</p></div>';
        }
    } catch (error) {
        console.error('[APPROVALS] Error fetching pending users:', error);
        const errorMsg = 'Error loading pending users: ' + error.message;
        showMessage(errorMsg, 'error');
        listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;"><p>${escapeHtml(errorMsg)}</p><p style="font-size: 0.9em; margin-top: 10px;">Make sure the backend server is running.</p></div>`;
    }
}

/**
 * Render pending users with a dual-view system: 
 * Table for desktop (seamless design) and cards for mobile
 */
function renderPendingUsers() {
    const listContainer = document.getElementById('pending-users-list');
    const mobileContainer = document.getElementById('pending-users-mobile-list');
    const tableElement = document.getElementById('pending-users-table')?.closest('.table-container');

    if (!listContainer || !mobileContainer) return;

    // Handle responsive visibility
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        if (tableElement) tableElement.style.display = 'none';
        mobileContainer.style.display = 'grid';
        mobileContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
        mobileContainer.style.gap = '1rem';
    } else {
        if (tableElement) tableElement.style.display = 'block';
        mobileContainer.style.display = 'none';
    }

    // Render Table Body
    listContainer.innerHTML = pendingUsers.map(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const roleLower = (user.role || '').toLowerCase();
        const roleIcon = roleLower === 'teacher' ? 'fas fa-chalkboard-teacher' : 'fas fa-user-graduate';
        const roleColor = roleLower === 'teacher' ? 'var(--accent-blue)' : 'var(--success)';

        return `
            <tr data-user-id="${escapeAttrValue(String(user.id))}">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${roleColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                            ${escapeHtml((user.name || '?').charAt(0).toUpperCase())}
                        </div>
                        <div style="font-weight: 600;">${escapeHtml(user.name || 'N/A')}</div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.85rem;">
                        <div><i class="fas fa-envelope" style="width: 14px; opacity: 0.6;"></i> ${escapeHtml(user.email || '-')}</div>
                        <div><i class="fas fa-phone" style="width: 14px; opacity: 0.6;"></i> ${escapeHtml(user.phone || '-')}</div>
                    </div>
                </td>
                <td>
                    ${user.classLevel ? `
                        <div class="badge-green" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">
                            Class ${escapeHtml(user.classLevel)}${user.section ? ` - ${escapeHtml(user.section)}` : ''}
                        </div>
                    ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>'}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 500;">
                        <i class="${roleIcon}" style="color: ${roleColor};"></i>
                        ${user.role ? escapeHtml(user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User'}
                    </div>
                </td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${createdDate}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-primary btn-sm" title="Approve" onclick="approveUserHandler(event, ${escapeAttrValue(String(user.id))})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm" title="Reject" onclick="showRejectModal(${escapeAttrValue(String(user.id))})" style="color: var(--danger);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Render Mobile Cards
    mobileContainer.innerHTML = pendingUsers.map(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const roleLower = (user.role || '').toLowerCase();
        const roleIcon = roleLower === 'teacher' ? '👨‍🏫' : '👤';

        return `
            <div class="card user-card" data-user-id="${escapeAttrValue(String(user.id))}" style="padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            ${roleIcon}
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 1rem;">${escapeHtml(user.name || 'N/A')}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(user.role?.toUpperCase() || '')}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${createdDate}</div>
                </div>
                
                <div style="display: grid; gap: 8px; margin-bottom: 1.25rem; font-size: 0.9rem;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <i class="fas fa-envelope" style="width: 16px; color: var(--accent-blue);"></i>
                        <span>${escapeHtml(user.email || 'No email provided')}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <i class="fas fa-phone" style="width: 16px; color: var(--success);"></i>
                        <span>${escapeHtml(user.phone || 'No phone provided')}</span>
                    </div>
                    ${user.classLevel ? `
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <i class="fas fa-graduation-cap" style="width: 16px; color: var(--accent-blue);"></i>
                        <span>Class ${escapeHtml(user.classLevel)} ${user.section ? `- ${escapeHtml(user.section)}` : ''}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="btn btn-primary" onclick="approveUserHandler(event, ${escapeAttrValue(String(user.id))})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-secondary" onclick="showRejectModal(${escapeAttrValue(String(user.id))})" style="color: var(--danger);">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Handle window resize to switch between table and card view
 */
window.addEventListener('resize', () => {
    if (pendingUsers.length > 0) {
        renderPendingUsers();
    }
});

/**
 * Render empty state
 */
function renderEmptyState() {
    const listContainer = document.getElementById('pending-users-list');
    const mobileContainer = document.getElementById('pending-users-mobile-list');
    const tableElement = document.getElementById('pending-users-table')?.closest('.table-container');

    const emptyHtml = `
        <div style="text-align: center; padding: 4rem 2rem; width: 100%;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2rem; color: var(--success);">
                <i class="fas fa-check"></i>
            </div>
            <h3 style="margin-bottom: 0.5rem; font-weight: 700;">All Caught Up!</h3>
            <p style="color: var(--text-muted);">No pending registration approvals at the moment.</p>
        </div>
    `;

    if (listContainer) {
        listContainer.innerHTML = `<tr><td colspan="6">${emptyHtml}</td></tr>`;
    }

    if (mobileContainer) {
        mobileContainer.innerHTML = emptyHtml;
        mobileContainer.style.display = 'block';
    }

    if (tableElement && window.innerWidth > 768) {
        tableElement.style.display = 'block';
    } else if (tableElement) {
        tableElement.style.display = 'none';
    }
}

/**
 * Approve user handler
 */
window.approveUserHandler = async function (event, userId) {
    const id = Number(userId);
    const userIdStr = String(userId);
    
    // 🛡️ Request Guard
    if (activeRequests.has(userIdStr)) {
        console.warn(`[APPROVAL] Request already in progress for User ID: ${userIdStr}`);
        return;
    }

    const user = pendingUsers.find(u => u.id === id);
    const btn = event.currentTarget || event.target.closest('button');

    if (!user) {
        showMessage('User not found', 'error');
        return;
    }

    console.log(`[APPROVAL] Handler triggered for User ID: ${id}, Role: ${user.role}`);

    // For teacher/staff, show class assignment modal
    const roleLower = (user.role || '').toLowerCase();
    if (roleLower === 'teacher' || roleLower === 'staff') {
        await showClassAssignmentModal(userId);
    } else {
        // For student, simple approval
        if (!confirm('Are you sure you want to approve this user?')) {
            return;
        }
        
        activeRequests.add(userIdStr);
        try {
            await approveUser(id, btn);
        } finally {
            activeRequests.delete(userIdStr);
        }
    }
};

/**
 * Show class assignment modal for teacher/staff approval
 */
async function showClassAssignmentModal(userId) {
    currentClassAssignmentUserId = Number(userId);

    // Use static class levels
    if (availableClassLevels.length === 0) {
        availableClassLevels = ['7', '8', '9', '10', '11', '12'];
    }

    // Populate checkboxes
    const container = document.getElementById('class-checkboxes-container');
    if (container) {
        container.innerHTML = availableClassLevels.map(classLevel => `
            <div class="class-checkbox">
                <input type="checkbox" id="class-${classLevel}" value="${classLevel}">
                <label for="class-${classLevel}">Class ${classLevel}</label>
            </div>
        `).join('');
    }

    // Show modal and overlay
    const modal = document.getElementById('class-assignment-modal');
    const overlay = document.getElementById('classAssignmentDrawerOverlay');
    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

/**
 * Close class assignment modal
 */
window.closeClassAssignmentModal = function () {
    const modal = document.getElementById('class-assignment-modal');
    const overlay = document.getElementById('classAssignmentDrawerOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    currentClassAssignmentUserId = null;
};


/**
 * Show rejection modal
 */
window.showRejectModal = function (userId) {
    currentRejectingUserId = Number(userId);
    document.getElementById('rejection-reason').value = '';
    const confirmRejectBtn = document.getElementById('confirm-reject-btn');
    if (confirmRejectBtn) confirmRejectBtn.setAttribute('data-user-id', userId);
    
    const modal = document.getElementById('reject-modal');
    if (modal) {
        modal.classList.add('active');
        const overlay = document.getElementById('rejectDrawerOverlay');
        if (overlay) overlay.classList.add('active');
    }
};

/**
 * Close rejection modal
 */
window.closeRejectModal = function () {
    const modal = document.getElementById('reject-modal');
    const overlay = document.getElementById('rejectDrawerOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    const reasonInput = document.getElementById('rejection-reason');
    if (reasonInput) reasonInput.value = '';
    currentRejectingUserId = null;
};

/**
 * Approve user from backend
 */
async function approveUser(userId, triggerButton = null) {
    if (triggerButton) setButtonLoading(triggerButton, true);

    try {
        console.log(`[APPROVAL] API Call: Approving User ID: ${userId}...`);
        const response = await adminAPI.approveUser(userId);
        console.log('[APPROVAL] API Response:', response);

        if (response.success) {
            const userName = response.user?.name || 'User';
            handleSuccess(userId, `✅ User ${userName} approved successfully!`);
        } else {
            showMessage(response.error || 'Failed to approve user', 'error');
        }
    } catch (error) {
        console.error('[APPROVALS] Error approving user:', error);
        showMessage('Error approving user: ' + error.message, 'error');
    } finally {
        if (triggerButton) setButtonLoading(triggerButton, false);
    }
}

/**
 * Approve user with class assignments (teacher/staff)
 */
async function approveUserWithClasses(userId, classesAssigned, triggerButton = null) {
    const userIdStr = String(userId);
    if (activeRequests.has(userIdStr)) return;
    
    activeRequests.add(userIdStr);
    if (triggerButton) setButtonLoading(triggerButton, true);

    try {
        console.log(`[APPROVAL] API Call: Approving Teacher/Staff ID: ${userId} with classes:`, classesAssigned);
        const data = await adminAPI.approveUser(userId, { classesAssigned });
        console.log('[APPROVAL] API Response:', data);

        if (data.success) {
            handleSuccess(userId, `✅ ${pendingUsers.find(u => u.id === Number(userId))?.role || 'User'} approved with class assignments!`);
        } else {
            showMessage(data.error || 'Failed to approve user', 'error');
        }
    } catch (error) {
        console.error('[APPROVALS] Error approving user with classes:', error);
        showMessage('Error approving user: ' + error.message, 'error');
    } finally {
        activeRequests.delete(userIdStr);
        if (triggerButton) setButtonLoading(triggerButton, false);
    }
}

/**
 * Reject user from backend
 */
async function rejectUser(userId, reason) {
    const userIdStr = String(userId);
    if (activeRequests.has(userIdStr)) return;

    activeRequests.add(userIdStr);
    const confirmBtn = document.getElementById('confirm-reject-btn');
    if (confirmBtn) setButtonLoading(confirmBtn, true);

    try {
        console.log(`[APPROVAL] API Call: Rejecting User ID: ${userId}, Reason: ${reason}`);
        const response = await adminAPI.rejectUser(userId, reason);
        console.log('[APPROVAL] API Response:', response);

        if (response.success) {
            const userName = response.user?.name || 'User';
            handleSuccess(userId, `❌ User ${userName} rejected successfully!`);
        } else {
            showMessage(response.error || 'Failed to reject user', 'error');
        }
    } catch (error) {
        console.error('[APPROVALS] Error rejecting user:', error);
        showMessage('Error rejecting user: ' + error.message, 'error');
    } finally {
        activeRequests.delete(userIdStr);
        if (confirmBtn) setButtonLoading(confirmBtn, false);
    }
}

/**
 * Show message to user
 */
function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) {
        console.warn('⚠️ Message container not found');
        alert(message);
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.padding = '15px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.marginBottom = '15px';
    messageDiv.style.animation = 'fadeIn 0.3s ease-out';
    
    if (type === 'error') {
        messageDiv.style.backgroundColor = '#ffebee';
        messageDiv.style.color = '#d32f2f';
        messageDiv.style.border = '1px solid #ef5350';
    } else {
        messageDiv.style.backgroundColor = '#e8f5e9';
        messageDiv.style.color = '#388e3c';
        messageDiv.style.border = '1px solid #66bb6a';
    }

    // Clear previous messages
    container.innerHTML = '';
    container.appendChild(messageDiv);

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.5s';
            setTimeout(() => messageDiv.remove(), 500);
        }, 5000);
    }
}

/**
 * Helper to set loading state on buttons
 */
function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalHtml = button.innerHTML;
        const text = button.innerText.trim();
        button.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${text || '...'}`;
    } else {
        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
        }
    }
}

/**
 * Shared helper to handle successful approval/rejection
 */
function handleSuccess(userId, message) {
    // Definitively close any open modals and overlays to prevent UI freeze
    window.closeClassAssignmentModal();
    window.closeRejectModal();

    // Standardized success message
    showMessage(message, 'success');

    // Remove the user card from UI with a smooth transition
    const elements = document.querySelectorAll(`[data-user-id="${userId}"]`);
    elements.forEach(el => {
        el.style.transition = 'all 0.4s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => {
            el.remove();
            // After removal, check if we need to show empty state
            if (document.querySelectorAll('#pending-users-list tr[data-user-id]').length === 0 &&
                document.querySelectorAll('#pending-users-mobile-list .user-card').length === 0) {
                renderEmptyState();
            }
        }, 400);
    });

    // Update local state
    pendingUsers = pendingUsers.filter(u => u.id !== Number(userId));

    console.log(`User ${userId} processed successfully.`);
}

// Make functions globally available
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.showMessage = showMessage;
window.fetchPendingUsers = fetchPendingUsers;
