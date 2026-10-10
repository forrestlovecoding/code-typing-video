@echo off
chcp 65001 >nul
title 代码打字机 - 竖版视频生成器
cd /d "D:\codingvideo\codingvideo"

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js / npm，请先安装 Node.js 18 或更高版本
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 首次运行，正在安装依赖（约 1-2 分钟）...
  call npm install --registry=https://registry.npmmirror.com
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络后重新双击启动
    pause
    exit /b 1
  )
)

echo 正在启动：http://localhost:5188  （打字完成后浏览器自动打开，关闭本窗口即停止服务）
start "" cmd /c "timeout /t 2 >nul && start http://localhost:5188"
call npm run dev
