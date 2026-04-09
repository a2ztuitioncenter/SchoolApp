import { authAPI, adminAPI } from '../../core/api.js';
import { getAuth } from '../../core/auth-manager.js';

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
`;
document.head.appendChild(styleSheet);

let pendingUsers = [];
let currentRejectingUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Initializing Pending Approvals...');
    
    // Check if admin is logged in (use auth-manager)
    const auth = getAuth();
    if (!auth || auth.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    // Fetch pending users
    fetchPendingUsers();

    // Setup rejection modal handlers
    const confirmRejectBtn = document.getElementById('confirm-reject-btn');
    if (confirmRejectBtn) {
        confirmRejectBtn.addEventListener('click', async () => {
            const reason = document.getElementById('rejection-reason').value;
            await rejectUser(currentRejectingUserId, reason);
        });
    }
});

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
            pendingUsers = response.users || [];

            if (pendingUsers.length === 0) {
                renderEmptyState();
                console.log('✅ No pending users found');
            } else {
                renderPendingUsers();
                console.log(`✅ Loaded ${pendingUsers.length} pending users`);
            }
        } else if (response) {
            const errorMsg = response.error || 'Failed to fetch pending users';
            showMessage(errorMsg, 'error');
            console.error('❌ ' + errorMsg);
            listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;"><p>${errorMsg}</p></div>`;
        } else {
            showMessage('Invalid response from server', 'error');
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #d32f2f;"><p>Invalid response from server</p></div>';
        }
    } catch (error) {
        console.error('❌ Error fetching pending users:', error);
        const errorMsg = 'Error loading pending users: ' + error.message;
        showMessage(errorMsg, 'error');
        listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;"><p>${errorMsg}</p><p style="font-size: 0.9em; margin-top: 10px;">Make sure the backend server is running.</p></div>`;
    }
}

/**
 * Render pending users as beautiful cards
 */
function renderPendingUsers() {
    const listContainer = document.getElementById('pending-users-list');
    
    listContainer.style.display = 'grid';
    listContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(340px, 1fr))';
    listContainer.style.gap = '20px';
    listContainer.style.padding = '0';
    
    listContainer.innerHTML = pendingUsers.map(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const roleLower = (user.role || '').toLowerCase();
        const initials = (user.name || user.phone || '?').charAt(0).toUpperCase();
        const roleIcon = roleLower === 'teacher' ? '👨‍🏫' : '👤';
        const roleColor = roleLower === 'teacher' ? '#667eea' : '#3b82f6';

        return `
            <div class="approval-card-modern" data-user-id="${user.id}" style="
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 20px;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                gap: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            ">
                <!-- Header with Avatar and Basic Info -->
                <div style="display: flex; align-items: center; gap: 16px;">
                    <!-- Avatar -->
                    <div style="
                        width: 56px;
                        height: 56px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 700;
                        font-size: 24px;
                        flex-shrink: 0;
                    ">${initials}</div>
                    
                    <!-- Name and Role -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-size: 15px;
                            font-weight: 700;
                            color: var(--text-main);
                            margin-bottom: 4px;
                            word-break: break-word;
                        ">${user.name || 'N/A'}</div>
                        <div style="
                            font-size: 13px;
                            color: var(--text-muted);
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <span>${roleIcon}</span>
                            <span style="font-weight: 600; color: ${roleColor};">${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Info -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${user.email ? `
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted);">
                        <i class="fas fa-envelope" style="color: var(--accent-blue); width: 16px; text-align: center;"></i>
                        <span style="word-break: break-all;">${user.email}</span>
                    </div>
                    ` : ''}
                    ${user.phone ? `
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted);">
                        <i class="fas fa-phone" style="color: var(--accent-green); width: 16px; text-align: center;"></i>
                        <span>${user.phone}</span>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Class Info (if student) -->
                ${user.classLevel ? `
                <div style="
                    padding: 10px 12px;
                    background: rgba(99, 102, 241, 0.08);
                    border-left: 3px solid #667eea;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #667eea;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-graduation-cap"></i>
                    <span>Class: ${user.classLevel}${user.section ? ` - Section ${user.section}` : ''}</span>
                </div>
                ` : ''}
                
                <!-- Date -->
                <div style="
                    font-size: 12px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    <i class="fas fa-calendar-alt" style="width: 14px; text-align: center;"></i>
                    <span>Applied on ${createdDate}</span>
                </div>
                
                <!-- Action Buttons -->
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-top: 8px;
                ">
                    <button class="approval-btn-approve" onclick="approveUserHandler(${user.id})" style="
                        padding: 10px 16px;
                        border: none;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                        color: white;
                        font-weight: 600;
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        transition: all 0.2s ease;
                    ">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="approval-btn-reject" onclick="showRejectModal(${user.id})" style="
                        padding: 10px 16px;
                        border: 1px solid #ef4444;
                        border-radius: 8px;
                        background: rgba(239, 68, 68, 0.05);
                        color: #ef4444;
                        font-weight: 600;
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        transition: all 0.2s ease;
                    ">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render empty state when no pending users
 */
