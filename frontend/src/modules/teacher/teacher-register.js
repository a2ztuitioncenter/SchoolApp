import { authAPI } from '../../core/api.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const registerBtn = document.getElementById('register-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI state: loading
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        const password = document.getElementById('password-input').value;
        const confirmPassword = document.getElementById('confirm-password-input').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match. Please try again.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
            return;
        }

        const formData = {
            name: document.getElementById('name-input').value.trim(),
            email: document.getElementById('email-input').value.trim(),
            phone: document.getElementById('phone-input').value.trim(),
            password: password,
            confirmPassword: confirmPassword
        };

        try {
            const response = await authAPI.teacherRegister(formData);

            if (response.success) {
                successMessage.textContent = '✅ Account created successfully! Awaiting admin approval. You will be able to login once approved. Redirecting...';
                successMessage.style.display = 'block';
                registerForm.reset();

                // Redirect to home after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            } else {
                errorMessage.textContent = response.error || 'Registration failed. Please try again.';
                errorMessage.style.display = 'block';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Sign Up';
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'An error occurred during registration.';
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
        }
    });
});
