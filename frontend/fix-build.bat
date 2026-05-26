@echo off
setlocal enabledelayedexpansion

echo Removing old node_modules...
if exist node_modules rmdir /s /q node_modules

echo Cleaning npm cache...
call npm cache clean --force

echo Installing dependencies...
call npm install

echo Running Android build...
call npm run android

pause
