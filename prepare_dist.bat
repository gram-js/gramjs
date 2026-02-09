@echo off
REM — Включаем показ выполняемых команд (удалите, если не нужно)
REM echo on

echo 🔨 Starting build...

call tsc
if errorlevel 1 (
  echo ❌ Ошибка компиляции TypeScript!
  pause
  exit /b 1
)

echo 🔄 Копирование package.json, README.md, LICENSE...
call xcopy /Y package.json dist\
call xcopy /Y README.md   dist\
call xcopy /Y LICENSE     dist\

echo 🔧 Создаём папку dist\tl\static (если её нет)...
if not exist dist\tl\static (
  call mkdir dist\tl\static
)

echo 📦 Копируем gramjs файлы...
call xcopy /Y gramjs\tl\static\api.tl     dist\tl\static\
call xcopy /Y gramjs\tl\static\schema.tl  dist\tl\static\
call xcopy /Y gramjs\tl\api.d.ts          dist\tl\
call xcopy /Y gramjs\define.d.ts          dist\

echo.
echo ✔ Build completed.
pause
