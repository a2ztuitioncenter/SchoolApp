import { authAPI } from './api.js';

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

        const formData = {
            name: document.getElementById('name-input').value.trim(),
            phone: document.getElementById('phone-input').value.trim(),
            password: document.getElementById('password-input').value,
            classLevel: document.getElementById('class-input').value
        };

        try {
            const response = await authAPI.register(formData);

            if (response.success) {
                successMessage.textContent = 'Account created successfully! Redirecting to login...';
                successMessage.style.display = 'block';
                registerForm.reset();

                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = '/student-login.html';
                }, 2000);
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
