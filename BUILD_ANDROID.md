# Сборка Android APK через GitHub Actions

Проект настроен для автоматической сборки нативного Android-приложения (`.apk`) с помощью **Capacitor** и **GitHub Actions**.

## Как собрать APK на GitHub
1. Загрузите репозиторий на GitHub (`git push` в ветку `main` или `master`).
2. Откройте вкладку **Actions** в вашем репозитории GitHub.
3. Workflow **Build Android APK** запустится автоматически (или нажмите **Run workflow** вручную).
4. После завершения сборки скачайте готовый файл **`KnightChronicles-debug-apk`** из раздела **Artifacts** и установите `app-debug.apk` на Android-устройство.

## Подписанная Release-сборка (опционально)
Для сборки подписанного `app-release.apk` добавьте в **Settings → Secrets and variables → Actions** следующие секреты:
- `ANDROID_KEYSTORE_BASE64` — ваш `.jks` ключ в формате Base64
- `ANDROID_KEYSTORE_PASSWORD` — пароль хранилища ключей
- `ANDROID_KEY_ALIAS` — алиас ключа
- `ANDROID_KEY_PASSWORD` — пароль ключа

## Локальная сборка на ПК
```bash
npm install
npm run build
npm install --no-save @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
Готовый APK будет находиться в `android/app/build/outputs/apk/debug/app-debug.apk`.
