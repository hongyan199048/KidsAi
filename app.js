// Magic Pet Island 应用逻辑
class MagicPetApp {
    constructor() {
        this.currentWord = '';
        this.score = 0;
        this.wordsLearned = [];
        this.isListening = false;
        this.feedCount = 0; // 添加喂食计数
        this.petUpgraded = false; // 宠物是否已升级
        this.init();
    }

    async init() {
        // 等待服务初始化
        await this.waitForServices();
        
        // 初始化背景音乐
        this.initBackgroundMusic();
        
        // 加载宠物图片
        this.loadPetImage();
        
        // 从 localStorage 读取喂食进度
        this.loadFeedProgress();
        
        // 检查登录状态
        await this.checkAuth();
        
        // 绑定事件
        this.bindEvents();
        
        // 加载初始单词
        this.loadNextWord();
        
        console.log('✅ 应用初始化完成');
    }

    async checkAuth() {
        try {
            if (window.MagicPetAPI) {
                const user = await window.MagicPetAPI.Auth.getCurrentUser();
                if (user) {
                    console.log('✅ 用户已登录:', user.email);
                    this.showWelcomeMessage(user.email);
                } else {
                    console.log('ℹ️ 游客模式');
                }
            }
        } catch (error) {
            console.log('认证检查失败:', error);
        }
    }

    showWelcomeMessage(email) {
        const title = document.querySelector('.learning-title');
        if (title) {
            const username = email.split('@')[0];
            title.textContent = `Welcome ${username}! Ready to learn?`;
            
            setTimeout(() => {
                this.loadNextWord();
            }, 2000);
        }
    }

