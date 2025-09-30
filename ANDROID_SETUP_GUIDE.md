# Android Development Setup Guide

## Step 1: Install Android Studio ✅

1. **Download Android Studio**
   - Go to: https://developer.android.com/studio
   - Click "Download Android Studio" (latest version)
   - Accept the terms and download

2. **Install Android Studio**
   - Open the downloaded DMG file
   - Drag Android Studio to your Applications folder
   - Open Android Studio from Applications

3. **Complete Setup Wizard**
   - Choose "Standard" installation type
   - Select your UI theme preference
   - The wizard will download and install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (AVD)
   
   **Important**: Note the Android SDK Location shown during setup (usually `/Users/YOUR_USERNAME/Library/Android/sdk`)

## Step 2: Configure Environment Variables

After Android Studio installation is complete, run these commands in Terminal:

```bash
# Add Android SDK to your shell configuration
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc
```

## Step 3: Verify Installation

Run these commands to verify everything is set up:

```bash
# Check Android SDK location
echo $ANDROID_HOME

# Check if adb is available
adb --version

# Check available Android platforms
sdkmanager --list
```

## Step 4: Additional Setup for React Native

1. **Open Android Studio** → **Preferences** (or **Settings** on PC)
2. Navigate to **Appearance & Behavior** → **System Settings** → **Android SDK**
3. Select the **SDK Platforms** tab
4. Check and install:
   - Android 14 (API 34) - or latest
   - Android 13 (API 33)
   
5. Select the **SDK Tools** tab
6. Check and install:
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools
   - Intel x86 Emulator Accelerator (HAXM) - for Intel Macs only

## Step 5: Create an Android Virtual Device (AVD)

1. In Android Studio, click **Tools** → **AVD Manager**
2. Click **Create Virtual Device**
3. Select a device (e.g., Pixel 6)
4. Select a system image (API 34 recommended)
5. Click **Finish**

## Step 6: Run Your App

Once everything is set up, you can run:

```bash
# In your project directory
npx expo run:android
```

Or if you want to use a physical device:
1. Enable Developer Mode on your Android device
2. Enable USB Debugging
3. Connect via USB
4. Run `adb devices` to verify connection
5. Run `npx expo run:android`

## Troubleshooting

- If `adb` is not found, make sure Android Studio installation is complete and you've reloaded your shell
- If build fails, try: `cd android && ./gradlew clean`
- For M1/M2 Macs, make sure to download the ARM64 system images in AVD Manager