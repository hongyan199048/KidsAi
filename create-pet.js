// 宠物选择页面逻辑
class PetSelector {
    constructor() {
        this.selectedPet = null;
        this.init();
    }

    async init() {
        // 等待服务加载
        await this.waitForServices();
        
        // 初始化背景音乐
        this.initBackgroundMusic();
        
        // 游客模式：不检查登录状态，允许所有用户访问
        console.log('🐾 欢迎选择你的宠物！（游客模式）');
        
        // 绑定事件
        this.bindEvents();
        
        // 默认选中第一个宠物
        this.selectFirstPet();
        
        console.log('✅ 宠物选择器初始化完成');
    }

    async waitForServices() {
        let attempts = 0;
        while ((!window.MagicPetAI || !window.MagicPetAPI) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.MagicPetAI || !window.MagicPetAPI) {
            console.error('服务加载失败');
        }
    }

    initBackgroundMusic() {
        const bgMusic = document.getElementById('bgMusic');
        if (!bgMusic) return;

        bgMusic.volume = 0.3;

        const playMusic = () => {
            bgMusic.play().catch(error => {
                console.log('背景音乐需要用户交互后才能播放');
            });
        };

        playMusic();

        document.addEventListener('click', () => playMusic(), { once: true });
        document.addEventListener('touchstart', () => playMusic(), { once: true });
    }

    async checkExistingPet() {
        try {
            // 检查用户是否已登录
            if (!window.MagicPetAPI || !window.MagicPetAPI.Auth) {
                console.error('MagicPetAPI 未加载');
                // 延迟跳转，给服务更多加载时间
                setTimeout(() => {
                    if (!window.MagicPetAPI || !window.MagicPetAPI.Auth) {
                        window.location.href = 'auth.html';
                    }
                }, 1000);
                return;
            }
            
            const user = await window.MagicPetAPI.Auth.getCurrentUser();
            console.log('当前用户:', user);
            
            if (!user) {
                // 未登录，延迟跳转以确保session已同步
                console.log('未检测到登录用户，延迟后再次检查...');
                
                // 等待1秒后再次检查
                await new Promise(resolve => setTimeout(resolve, 1000));
                const userRetry = await window.MagicPetAPI.Auth.getCurrentUser();
                
                if (!userRetry) {
                    console.log('确认未登录，跳转到登录页');
                    window.location.href = 'auth.html';
                }
                return;
            }

            console.log('用户已登录:', user.email);
            // 检查用户是否已有宠物（从数据库查询）
            // TODO: 实现查询逻辑
        } catch (error) {
            console.error('检查宠物状态失败:', error);
            // 不要立即跳转，可能是临时错误
            console.log('发生错误，但允许继续访问页面');
        }
    }

    bindEvents() {
        // 宠物卡片点击
        const petCards = document.querySelectorAll('.pet-card');
        petCards.forEach(card => {
            card.addEventListener('click', () => this.selectPet(card));
        });

        // 轮播按钮
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const carousel = document.getElementById('petsCarousel');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                carousel.scrollBy({ left: -220, behavior: 'smooth' });
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                carousel.scrollBy({ left: 220, behavior: 'smooth' });
            });
        }

        // 确认按钮
        const confirmButton = document.getElementById('confirmButton');
        if (confirmButton) {
            confirmButton.addEventListener('click', () => this.confirmSelection());
        }
        
        // 触摸滑动支持
        if (carousel) {
            let isDown = false;
            let startX;
            let scrollLeft;

            carousel.addEventListener('mousedown', (e) => {
                isDown = true;
                startX = e.pageX - carousel.offsetLeft;
                scrollLeft = carousel.scrollLeft;
            });

            carousel.addEventListener('mouseleave', () => {
                isDown = false;
            });

            carousel.addEventListener('mouseup', () => {
                isDown = false;
            });

            carousel.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - carousel.offsetLeft;
                const walk = (x - startX) * 2;
                carousel.scrollLeft = scrollLeft - walk;
            });
        }
    }

    selectFirstPet() {
        const firstCard = document.querySelector('.pet-card');
        if (firstCard) {
            this.selectPet(firstCard);
        }
    }

    selectPet(card) {
        // 移除所有选中状态
        document.querySelectorAll('.pet-card').forEach(c => {
            c.classList.remove('selected');
        });
        
        // 添加选中状态
        card.classList.add('selected');
        
        // 保存选中的宠物
        this.selectedPet = {
            type: card.dataset.pet,
            name: card.querySelector('.pet-name').textContent,
            icon: card.querySelector('.pet-icon').textContent
        };
        
        // 更新提示信息
        const selectedInfo = document.getElementById('selectedInfo');
        if (selectedInfo) {
            selectedInfo.classList.add('show-selected');
            selectedInfo.innerHTML = `<p>🎉 You selected <strong>${this.selectedPet.name}</strong>! Click "Choose This Pet" to continue.</p>`;
        }
        
        console.log('选中宠物:', this.selectedPet);
    }

    async confirmSelection() {
        if (!this.selectedPet) {
            alert('⚠️ Please select a pet first!');
            return;
        }

        // 显示加载状态
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.remove('hidden');

        try {
            // 保存宠物信息到数据库
            await this.savePetToDatabase();

            // 跳转到主页
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            console.error('保存宠物失败:', error);
            alert('❌ Failed to save pet. Please try again.');
            loadingOverlay.classList.add('hidden');
        }
    }

    async savePetToDatabase() {
        try {
            console.log('💾 开始保存宠物信息...');
            console.log('宠物数据:', this.selectedPet);
            
            // 保存到 localStorage，以便在主页面使用
            localStorage.setItem('selectedPet', JSON.stringify(this.selectedPet));
            
            // 验证保存是否成功
            const saved = localStorage.getItem('selectedPet');
            console.log('✅ localStorage 保存成功:', saved);
            
            const user = await window.MagicPetAPI.Auth.getCurrentUser();
            if (!user) {
                console.log('⚠️ 用户未登录，仅保存到本地');
                return;
            }

            // TODO: 保存宠物信息到 Supabase
            // 需要创建一个 pets 表
            console.log('📊 保存宠物信息到数据库:', {
                userId: user.id,
                petType: this.selectedPet.type,
                petName: this.selectedPet.name,
                petIcon: this.selectedPet.icon
            });
        } catch (error) {
            console.error('❌ 保存宠物失败:', error);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.petSelector = new PetSelector();
});