function renderEmptyState() {
    const listContainer = document.getElementById('pending-users-list');
    
    listContainer.style.display = 'flex';
    listContainer.style.alignItems = 'center';
    listContainer.style.justifyContent = 'center';
    listContainer.style.minHeight = '300px';
    listContainer.style.padding = '0';
    
    listContainer.innerHTML = `
        <div style="
            text-align: center;
            padding: 60px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        ">
            <div style="
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
            ">
                ✓
            </div>
            <div>
                <h3 style="
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-main);
                ">All Caught Up!</h3>
                <p style="
                    margin: 0;
                    font-size: 14px;
                    color: var(--text-muted);
                    max-width: 300px;
                ">No pending approvals right now. All new registrations have been reviewed.</p>
            </div>
        </div>
    `;
}

/**
 * Approve user handler
 */
window.approveUserHandler = async function(userId) {
    if (!confirm('Are you sure you want to approve this user?')) {
        return;
    }

    await approveUser(userId);
};

/**
 * Show rejection modal
 */
window.showRejectModal = function(userId) {
    currentRejectingUserId = userId;
    document.getElementById('rejection-reason').value = '';
    const modal = document.getElementById('reject-modal');
    if (modal) modal.style.display = 'block';
};

/**
 * Close rejection modal
 */
window.closeRejectModal = function() {
    const modal = document.getElementById('reject-modal');
    if (modal) modal.style.display = 'none';
    currentRejectingUserId = null;
};

/**
 * Approve user from backend
 */
async function approveUser(userId) {
    try {
        const response = await adminAPI.approveUser(userId);

        if (response.success) {
            showMessage(`✅ User ${response.user.name} approved successfully!`, 'success');
            
            // Remove the card from UI
            const card = document.querySelector(`[data-user-id="${userId}"]`);
            if (card) {
                card.style.transition = 'opacity 0.3s';
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }

            // Check if no more pending users
            pendingUsers = pendingUsers.filter(u => u.id !== userId);
            if (pendingUsers.length === 0) {
                setTimeout(() => {
                    renderEmptyState();
                }, 500);
            }
        } else {
            showMessage(response.error || 'Failed to approve user', 'error');
        }
    } catch (error) {
        console.error('❌ Error approving user:', error);
        showMessage('Error approving user: ' + error.message, 'error');
    }
}

/**
 * Reject user from backend
 */
async function rejectUser(userId, reason) {
    try {
        const response = await adminAPI.rejectUser(userId, reason);

        if (response.success) {
            showMessage(`❌ User ${response.user.name} rejected successfully!`, 'success');
            
            // Close modal
            window.closeRejectModal();
            
            // Remove the card from UI
            const card = document.querySelector(`[data-user-id="${userId}"]`);
            if (card) {
                card.style.transition = 'opacity 0.3s';
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }

            // Check if no more pending users
            pendingUsers = pendingUsers.filter(u => u.id !== userId);
            if (pendingUsers.length === 0) {
                setTimeout(() => {
                    renderEmptyState();
                }, 500);
            }
        } else {
            showMessage(response.error || 'Failed to reject user', 'error');
        }
    } catch (error) {
        console.error('❌ Error rejecting user:', error);
        showMessage('Error rejecting user: ' + error.message, 'error');
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
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Make functions globally available
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.showMessage = showMessage;
window.fetchPendingUsers = fetchPendingUsers;
