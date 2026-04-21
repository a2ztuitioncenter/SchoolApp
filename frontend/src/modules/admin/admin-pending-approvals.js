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
        font-weight: 500;
        color: var(--text-main);
    }
`;
document.head.appendChild(styleSheet);

let pendingUsers = [];
let currentRejectingUserId = null;
let currentClassAssignmentUserId = null;
let availableClassLevels = [];

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

    // Setup class assignment modal handler
    const confirmClassAssignmentBtn = document.getElementById('confirm-class-assignment-btn');
    if (confirmClassAssignmentBtn) {
        confirmClassAssignmentBtn.addEventListener('click', async () => {
            const selectedClasses = Array.from(
                document.querySelectorAll('#class-checkboxes-container input[type="checkbox"]:checked')
            ).map(checkbox => checkbox.value);

            if (selectedClasses.length === 0) {
                alert('Please select at least one class');
                return;
            }

            await approveUserWithClasses(currentClassAssignmentUserId, selectedClasses);
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
            pendingUsers = response.data || [];

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
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${roleColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                            ${(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style="font-weight: 600;">${user.name || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.85rem;">
                        <div><i class="fas fa-envelope" style="width: 14px; opacity: 0.6;"></i> ${user.email || '-'}</div>
                        <div><i class="fas fa-phone" style="width: 14px; opacity: 0.6;"></i> ${user.phone || '-'}</div>
                    </div>
                </td>
                <td>
                    ${user.classLevel ? `
                        <div class="badge-green" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">
                            Class ${user.classLevel}${user.section ? ` - ${user.section}` : ''}
                        </div>
                    ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>'}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 500;">
                        <i class="${roleIcon}" style="color: ${roleColor};"></i>
                        ${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                    </div>
                </td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${createdDate}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-primary btn-sm" title="Approve" onclick="approveUserHandler(${user.id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm" title="Reject" onclick="showRejectModal(${user.id})" style="color: var(--danger);">
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
            <div class="card" style="padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            ${roleIcon}
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 1rem;">${user.name || 'N/A'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${user.role?.toUpperCase()}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${createdDate}</div>
                </div>
                
                <div style="display: grid; gap: 8px; margin-bottom: 1.25rem; font-size: 0.9rem;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <i class="fas fa-envelope" style="width: 16px; color: var(--accent-blue);"></i>
                        <span>${user.email || 'No email provided'}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <i class="fas fa-phone" style="width: 16px; color: var(--success);"></i>
                        <span>${user.phone || 'No phone provided'}</span>
                    </div>
                    ${user.classLevel ? `
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <i class="fas fa-graduation-cap" style="width: 16px; color: var(--accent-blue);"></i>
                        <span>Class ${user.classLevel} ${user.section ? `- ${user.section}` : ''}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="btn btn-primary" onclick="approveUserHandler(${user.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-secondary" onclick="showRejectModal(${user.id})" style="color: var(--danger);">
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
window.approveUserHandler = async function(userId) {
    const user = pendingUsers.find(u => u.id === userId);
    
    if (!user) {
        showMessage('User not found', 'error');
        return;
    }

    // For teacher/staff, show class assignment modal
    if (user.role === 'teacher' || user.role === 'staff') {
        await showClassAssignmentModal(userId);
    } else {
        // For student, simple approval
        if (!confirm('Are you sure you want to approve this user?')) {
            return;
        }
        await approveUser(userId);
    }
};

/**
 * Show class assignment modal for teacher/staff approval
 */
async function showClassAssignmentModal(userId) {
    currentClassAssignmentUserId = userId;

    // Use static class levels (consistent with the rest of the app)
    if (availableClassLevels.length === 0) {
        availableClassLevels = ['9', '10', '11', '12'];
    }

    // Populate checkboxes
    const container = document.getElementById('class-checkboxes-container');
    container.innerHTML = availableClassLevels.map(classLevel => `
        <div class="class-checkbox">
            <input type="checkbox" id="class-${classLevel}" value="${classLevel}">
            <label for="class-${classLevel}">Class ${classLevel}</label>
        </div>
    `).join('');

    // Show modal
    const modal = document.getElementById('class-assignment-modal');
    if (modal) modal.style.display = 'flex';
}

/**
 * Close class assignment modal
 */
window.closeClassAssignmentModal = function() {
    const modal = document.getElementById('class-assignment-modal');
    if (modal) modal.style.display = 'none';
    currentClassAssignmentUserId = null;
};

/**
 * Import apiCall if not already available
 */
let apiCall;
try {
    const apiModule = await import('../../core/api.js');
    apiCall = apiModule.apiCall;
} catch (e) {
    // Fallback - will use the one from API if needed
}

/**
 * Show rejection modal
 */
window.showRejectModal = function(userId) {
    currentRejectingUserId = userId;
    document.getElementById('rejection-reason').value = '';
    const modal = document.getElementById('reject-modal');
    if (modal) modal.style.display = 'flex';
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
 * Approve user with class assignments (teacher/staff)
 */
async function approveUserWithClasses(userId, classesAssigned) {
    try {
        window.closeClassAssignmentModal();

        const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
        const auth = authStr ? JSON.parse(authStr) : {};
        const token = auth.token;

        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://schoolapp-d9y5.onrender.com';

        // Make API call with class assignments
        const response = await fetch(`${baseUrl}/api/auth/admin/approve-user/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ classesAssigned })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(`✅ ${pendingUsers.find(u => u.id === userId)?.role || 'User'} approved with class assignments!`, 'success');
            
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
            showMessage(data.error || 'Failed to approve user', 'error');
        }
    } catch (error) {
        console.error('❌ Error approving user with classes:', error);
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
