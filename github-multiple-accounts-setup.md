GitHub 多账号 SSH 配置指南
1. 生成 SSH 密钥
为每个 GitHub 账号创建一个 SSH 密钥：

# 为第一个账号创建密钥
ssh-keygen -t ed25519 -C "your-first-email@example.com" -f ~/.ssh/id_ed25519_account1

# 为第二个账号创建密钥
ssh-keygen -t ed25519 -C "your-second-email@example.com" -f ~/.ssh/id_ed25519_account2

2. 配置 SSH
创建或编辑 SSH 配置文件：
vim ~/.ssh/config
添加以下配置：

# 第一个账号（默认）
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_account1

# 第二个账号
Host github-account2
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_account2

3. 添加 SSH 密钥到 SSH-Agent
# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加密钥
ssh-add ~/.ssh/id_ed25519_account1
ssh-add ~/.ssh/id_ed25519_account2

4. 添加公钥到 GitHub
（1）复制第一个账号的公钥：
cat ~/.ssh/id_ed25519_account1.pub
（2）复制第二个账号的公钥：
cat ~/.ssh/id_ed25519_account2.pub
（3）在各自的 GitHub 账号中添加公钥：
    登录 GitHub
    进入 Settings -> SSH and GPG keys
    点击 "New SSH key" 
    粘贴对应的公钥内容

5. 测试连接
# 测试第一个账号
ssh -T git@github.com
# 测试第二个账号
ssh -T git@github-account2

6. 配置仓库
克隆新仓库
# 第一个账号的仓库
git clone git@github.com:username1/repo.git
# 第二个账号的仓库
git clone git@github-account2:username2/repo.git

更新现有仓库的远程 URL
# 第一个账号的仓库
git remote set-url origin git@github.com:username1/repo.git
# 第二个账号的仓库
git remote set-url origin git@github-account2:username2/repo.git

7. 设置仓库的用户信息
全局配置（可选）
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

仓库特定配置
# 在仓库目录下执行
git config user.name "Your Name"
git config user.email "your-email@example.com"

8. 实用技巧
创建别名（可选）
在 ~/.bashrc 或 ~/.zshrc 中添加：
alias git-account1="git config user.name 'Account1 Name' && git config user.email 'email1@example.com'"
alias git-account2="git config user.name 'Account2 Name' && git config user.email 'email2@example.com'"

项目组织建议
为不同账号的项目创建不同的根目录：
~/projects/account1/
~/projects/account2/

常见问题排查
1.如果 SSH 密钥不工作：
ssh-add -l  # 检查已加载的密钥
ssh -vT git@github.com  # 测试连接并查看详细日志

2.如果遇到权限问题：
chmod 600 ~/.ssh/config
chmod 700 ~/.ssh

3.如果需要清除已保存的密钥：
ssh-add -D

注意事项
    1.确保 SSH 配置文件权限正确
    2.不同账号使用不同的 SSH 密钥
    3.在每个项目中验证 Git 配置
    4.定期备份 SSH 配置和密钥
    5.切换账号时记得更新对应的 Git 配置
    6.保持 SSH 密钥的安全性，不要分享私钥
    7.定期检查并更新 SSH 密钥


