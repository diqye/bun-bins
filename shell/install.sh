#!/bin/sh

set -e

BIN_NAME="jx2jy"
URL="https://static.zmexing.com/FE/bun/simple/jx2jy"
INSTALL_PATH="/usr/local/bin/$BIN_NAME"
TMP_PATH="/tmp/$BIN_NAME"

echo "📥 下载 $BIN_NAME ..."
curl -fsSL "$URL" -o "$TMP_PATH"

echo "🔐 检查是否需要清除 macOS 限制（xattr）..."
if command -v xattr >/dev/null 2>&1; then
  if xattr "$TMP_PATH" | grep -q "com.apple.quarantine"; then
    echo "⚠️ 清除 com.apple.quarantine 标志..."
    xattr -d com.apple.quarantine "$TMP_PATH"
  fi
fi

echo "🚚 移动到 /usr/local/bin..."
sudo mv "$TMP_PATH" "$INSTALL_PATH"

echo "🔧 添加执行权限..."
sudo chmod +x "$INSTALL_PATH"

echo "✅ 安装完成：$INSTALL_PATH"
$INSTALL_PATH
# echo "👉 你可以通过运行 '$BIN_NAME' 来使用它"
