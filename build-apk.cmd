@echo off
echo ================================================
echo   Pizza Chain - Android APK Builder
echo ================================================
echo.

SET JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot
SET ANDROID_HOME=C:\Android
SET PATH=%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools
SET NODE="C:\Program Files\nodejs\node.exe"

echo [1/4] Web app build qilinmoqda...
cd /d "C:\mobilniy ofic\web"
%NODE% "..\node_modules\vite\bin\vite.js" build
if %ERRORLEVEL% neq 0 ( echo XATO: Web build muvaffaqiyatsiz & pause & exit /b 1 )

echo.
echo [2/4] Capacitor sync...
".\node_modules\.bin\cap.cmd" sync android
if %ERRORLEVEL% neq 0 ( echo XATO: Capacitor sync muvaffaqiyatsiz & pause & exit /b 1 )

echo.
echo [3/4] APK qurilmoqda...
cd android
call gradlew.bat assembleDebug --no-daemon -x lint
if %ERRORLEVEL% neq 0 ( echo XATO: Gradle build muvaffaqiyatsiz & pause & exit /b 1 )

echo.
echo [4/4] APK nusxalanmoqda...
cd /d "C:\mobilniy ofic"
copy /Y "web\android\app\build\outputs\apk\debug\app-debug.apk" "pizza-chain.apk"

echo.
echo ================================================
echo   TAYYOR! APK fayl:
echo   C:\mobilniy ofic\pizza-chain.apk
echo ================================================
echo.
echo Telefonga o'tkazing va o'rnating.
pause
