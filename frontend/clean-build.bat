@echo off
echo Clearing Gradle caches...
rmdir /s /q "%USERPROFILE%\.gradle\caches" 2>nul
rmdir /s /q "android\.gradle" 2>nul
rmdir /s /q "android\build" 2>nul
del /q android\local.properties 2>nul

echo Clearing npm/expo caches...
call npm cache clean --force
call npx expo prebuild --clean

echo Done. Now run: npm run android