    async waitForServices() {
        // 等待所有服务加载完成
        let attempts = 0;
        while ((!window.MagicPetAI || !window.MagicPetAPI) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    initBackgroundMusic() {
        const bgMusic = document.getElementById('bgMusic');
        if (!bgMusic) return;

        // 设置音量（较低，不干扰语音识别）
        bgMusic.volume = 0.3;

        // 处理浏览器自动播放限制
        const playMusic = () => {
            bgMusic.play().catch(error => {
                console.log('背景音乐需要用户交互后才能播放');
            });
        };

        // 尝试自动播放
        playMusic();

        // 如果自动播放失败，在第一次用户交互时播放
        const startMusicOnInteraction = () => {
            playMusic();
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
        };

        document.addEventListener('click', startMusicOnInteraction, { once: true });
        document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
    }

    loadPetImage() {
        // 从 localStorage 读取选中的宠物
        const selectedPet = localStorage.getItem('selectedPet');
        const petImage = document.querySelector('.pet-image');
        
        console.log('🐾 加载宠物图片...');
        console.log('localStorage 中的宠物数据:', selectedPet);
        
        if (selectedPet && petImage) {
            try {
                const pet = JSON.parse(selectedPet);
                this.currentPet = pet; // 保存当前宠物信息
                
                console.log('✅ 解析宠物数据成功:', pet);
                
                // 更新宠物显示：使用 emoji 作为图片
                petImage.textContent = pet.icon;
                petImage.style.fontSize = '120px';
                petImage.style.display = 'flex';
                petImage.style.alignItems = 'center';
                petImage.style.justifyContent = 'center';
                petImage.title = `Click to hear the word! (${pet.name})`;
                
                console.log('✅ 宠物加载完成:', pet.name, pet.icon);
            } catch (error) {
                console.error('❌ 加载宠物信息失败:', error);
                this.setDefaultPet(petImage);
            }
        } else if (petImage) {
            console.log('⚠️ 未找到已选宠物，使用默认宠物');
            this.setDefaultPet(petImage);
        } else {
            console.error('❌ 未找到 .pet-image 元素！');
        }
    }

    setDefaultPet(petImage) {
        // 设置默认宠物（小恐龙）
        this.currentPet = { type: 'dinosaur', name: 'Dino', icon: '🦕' };
        petImage.textContent = '🦕';
        petImage.style.fontSize = '120px';
        petImage.style.display = 'flex';
        petImage.style.alignItems = 'center';
        petImage.style.justifyContent = 'center';
        petImage.title = 'Click to hear the word! (Dino)';
        console.log('🦕 使用默认宠物');
    }

    loadFeedProgress() {
        // 读取喂食进度
        const savedProgress = localStorage.getItem('feedProgress');
        if (savedProgress) {
            this.feedCount = parseInt(savedProgress) || 0;
            console.log(`🍽️ 已喂食 ${this.feedCount} 次`);
            
            // 如果已经达到 5 次，升级宠物
            if (this.feedCount >= 5 && !this.petUpgraded) {
                this.upgradePet();
            }
        }
    }

    saveFeedProgress() {
        localStorage.setItem('feedProgress', this.feedCount.toString());
    }

    // 升级宠物！
    upgradePet() {
        if (this.petUpgraded) return;
        
        this.petUpgraded = true;
        const petImage = document.querySelector('.pet-image');
        if (!petImage) return;

        // 显示升级提示
        this.showHint('🎉 Amazing! Your pet is evolving!');
        
        // 添加闪烁动画
        petImage.classList.add('pet-upgrading');
        
        setTimeout(() => {
            // 根据不同宠物类型，显示不同的 GIF 或动画
            const petType = this.currentPet?.type || 'dinosaur';
            
            // 使用 Giphy 的免费 GIF API 或自定义 GIF
            const petGifs = {
                dinosaur: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzBkZWY4OGU5MWRiNzYwNjU0MzUyYzgyZjI0NzRiZTJmZGY3YzY5ZiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/l0HlHFRbmaZtBRhXG/giphy.gif',
                rabbit: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjI4YzkyYzg0OGQ3YzViN2Q3ZTczOTMxYzkyZTk3ZjQ3YWEzYzNhYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/3o7TKMt1VVNkHV2PaE/giphy.gif',
                turtle: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjE4YzNhMzQ0YmI5ZjA4ZDNiYzBhNzgzOGY1OGQ4NzE3MWY1YzQxYyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/oGO1MPNUVbbk4/giphy.gif',
                zebra: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGQxYjE3YzE3ZWY3ZTMxNWEzODJiMGE5YjUyZjY4ZjUzZjI3YzYxYSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/l0IylQoMkcbZUbtHW/giphy.gif',
                giraffe: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDJlNjE4YzIxZjY4ZTM1YmI2NzIzYjI1ZGVhNWRkODg2YzljZDQ4YiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/3o7TKQ8kAP0f9X5PoY/giphy.gif',
                lion: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzQ3YmY4YzI2NWE1YzY5MWY0YzNhZWY3ZjIzYjUwYmE1ZjI2N2ZiYyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/xUPGcuqhw1I2BA5eCY/giphy.gif',
                cat: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzE3ODk4N2Q0YzM3YzQ2ZTlhZWNhYjBhNWY4ZjM5NzE4NjE5YjY1YiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/JIX9t2j0ZTN9S/giphy.gif',
                tiger: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjE3NmZiODc0YzY3ZTI2YTI2NWM3ZGY5YzZiNjIzYzM2YzE4YmY0MSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/l0HlNQ03J5JxX6lva/giphy.gif'
            };
            
            const gifUrl = petGifs[petType] || petGifs.dinosaur;
            
            // 清空内容，替换为 GIF
            petImage.textContent = '';
            petImage.innerHTML = `<img src="${gifUrl}" alt="${this.currentPet?.name || 'Pet'} evolved!" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
            
            petImage.classList.remove('pet-upgrading');
            petImage.classList.add('pet-upgraded');
            
            // 显示升级成功提示
            this.showHint(`✨ ${this.currentPet?.name || 'Your pet'} has evolved! Keep learning to unlock more surprises! 🌟`);
            
            console.log('✅ 宠物升级完成！');
        }, 1500);
    }

    bindEvents() {
        // Speak to Feed 按钮
        const speakButton = document.querySelector('.speak-button');
        if (speakButton) {
            speakButton.addEventListener('click', () => this.handleSpeakToFeed());
        }

        // Progress 按钮
        const progressButton = document.querySelector('.progress-button');
        if (progressButton) {
            progressButton.addEventListener('click', () => this.showProgress());
        }

        // Back Home 按钮 - 改为登出功能
        const backButton = document.querySelector('.back-home-button');
        if (backButton) {
            backButton.querySelector('.button-text').textContent = 'Sign Out';
            backButton.addEventListener('click', () => this.handleSignOut());
        }

        // 宠物图片点击 - 朗读当前单词
        const petImage = document.querySelector('.pet-image');
        if (petImage) {
            petImage.addEventListener('click', () => this.speakCurrentWord());
        }
    }

    // 加载下一个单词
    async loadNextWord() {
        try {
            const result = await window.MagicPetAI.getNextWord(this.wordsLearned, 'easy');
            if (result.success) {
                this.currentWord = result.word;
                this.updateTitle(`Say "${this.currentWord}" to feed your pet!`);
                console.log('📖 新单词:', this.currentWord);
            }
        } catch (error) {
            console.error('加载单词失败:', error);
            this.currentWord = 'apple'; // 默认单词
        }
    }

    // 处理语音喂养
    async handleSpeakToFeed() {
        if (this.isListening) {
            return;
        }

        // 检查语音识别支持
        if (!window.MagicPetAI.isSpeechSupported()) {
            this.showHint('❌ Your browser doesn\'t support speech recognition. Please try Chrome or Edge.');
            return;
        }

        try {
            // 更新 UI
            this.updateButtonState(true);
            this.showHint('🎤 Listening... Say the word now!');

            // 开始语音识别
            const result = await window.MagicPetAI.startListening();

            if (result.success) {
                // 评估发音
                const evaluation = window.MagicPetAI.evaluatePronunciation(
                    result.text,
                    this.currentWord,
                    result.confidence
                );

                // 显示反馈
                this.showHint(evaluation.feedback);

                if (evaluation.isCorrect) {
                    // 正确！喂养宠物
                    await this.feedPet(evaluation.score);
                    
                    // 保存学习记录
                    this.wordsLearned.push(this.currentWord);
                    if (window.MagicPetAPI) {
                        await window.MagicPetAPI.Database.saveLearningRecord(
                            this.currentWord,
                            evaluation.score
                        );
                    }

                    // 延迟后加载新单词
                    setTimeout(() => {
                        this.loadNextWord();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('语音识别失败:', error);
            this.showHint('❌ Failed to recognize speech. Please try again!');
        } finally {
            this.updateButtonState(false);
        }
    }

    // 喂养宠物动画
    async feedPet(points) {
        this.score += points;
        
        // 增加喂食计数
        this.feedCount++;
        this.saveFeedProgress();
        
        console.log(`🍽️ 喂食计数: ${this.feedCount}/5`);
        
        // 宠物图片动画效果
        const petImage = document.querySelector('.pet-image');
        if (petImage) {
            petImage.style.transform = 'scale(1.1)';
            petImage.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                petImage.style.transform = 'scale(1)';
            }, 300);
        }

        // 检查是否达到 5 次喂食
        if (this.feedCount === 5 && !this.petUpgraded) {
            setTimeout(() => {
                this.upgradePet();
            }, 1000);
        }

        // 获取 AI 鼓励
        const advice = await window.MagicPetAI.getLearningAdvice(this.currentWord);
        if (advice.success) {
            setTimeout(() => {
                this.showHint(advice.advice);
            }, 1000);
        }
    }

    // 朗读当前单词
    async speakCurrentWord() {
        if (this.currentWord) {
            try {
                await window.MagicPetAI.speakWord(this.currentWord);
                console.log('🔊 朗读:', this.currentWord);
            } catch (error) {
                console.error('朗读失败:', error);
            }
        }
    }

    // 显示进度
    async showProgress() {
        try {
            // 检查用户是否已登录
            let isLoggedIn = false;
            let user = null;
            
            if (window.MagicPetAPI && window.MagicPetAPI.Auth) {
                user = await window.MagicPetAPI.Auth.getCurrentUser();
                isLoggedIn = !!user;
            }
            
            if (!isLoggedIn) {
                // 未登录：显示提示框
                const wantToSave = confirm(
                    '💾 想要保存您的学习进度吗？\n\n' +
                    '登录后可以：\n' +
                    '✅ 保存学习记录\n' +
                    '✅ 跨设备同步\n' +
                    '✅ 解锁更多奖励\n\n' +
                    '点击“确定”去登录，点击“取消”继续游客模式'
                );
                
                if (wantToSave) {
                    // 跳转到登录页
                    window.location.href = 'auth.html';
                    return;
                } else {
                    // 显示本地进度（仅当前会话）
                    alert(
                        `📊 您的本次学习进度：\n\n` +
                        `学习单词数：${this.wordsLearned.length}\n` +
                        `总分：${this.score}\n` +
                        `喂食次数：${this.feedCount}\n\n` +
                        `⚠️ 注意：未登录的进度不会保存，刷新页面将丢失。`
                    );
                }
                return;
            }
            
            // 已登录：显示数据库中的进度
            const result = await window.MagicPetAPI.Database.getProgress();
            if (result.success && result.data) {
                alert(
                    `📊 ${user.email} 的学习进度：\n\n` +
                    `学习单词数：${result.data.words_learned}\n` +
                    `总分：${result.data.total_score}\n\n` +
                    `继续加油！🌟`
                );
            } else {
                // 数据库查询失败，显示本地进度
                alert(
                    `📊 您的本次学习进度：\n\n` +
                    `学习单词数：${this.wordsLearned.length}\n` +
                    `总分：${this.score}\n\n` +
                    `继续加油！🌟`
                );
            }
        } catch (error) {
            console.error('获取进度失败:', error);
            alert('❌ 获取进度失败，请稍后重试。');
        }
    }

    // 用户登出
    async handleSignOut() {
        if (window.MagicPetAPI) {
            if (confirm('Sign out? Your progress has been saved.')) {
                const result = await window.MagicPetAPI.Auth.signOut();
                if (result.success) {
                    window.location.href = 'auth.html';
                }
            }
        } else {
            // 游客模式，直接重新加载
            if (confirm('Return to home?')) {
                location.reload();
            }
        }
    }

    // UI 更新辅助方法
    updateTitle(text) {
        const title = document.querySelector('.learning-title');
        if (title) {
            title.textContent = text;
        }
    }

    showHint(text) {
        const hint = document.querySelector('.hint-text');
        if (hint) {
            hint.textContent = text;
        }
    }

    updateButtonState(listening) {
        this.isListening = listening;
        const button = document.querySelector('.speak-button');
        const buttonText = document.querySelector('.speak-button .button-text');
        
        if (button && buttonText) {
            if (listening) {
                button.style.backgroundColor = '#FF6B6B';
                buttonText.textContent = '🎤 Listening...';
            } else {
                button.style.backgroundColor = '#FAFA1F';
                buttonText.textContent = 'Speak to Feed';
            }
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MagicPetApp();
});
