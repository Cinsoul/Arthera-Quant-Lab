#!/bin/bash

echo "🔍 GitHub提交前安全检查"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. 检查敏感文件是否在暂存区
echo -e "\n📁 检查敏感文件..."
SENSITIVE_FILES=(
    "ai_providers_config.json"
    ".env"
    "user_config.json"
    "config/ai_agents_config.json"
    "config/crypto_exchanges_config.json"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if git diff --cached --name-only | grep -q "^${file}$"; then
        echo -e "${RED}❌ 错误: 敏感文件在暂存区: ${file}${NC}"
        ((ERRORS++))
    fi
done

# 2. 搜索API密钥模式
echo -e "\n🔑 搜索API密钥模式..."
if git diff --cached | grep -E "sk-[a-zA-Z0-9]{20,}" | grep -v "YOUR_\|example\|placeholder"; then
    echo -e "${RED}❌ 错误: 发现可能的API密钥${NC}"
    ((ERRORS++))
fi

# 3. 检查日志文件
echo -e "\n📋 检查日志文件..."
if git diff --cached --name-only | grep -E "\.log$"; then
    echo -e "${RED}❌ 错误: 尝试提交日志文件${NC}"
    ((ERRORS++))
fi

# 4. 检查__pycache__
echo -e "\n🐍 检查Python缓存..."
if git diff --cached --name-only | grep "__pycache__"; then
    echo -e "${RED}❌ 错误: 尝试提交__pycache__${NC}"
    ((ERRORS++))
fi

# 5. 检查.DS_Store
echo -e "\n💻 检查macOS系统文件..."
if git diff --cached --name-only | grep ".DS_Store"; then
    echo -e "${YELLOW}⚠️  警告: 发现.DS_Store文件${NC}"
    ((WARNINGS++))
fi

# 6. 验证.gitignore
echo -e "\n📝 验证.gitignore..."
if ! grep -q "ai_providers_config.json" .gitignore; then
    echo -e "${RED}❌ 错误: .gitignore缺少ai_providers_config.json${NC}"
    ((ERRORS++))
fi

# 7. 检查大文件
echo -e "\n📦 检查大文件..."
while IFS= read -r file; do
    size=$(git cat-file -s ":0:$file" 2>/dev/null || echo 0)
    if [ "$size" -gt 5242880 ]; then  # 5MB
        echo -e "${YELLOW}⚠️  警告: 文件 ${file} 大于5MB ($(($size / 1048576))MB)${NC}"
        ((WARNINGS++))
    fi
done < <(git diff --cached --name-only)

# 总结
echo -e "\n================================"
echo -e "检查完成!"
echo -e "错误: ${RED}${ERRORS}${NC}"
echo -e "警告: ${YELLOW}${WARNINGS}${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}❌ 提交被阻止！请修复上述错误后再试。${NC}"
    echo -e "\n修复建议:"
    echo -e "  1. 从暂存区移除敏感文件: git reset HEAD <file>"
    echo -e "  2. 更新.gitignore: echo '<file>' >> .gitignore"
    echo -e "  3. 清除已提交的敏感信息: git filter-branch"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  发现警告，建议检查后再提交${NC}"
    exit 0
fi

echo -e "\n${GREEN}✅ 安全检查通过！可以提交。${NC}"
exit 0
