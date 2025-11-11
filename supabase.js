// Supabase 配置文件
const SUPABASE_CONFIG = {
    // 替换为你的 Supabase 项目 URL
    url: 'YOUR_SUPABASE_URL',
    // 替换为你的 Supabase 公开密钥
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

// 初始化 Supabase 客户端
let supabase = null;

// 加载 Supabase SDK 并初始化
async function initSupabase() {
    // 动态加载 Supabase SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        console.log('Supabase 初始化成功');
    };
    document.head.appendChild(script);
}

// 用户认证相关功能
const Auth = {
    // 用户注册
    async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 用户登录
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 用户登出
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('登出失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取当前用户
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('获取用户失败:', error);
            return null;
        }
    }
};

// 数据库操作
const Database = {
    // 保存学习记录
    async saveLearningRecord(word, score) {
        try {
            const user = await Auth.getCurrentUser();
            if (!user) throw new Error('用户未登录');

            const { data, error } = await supabase
                .from('learning_records')
                .insert([
                    {
                        user_id: user.id,
                        word: word,
                        score: score,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('保存学习记录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取学习记录
    async getLearningRecords(limit = 10) {
        try {
            const user = await Auth.getCurrentUser();
            if (!user) throw new Error('用户未登录');

            const { data, error } = await supabase
                .from('learning_records')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('获取学习记录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取学习进度
    async getProgress() {
        try {
            const user = await Auth.getCurrentUser();
            if (!user) throw new Error('用户未登录');

            const { data, error } = await supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('获取进度失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 更新学习进度
    async updateProgress(wordsLearned, totalScore) {
        try {
            const user = await Auth.getCurrentUser();
            if (!user) throw new Error('用户未登录');

            const { data, error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    words_learned: wordsLearned,
                    total_score: totalScore,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('更新进度失败:', error);
            return { success: false, error: error.message };
        }
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});

// 导出 API
window.MagicPetAPI = {
    Auth,
    Database
};
