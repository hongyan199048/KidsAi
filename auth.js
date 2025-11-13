// 认证页面逻辑
class AuthManager {
    constructor() {
        this.loginForm = null;
        this.signupForm = null;
        this.init();
    }

    async init() {
        // 等待 Supabase 加载
        await this.waitForSupabase();
        
        // 检查是否已登录
        await this.checkExistingSession();
        
        // 绑定事件
        this.bindEvents();
        
        console.log('✅ 认证管理器初始化完成');
    }

    async waitForSupabase() {
        let attempts = 0;
        while (!window.MagicPetAPI && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    async checkExistingSession() {
        try {
            const user = await window.MagicPetAPI.Auth.getCurrentUser();
            if (user) {
                // 已登录，跳转到宠物生成页
                this.showMessage('Already logged in! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'create-pet.html';
                }, 1000);
            }
        } catch (error) {
            console.log('未登录');
        }
    }

    bindEvents() {
        // 表单切换
        const showSignupBtn = document.getElementById('showSignup');
        const showLoginBtn = document.getElementById('showLogin');
        
        if (showSignupBtn) {
            showSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchForm('signup');
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchForm('login');
            });
        }

        // 登录按钮
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.handleLogin());
        }

        // 注册按钮
        const signupButton = document.getElementById('signupButton');
        if (signupButton) {
            signupButton.addEventListener('click', () => this.handleSignup());
        }

        // 回车提交
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const loginForm = document.getElementById('loginForm');
                const signupForm = document.getElementById('signupForm');
                
                if (loginForm && !loginForm.classList.contains('hidden')) {
                    this.handleLogin();
                } else if (signupForm && !signupForm.classList.contains('hidden')) {
                    this.handleSignup();
                }
            }
        });
    }

    switchForm(formType) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (formType === 'signup') {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        } else {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }
        
        this.hideMessage();
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // 验证输入
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (!password) {
            this.showMessage('Please enter your password', 'error');
            return;
        }

        // 显示加载状态
        this.showLoading(true);
        this.hideMessage();

        try {
            const result = await window.MagicPetAPI.Auth.signIn(email, password);
            
            if (result.success) {
                this.showMessage('✅ Login successful! Redirecting...', 'success');
                
                // 登录成功后跳转到学习页面
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                this.showMessage(`❌ Login failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('登录错误:', error);
            this.showMessage('❌ An error occurred. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup() {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

        // 验证输入
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        // 显示加载状态
        this.showLoading(true);
        this.hideMessage();

        try {
            const result = await window.MagicPetAPI.Auth.signUp(email, password);
            
            if (result.success) {
                this.showMessage(
                    '✅ Account created! Please check your email to verify your account.',
                    'success'
                );
                
                // 延迟切换到登录表单
                setTimeout(() => {
                    this.switchForm('login');
                    this.showMessage('Please sign in with your new account', 'info');
                }, 3000);
            } else {
                this.showMessage(`❌ Sign up failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('注册错误:', error);
            this.showMessage('❌ An error occurred. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.className = `auth-message ${type}`;
            messageEl.classList.remove('hidden');
        }
    }

    hideMessage() {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.classList.add('hidden');
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('authLoading');
        const loginBtn = document.getElementById('loginButton');
        const signupBtn = document.getElementById('signupButton');
        
        if (loadingEl) {
            if (show) {
                loadingEl.classList.remove('hidden');
            } else {
                loadingEl.classList.add('hidden');
            }
        }

        // 禁用按钮
        if (loginBtn) loginBtn.disabled = show;
        if (signupBtn) signupBtn.disabled = show;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
