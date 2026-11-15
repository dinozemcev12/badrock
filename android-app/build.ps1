# Automated Android APK Build Script for Badrock Notes

$ErrorActionPreference = "Stop"

$SdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$BuildTools = "$SdkDir\build-tools\35.0.0"
$AndroidJar = "$SdkDir\platforms\android-35\android.jar"
$Keytool = "C:\Program Files\Java\jdk-25.0.2\bin\keytool.exe"

$Aapt2 = "$BuildTools\aapt2.exe"
$D8 = "$BuildTools\d8.bat"
$Zipalign = "$BuildTools\zipalign.exe"
$Apksigner = "$BuildTools\apksigner.bat"

Write-Host "========================================"
Write-Host "  Сборка APK Badrock Notes для Android"
Write-Host "========================================"

$Root = $PSScriptRoot
Set-Location $Root

# 1. Clean / create build directories
$BuildDir = Join-Path $Root "build"
$CompiledRes = Join-Path $BuildDir "compiled_res"
$GenDir = Join-Path $BuildDir "gen"
$ClassesDir = Join-Path $BuildDir "classes"
$DexDir = Join-Path $BuildDir "dex"
$ApkDir = Join-Path $BuildDir "apk"

if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Path $CompiledRes -Force | Out-Null
New-Item -ItemType Directory -Path $GenDir -Force | Out-Null
New-Item -ItemType Directory -Path $ClassesDir -Force | Out-Null
New-Item -ItemType Directory -Path $DexDir -Force | Out-Null
New-Item -ItemType Directory -Path $ApkDir -Force | Out-Null

# 2. Sync public assets into assets/public
Write-Host "1. Подготовка веб-ассетов..."
$AssetsDir = Join-Path $Root "assets\public"
if (!(Test-Path $AssetsDir)) { New-Item -ItemType Directory -Path $AssetsDir -Force | Out-Null }
Copy-Item "$Root\..\public\*" -Destination $AssetsDir -Recurse -Force

# 3. Compile Android resources with aapt2
Write-Host "2. Компиляция ресурсов (aapt2)..."
& $Aapt2 compile --dir "$Root\res" -o "$CompiledRes\resources.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed with exit code $LASTEXITCODE" }

# 4. Link resources and generate R.java
Write-Host "3. Линковка манифеста и ресурсов (aapt2 link)..."
$UnsignedApk = "$ApkDir\app-unsigned.apk"
& $Aapt2 link -I $AndroidJar `
    --manifest "$Root\AndroidManifest.xml" `
    --java $GenDir `
    -o $UnsignedApk `
    "$CompiledRes\resources.zip" `
    -A "$Root\assets"
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed with exit code $LASTEXITCODE" }

# 5. Compile Java source files
Write-Host "4. Компиляция исходных файлов Java..."
$JavaFiles = Get-ChildItem "$Root\src\com\badrock\notes\*.java", "$GenDir\com\badrock\notes\*.java" | Select-Object -ExpandProperty FullName
& javac --release 17 -cp $AndroidJar -d $ClassesDir $JavaFiles
if ($LASTEXITCODE -ne 0) { throw "javac failed with exit code $LASTEXITCODE" }

# 5. Convert bytecode to Dalvik Executable (classes.dex)
Write-Host "5. Создание classes.dex (d8)..."
$ClassFiles = Get-ChildItem "$ClassesDir\com\badrock\notes\*.class" | Select-Object -ExpandProperty FullName
& $D8 --lib $AndroidJar --output $DexDir $ClassFiles
if ($LASTEXITCODE -ne 0) { throw "d8 failed with exit code $LASTEXITCODE" }

# 6. Add classes.dex into app-unsigned.apk
Write-Host "6. Добавление classes.dex в APK..."
$Aapt = "$BuildTools\aapt.exe"
Push-Location $DexDir
& $Aapt add $UnsignedApk "classes.dex"
$addExit = $LASTEXITCODE
Pop-Location
if ($addExit -ne 0) { throw "aapt add classes.dex failed with exit code $addExit" }

# 8. Align APK with zipalign
Write-Host "7. Оптимизация APK (zipalign)..."
$AlignedApk = "$ApkDir\app-aligned.apk"
& $Zipalign -p -f 4 $UnsignedApk $AlignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed with exit code $LASTEXITCODE" }

# 9. Generate debug keystore if missing
$Keystore = "$BuildDir\debug.keystore"
if (!(Test-Path $Keystore)) {
    Write-Host "8. Создание ключа подписи (debug keystore)..."
    & $Keytool -genkeypair -v -keystore $Keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Badrock Debug,O=Badrock,C=US"
}

# 10. Sign APK with apksigner
Write-Host "9. Подпись APK (apksigner)..."
$FinalApk = Join-Path $Root "Badrock.apk"
& $Apksigner sign --ks $Keystore --ks-pass pass:android --out $FinalApk $AlignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed with exit code $LASTEXITCODE" }

# 11. Copy to Badrock-App folder for user convenience
$DistDir = "$Root\..\Badrock-App"
if (Test-Path $DistDir) {
    Copy-Item $FinalApk -Destination "$DistDir\Badrock.apk" -Force
}

$ApkSize = (Get-Item $FinalApk).Length / 1MB
Write-Host ""
Write-Host "========================================"
Write-Host "  УСПЕХ! APK успешно собран:"
Write-Host "  -> $FinalApk"
Write-Host "  Размер: $([Math]::Round($ApkSize, 2)) МБ"
Write-Host "========================================"
