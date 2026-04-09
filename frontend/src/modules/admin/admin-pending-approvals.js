import { authAPI, adminAPI } from '../../core/api.js';

let pendingUsers = [];
let currentRejectingUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Initializing Pending Approvals...');
    
    // Check if admin is logged in
    const adminUserId = sessionStorage.getItem('adminUserId');
    if (!adminUserId) {
        window.location.href = '/admin-login.html';
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
 * Render pending users as cards
 */
function renderPendingUsers() {
    const listContainer = document.getElementById('pending-users-list');
    
    listContainer.innerHTML = pendingUsers.map(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const roleLower = (user.role || '').toLowerCase();
        const roleBadgeClass = roleLower === 'teacher' ? 'teacher' : 'student';

        return `
            <div class="approval-card" data-user-id="${user.id}">
                <div class="approval-info">
                    <div class="approval-name">${user.name || 'N/A'}</div>
                    <div class="approval-detail">
                        <i class="fa fa-envelope"></i> ${user.email || 'N/A'}
                    </div>
                    <div class="approval-detail">
                        <i class="fa fa-phone"></i> ${user.phone || 'N/A'}
                    </div>
                </div>
                <div class="approval-info">
                    <div class="approval-detail">
                        <span class="role-badge ${roleBadgeClass}">
                            ${roleLower === 'teacher' ? '👨‍🏫' : '👤'} ${user.role || 'Unknown'}
                        </span>
                    </div>
                    <div class="approval-detail">
                        <span class="status-badge">🕐 ${createdDate}</span>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-approve" onclick="approveUserHandler(${user.id})">
                        <i class="fa fa-check"></i> Approve
                    </button>
                    <button class="btn btn-reject" onclick="showRejectModal(${user.id})">
                        <i class="fa fa-times"></i> Reject
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
    
    listContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class="fa fa-check-circle"></i>
            </div>
            <h3>No Pending Approvals</h3>
            <p>All new registrations have been reviewed!</p>
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
